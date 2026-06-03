import { NextRequest, NextResponse } from 'next/server'
import { getTransactionDetail } from '@/lib/midtrans'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Reference is required' },
        { status: 400 }
      )
    }

    const detail: Record<string, any> = await getTransactionDetail(reference)

    // Midtrans status API doesn't return QR URL or actions after initial charge.
    // Read stored payment details (qr_url, pay_code) from the database.
    if (detail && detail.merchant_ref) {
      const supabase = await createClient()

      // Look up order by payment_reference or order_number
      let order = null
      const { data: orderByRef } = await supabase
        .from('orders')
        .select('id, status, payment_url, order_number')
        .eq('payment_reference', reference)
        .maybeSingle()

      order = orderByRef

      if (!order) {
        // Try looking up by order_number (merchant_ref might have suffix)
        const originalOrderNumber = detail.merchant_ref.includes('_')
          ? detail.merchant_ref.split('_')[0]
          : detail.merchant_ref

        const { data: orderByNum } = await supabase
          .from('orders')
          .select('id, status, payment_url, order_number')
          .eq('order_number', originalOrderNumber)
          .maybeSingle()

        order = orderByNum
      }

      if (order) {
        // Merge stored payment details (qr_url, pay_code) into response
        if (order.payment_url) {
          try {
            const storedDetails = JSON.parse(order.payment_url)
            if (storedDetails.qr_url && !detail.qr_url) {
              detail.qr_url = storedDetails.qr_url
            }
            if (storedDetails.pay_code && !detail.pay_code) {
              detail.pay_code = storedDetails.pay_code
            }
            if (storedDetails.pay_url) {
              detail.pay_url = storedDetails.pay_url
            }
          } catch {
            // payment_url is not JSON, ignore
          }
        }

        // Sync payment status
        const paymentStatus = detail.status
        let orderStatus: string | null = null

        if (paymentStatus === 'PAID') orderStatus = 'paid'
        else if (paymentStatus === 'EXPIRED') orderStatus = 'cancelled'
        else if (paymentStatus === 'FAILED') orderStatus = 'cancelled'

        if (orderStatus && order.status === 'pending_payment') {
          await supabase
            .from('orders')
            .update({
              status: orderStatus,
              paid_at: paymentStatus === 'PAID' ? new Date().toISOString() : null,
            })
            .eq('id', order.id)
        }
      }
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    console.error('Payment detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get transaction detail' },
      { status: 500 }
    )
  }
}
