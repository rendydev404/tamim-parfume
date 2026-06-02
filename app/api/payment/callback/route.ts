import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCallbackSignature } from '@/lib/midtrans'
import { autoBookBiteshipShipment } from '@/lib/biteship'

export async function POST(request: Request) {
  try {
    let orderId = ''
    let statusCode = ''
    let grossAmount = ''
    let signatureKey = ''
    let transactionStatus = ''

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text()
      const params = new URLSearchParams(text)
      orderId = params.get('order_id') || params.get('merchantOrderId') || ''
      statusCode = params.get('status_code') || ''
      grossAmount = params.get('gross_amount') || params.get('amount') || ''
      signatureKey = params.get('signature_key') || params.get('signature') || ''
      transactionStatus = params.get('transaction_status') || ''

      // Support Duitku-format form submissions (mock simulator)
      if (!transactionStatus && params.get('resultCode')) {
        const resultCode = params.get('resultCode') || ''
        if (resultCode === '00') transactionStatus = 'settlement'
        else transactionStatus = 'pending'
        statusCode = statusCode || '200'
        grossAmount = grossAmount || params.get('amount') || ''
      }
    } else {
      // JSON (standard Midtrans notification)
      try {
        const json = await request.json()
        orderId = json.order_id || json.merchantOrderId || ''
        statusCode = json.status_code || ''
        grossAmount = String(json.gross_amount || json.amount || '')
        signatureKey = json.signature_key || json.signature || ''
        transactionStatus = json.transaction_status || ''

        // Map Duitku-style fields if present (for backwards compatibility)
        if (!transactionStatus && json.resultCode) {
          if (json.resultCode === '00') transactionStatus = 'settlement'
          else transactionStatus = 'pending'
          statusCode = statusCode || '200'
        }
      } catch (e) {
        console.log('Empty or invalid request received')
        return new Response('OK', { status: 200 })
      }
    }

    if (!orderId || !grossAmount || !signatureKey) {
      return new Response('Invalid parameters', { status: 400 })
    }

    // Verify Midtrans signature key
    const isSignatureValid = await verifyCallbackSignature(
      orderId,
      statusCode,
      grossAmount,
      signatureKey
    )

    if (!isSignatureValid) {
      console.error('Invalid signature for order:', orderId)
      return new Response('Invalid signature', { status: 401 })
    }

    // Map Midtrans transaction status to generic status
    let status = 'UNPAID'
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      status = 'PAID'
    } else if (transactionStatus === 'expire') {
      status = 'EXPIRED'
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
      status = 'FAILED'
    } else if (transactionStatus === 'pending') {
      status = 'UNPAID'
    }

    const merchant_ref = orderId
    const supabase = await createClient()

    let orderStatus = 'pending_payment'
    if (status === 'PAID') orderStatus = 'paid'
    else if (status === 'FAILED' || status === 'EXPIRED') orderStatus = 'cancelled'

    const updates: Record<string, unknown> = {
      status: orderStatus,
      paid_at: status === 'PAID' ? new Date().toISOString() : null,
    }

    if (orderStatus === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
      updates.cancel_reason = 'Pembayaran gagal/kedaluwarsa'
    }

    // Get the order first to check current status.
    // We look up by payment_reference first, then fall back to order_number.
    let order = null
    const { data: orderRef } = await supabase
      .from('orders')
      .select('id, status')
      .eq('payment_reference', orderId)
      .maybeSingle()
    
    order = orderRef

    if (!order) {
      const originalOrderNumber = orderId.includes('_')
        ? orderId.split('_')[0]
        : orderId

      const { data: orderNum } = await supabase
        .from('orders')
        .select('id, status')
        .eq('order_number', originalOrderNumber)
        .maybeSingle()
      
      order = orderNum
    }

    if (!order) {
      const dummyIds = ['YOUR_ORDER_ID', 'order-12345', 'test-transaction-123']
      if (
        dummyIds.includes(orderId) ||
        orderId.toLowerCase().includes('test') ||
        orderId.startsWith('MOCK-')
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

    // Midtrans expects HTTP 200 response
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  } catch (error) {
    console.error('Payment callback error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
