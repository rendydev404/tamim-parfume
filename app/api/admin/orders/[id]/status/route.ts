import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT: Update order status with stock management
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { status: newStatus, tracking } = body

  if (!newStatus) {
    return NextResponse.json({ error: 'Status wajib diisi' }, { status: 400 })
  }

  // Get current order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  const oldStatus = order.status

  // Prevent invalid transitions
  if (oldStatus === newStatus) {
    return NextResponse.json({ error: 'Status sudah sama' }, { status: 400 })
  }

  if (oldStatus === 'delivered' || oldStatus === 'cancelled') {
    return NextResponse.json({
      error: `Pesanan dengan status "${oldStatus}" tidak dapat diubah`
    }, { status: 400 })
  }

  // Prepare update
  const updates: Record<string, unknown> = { status: newStatus }

  // Handle paid_at timestamp
  if (newStatus === 'paid' && !order.paid_at) {
    updates.paid_at = new Date().toISOString()
  }

  // Handle shipping tracking
  if (newStatus === 'shipped' && tracking) {
    updates.shipping_tracking = tracking
  }

  // Handle cancellation
  if (newStatus === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
    updates.cancel_reason = body.reason || 'Dibatalkan oleh admin'
  }

  // Update order
  const { error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Get order items for stock management
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity')
    .eq('order_id', id)

  // ============================================================
  // STOCK MANAGEMENT LOGIC
  // ============================================================

  // CASE 1: Cancellation → restore stock (if stock was deducted)
  // Stock is deducted at checkout, so always restore on cancel
  if (newStatus === 'cancelled') {
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
      .eq('order_id', id)
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

  // CASE 2: Delivered → increment sold_count and set delivered_at
  if (newStatus === 'delivered') {
    updates.delivered_at = new Date().toISOString()
    await supabase.from('orders').update({ delivered_at: updates.delivered_at }).eq('id', id)

    if (orderItems) {
      for (const item of orderItems) {
        if (!item.product_id) continue
        const { data: product } = await supabase
          .from('products')
          .select('sold_count')
          .eq('id', item.product_id)
          .single()
        if (product) {
          await supabase
            .from('products')
            .update({ sold_count: (product.sold_count || 0) + item.quantity })
            .eq('id', item.product_id)
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Status pesanan diubah ke ${newStatus}`,
    old_status: oldStatus,
    new_status: newStatus,
  })
}
