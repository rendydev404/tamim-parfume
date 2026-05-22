import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We use the Service Role Key here because webhooks are unauthenticated system callbacks.
// This allows the server to update the database status securely without user session cookies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Biteship Webhook Received]:', JSON.stringify(body, null, 2))

    // 1. Initialize Supabase Admin Client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Biteship Webhook] Error: Supabase credentials missing in environment')
      return NextResponse.json({ error: 'System configuration error' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Extract Event Properties
    // Biteship sends webhook events with either order.status or tracking.status
    const event = body.event || ''
    const status = body.status || ''
    const biteshipOrderId = body.order_id || ''
    const referenceId = body.reference_id || '' // Matches order_number from our booking payload
    const trackingNumber = body.courier?.tracking_number || body.courier_tracking_id || ''

    if (!referenceId && !trackingNumber && !biteshipOrderId) {
      return NextResponse.json({ error: 'Missing identifier fields' }, { status: 400 })
    }

    // 3. Find the Order in Supabase
    let query = supabase.from('orders').select('*')
    if (referenceId) {
      query = query.eq('order_number', referenceId)
    } else if (trackingNumber) {
      query = query.eq('shipping_tracking', trackingNumber)
    }

    const { data: order, error: findError } = await query.maybeSingle()

    if (findError) {
      console.error('[Biteship Webhook] Database query error:', findError)
      return NextResponse.json({ error: 'Database error finding order' }, { status: 500 })
    }

    if (!order) {
      console.warn(`[Biteship Webhook] No matching order found for referenceId: ${referenceId}, tracking: ${trackingNumber}`)
      // Return 200 so Biteship doesn't keep retrying a request for a deleted/non-existent order
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 200 })
    }

    const oldStatus = order.status
    let newStatus = oldStatus

    // 4. Map Biteship courier/tracking statuses to our internal order status
    // Biteship statuses: 'allocated', 'picking_up', 'picked_up', 'dropping_off', 'dropped_off', 'delivering', 'delivered', 'returned', 'cancelled', 'rejected'
    if (['picked_up', 'dropping_off', 'dropped_off', 'delivering'].includes(status)) {
      newStatus = 'shipped'
    } else if (status === 'delivered') {
      newStatus = 'delivered'
    } else if (status === 'cancelled' || status === 'rejected') {
      newStatus = 'cancelled'
    }

    console.log(`[Biteship Webhook] Order #${order.order_number} maps Biteship status "${status}" to internal status "${newStatus}"`)

    // 5. Update status and process side effects if state has changed
    if (newStatus !== oldStatus) {
      const updates: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Handle specific status timestamps
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString()
      } else if (newStatus === 'cancelled' && !order.cancelled_at) {
        updates.cancelled_at = new Date().toISOString()
        updates.cancel_reason = 'Dibatalkan otomatis via kurir'
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id)

      if (updateError) {
        console.error('[Biteship Webhook] Failed to update order status:', updateError)
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
      }

      // 6. Handle stock & sales volume side effects for delivered/cancelled
      // Delivered: Increase products sold count
      if (newStatus === 'delivered' && oldStatus !== 'delivered') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', order.id)

        if (orderItems) {
          for (const item of orderItems) {
            if (!item.product_id) continue
            try {
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
            } catch (pErr) {
              console.error(`[Biteship Webhook] Failed to update sold count for product: ${item.product_id}`, pErr)
            }
          }
        }
      }

      // Cancelled: Restore stock levels
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, variant_id, quantity')
          .eq('order_id', order.id)

        if (orderItems) {
          for (const item of orderItems) {
            try {
              if (item.variant_id) {
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
            } catch (stockErr) {
              console.error(`[Biteship Webhook] Failed to restore stock for order: ${order.id}`, stockErr)
            }
          }
        }
      }

      console.log(`[Biteship Webhook] Successfully transitioned Order #${order.order_number} to "${newStatus}"`)
    } else {
      console.log(`[Biteship Webhook] No status transition required for Order #${order.order_number}. Current: "${oldStatus}"`)
    }

    return NextResponse.json({
      success: true,
      message: 'Status processed successfully',
      transition: {
        from: oldStatus,
        to: newStatus
      }
    })

  } catch (error: any) {
    console.error('[Biteship Webhook Processing Error]:', error)
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 })
  }
}
