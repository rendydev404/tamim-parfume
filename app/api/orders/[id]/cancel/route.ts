import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Cancel an order (user or admin)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Get the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  // Check ownership (unless admin)
  if (!isAdmin && order.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only allow cancellation for certain statuses
  const cancellableStatuses = ['pending_payment', 'paid', 'processing']
  if (!cancellableStatuses.includes(order.status)) {
    return NextResponse.json({
      error: `Pesanan dengan status "${order.status}" tidak dapat dibatalkan`
    }, { status: 400 })
  }

  // For non-admin users, can only cancel pending_payment or paid orders
  if (!isAdmin && !['pending_payment', 'paid'].includes(order.status)) {
    return NextResponse.json({
      error: 'Anda hanya dapat membatalkan pesanan yang belum diproses. Hubungi admin untuk membatalkan pesanan yang sudah diproses.'
    }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const reason = body.reason || null

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Restore coupon usage if a coupon was applied
  const { data: orderCoupon } = await supabase
    .from('order_coupons')
    .select('coupon_id')
    .eq('order_id', id)
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

  // Restore product/variant stock
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity')
    .eq('order_id', id)

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

  return NextResponse.json({
    success: true,
    message: 'Pesanan berhasil dibatalkan',
  })
}
