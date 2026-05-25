import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCallbackSignature } from '@/lib/midtrans'
import { autoBookBiteshipShipment } from '@/lib/biteship'

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch (e) {
      console.log('Empty or invalid JSON body received, returning ping success')
      return NextResponse.json({ success: true, message: 'Ping successful' })
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body

    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 })
    }

    // Verify signature key
    const isSignatureValid = await verifyCallbackSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    )

    if (!isSignatureValid) {
      console.error('Invalid signature key for order:', order_id)
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 })
    }

    // Map Midtrans status to generic status
    let status = 'UNPAID'
    if (transaction_status === 'settlement' || (transaction_status === 'capture' && fraud_status === 'accept')) {
      status = 'PAID'
    } else if (transaction_status === 'expire') {
      status = 'EXPIRED'
    } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
      status = 'FAILED'
    }

    const merchant_ref = order_id

    const supabase = await createClient()

    let orderStatus = 'pending_payment'
    if (status === 'PAID') orderStatus = 'paid'
    else if (status === 'EXPIRED') orderStatus = 'cancelled'
    else if (status === 'FAILED') orderStatus = 'cancelled'

    const updates: Record<string, unknown> = {
      status: orderStatus,
      paid_at: status === 'PAID' ? new Date().toISOString() : null,
    }

    // Add cancellation details for expired/failed payments
    if (orderStatus === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancel_reason = status === 'EXPIRED'
        ? 'Pembayaran kedaluwarsa'
        : 'Pembayaran gagal'
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
        dummyIds.includes(order_id) ||
        order_id.toLowerCase().includes('test') ||
        order_id.startsWith('MOCK-')
      ) {
        return NextResponse.json({ success: true, message: 'Test notification received successfully' })
      }
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    // Don't process if order is already in a final state
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return NextResponse.json({ success: true, message: 'Order already in final state' })
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)

    if (error) {
      console.error('Callback update error:', error)
      return NextResponse.json({ success: false }, { status: 500 })
    }

    // Trigger automatic Biteship courier booking if status is now 'paid'
    if (orderStatus === 'paid') {
      try {
        console.log(`[Midtrans Callback] 🚀 Automating courier booking for order: ${order.id}`)
        const bookingRes = await autoBookBiteshipShipment(order.id, supabase)
        if (bookingRes.success) {
          console.log(`[Midtrans Callback] ✅ Courier booked successfully! Resi: ${bookingRes.trackingNumber}`)
        } else {
          console.error(`[Midtrans Callback] ❌ Courier booking failed: ${bookingRes.error}`)
        }
      } catch (bookErr) {
        console.error('[Midtrans Callback] 💥 Error in autoBookBiteshipShipment:', bookErr)
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
