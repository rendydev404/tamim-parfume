import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Auto-cancel unpaid orders older than 24 hours
// Call this via cron job or manually: GET /api/orders/auto-cancel
export async function GET(request: Request) {
  // Verify cron secret (optional, for security)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Find orders with pending_payment status older than 24 hours
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - 24)

  const { data: expiredOrders, error } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoffDate.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let cancelledCount = 0

  for (const order of expiredOrders || []) {
    // Cancel the order
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'Otomatis dibatalkan: pembayaran melewati batas waktu 24 jam',
      })
      .eq('id', order.id)

    if (!updateError) {
      cancelledCount++

      // Restore coupon usage
      const { data: orderCoupon } = await supabase
        .from('order_coupons')
        .select('coupon_id')
        .eq('order_id', order.id)
        .single()

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

      // Restore product stock
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id)

      if (orderItems) {
        for (const item of orderItems) {
          if (item.product_id) {
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
    }
  }

  return NextResponse.json({
    success: true,
    message: `${cancelledCount} pesanan dibatalkan otomatis`,
    cancelled: cancelledCount,
    total_expired: expiredOrders?.length || 0,
  })
}
