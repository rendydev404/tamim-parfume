import { NextRequest, NextResponse } from 'next/server'
import { getTransactionDetail } from '@/lib/duitku'
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

    const detail = await getTransactionDetail(reference)

    // Sync payment status to database when Midtrans reports PAID/EXPIRED/FAILED
    if (detail && detail.merchant_ref) {
      const paymentStatus = detail.status
      let orderStatus: string | null = null

      if (paymentStatus === 'PAID') orderStatus = 'paid'
      else if (paymentStatus === 'EXPIRED') orderStatus = 'cancelled'
      else if (paymentStatus === 'FAILED') orderStatus = 'cancelled'

      if (orderStatus) {
        const supabase = await createClient()
        
        // Check current order status to avoid unnecessary updates
        const { data: order } = await supabase
          .from('orders')
          .select('id, status')
          .eq('order_number', detail.merchant_ref)
          .single()

        if (order && order.status === 'pending_payment') {
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
