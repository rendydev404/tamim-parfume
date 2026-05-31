import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCallbackSignature } from '@/lib/duitku'
import { autoBookBiteshipShipment } from '@/lib/biteship'

export async function POST(request: Request) {
  try {
    let merchantCode = ''
    let amount = ''
    let merchantOrderId = ''
    let signature = ''
    let resultCode = ''
    let reference = ''
    let paymentCode = ''

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      const params = new URLSearchParams(text)
      merchantCode = params.get('merchantCode') || ''
      amount = params.get('amount') || ''
      merchantOrderId = params.get('merchantOrderId') || ''
      signature = params.get('signature') || ''
      resultCode = params.get('resultCode') || ''
      reference = params.get('reference') || ''
      paymentCode = params.get('paymentCode') || ''
    } else {
      // JSON fallback (such as ping or custom JSON testing)
      try {
        const json = await request.json()
        merchantCode = json.merchantCode || ''
        amount = String(json.amount || '')
        merchantOrderId = json.merchantOrderId || json.order_id || ''
        signature = json.signature || json.signature_key || ''
        resultCode = json.resultCode || ''
        reference = json.reference || ''
        paymentCode = json.paymentCode || ''

        // Map Midtrans fields if sent from old client simulation
        if (!resultCode && json.transaction_status) {
          if (json.transaction_status === 'settlement' || json.transaction_status === 'capture') {
            resultCode = '00'
          } else {
            resultCode = '01'
          }
        }
        if (!amount && json.gross_amount) {
          amount = String(json.gross_amount)
        }
      } catch (e) {
        console.log('Empty or invalid request received')
        return new Response('OK', { status: 200 })
      }
    }

    if (!merchantOrderId || !amount || !signature || !resultCode) {
      return new Response('Invalid parameters', { status: 400 })
    }

    // Verify signature key
    const isSignatureValid = await verifyCallbackSignature(
      merchantOrderId,
      amount,
      signature
    )

    if (!isSignatureValid) {
      console.error('Invalid signature for order:', merchantOrderId)
      return new Response('Invalid signature', { status: 401 })
    }

    // Map Duitku status code to generic status
    let status = 'UNPAID'
    if (resultCode === '00') {
      status = 'PAID'
    } else if (resultCode === '01') {
      status = 'UNPAID'
    } else {
      status = 'FAILED'
    }

    const merchant_ref = merchantOrderId
    const supabase = await createClient()

    let orderStatus = 'pending_payment'
    if (status === 'PAID') orderStatus = 'paid'
    else if (status === 'FAILED') orderStatus = 'cancelled'

    const updates: Record<string, unknown> = {
      status: orderStatus,
      paid_at: status === 'PAID' ? new Date().toISOString() : null,
    }

    if (orderStatus === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancel_reason = 'Pembayaran gagal/kedaluwarsa'
    }

    // Get the order first to check current status
    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_number', merchant_ref)
      .single()

    if (!order) {
      const dummyIds = ['YOUR_ORDER_ID', 'order-12345', 'test-transaction-123']
      if (
        dummyIds.includes(merchantOrderId) ||
        merchantOrderId.toLowerCase().includes('test') ||
        merchantOrderId.startsWith('MOCK-')
      ) {
        return new Response('OK', { status: 200 })
      }
      return new Response('Order not found', { status: 404 })
    }

    // Don't process if order is already in a final state
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return new Response('OK', { status: 200 })
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)

    if (error) {
      console.error('Callback update error:', error)
      return new Response('Database update error', { status: 500 })
    }

    // Trigger automatic Biteship courier booking if status is now 'paid'
    if (orderStatus === 'paid') {
      try {
        console.log(`[Duitku Callback] 🚀 Automating courier booking for order: ${order.id}`)
        const bookingRes = await autoBookBiteshipShipment(order.id, supabase)
        if (bookingRes.success) {
          console.log(`[Duitku Callback] ✅ Courier booked successfully! Resi: ${bookingRes.trackingNumber}`)
        } else {
          console.error(`[Duitku Callback] ❌ Courier booking failed: ${bookingRes.error}`)
        }
      } catch (bookErr) {
        console.error('[Duitku Callback] 💥 Error in autoBookBiteshipShipment:', bookErr)
      }
    }

    // Restore stock on payment expiry/failure (cancellation)
    if (orderStatus === 'cancelled') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, variant_id, quantity')
        .eq('order_id', order.id)

      if (orderItems) {
        for (const item of orderItems) {
          if (item.variant_id) {
            // Restore variant stock
            const { data: variant } = await supabase
              .from('product_variants')
              .select('stock')
              .eq('id', item.variant_id)
              .single()

            if (variant) {
              await supabase
                .from('product_variants')
                .update({ stock: variant.stock + item.quantity })
                .eq('id', item.variant_id)
            }
          } else if (item.product_id) {
            // Restore product stock
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single()

            if (product) {
              await supabase
                .from('products')
                .update({ stock: product.stock + item.quantity })
                .eq('id', item.product_id)
            }
          }
        }
      }

      // Restore coupon usage
      const { data: orderCoupon } = await supabase
        .from('order_coupons')
        .select('coupon_id')
        .eq('order_id', order.id)
        .maybeSingle()

      if (orderCoupon) {
        const { data: couponData } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', orderCoupon.coupon_id)
          .single()

        if (couponData && couponData.used_count > 0) {
          await supabase
            .from('coupons')
            .update({ used_count: couponData.used_count - 1 })
            .eq('id', orderCoupon.coupon_id)
        }
      }
    }

    // Duitku expects raw "OK" response
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('Payment callback error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
