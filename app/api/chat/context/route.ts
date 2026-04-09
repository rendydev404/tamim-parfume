import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET chat context: active orders + cart-relevant data for smart suggestions
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch active orders (not delivered/cancelled/refunded)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, shipping_courier, shipping_service, shipping_tracking, items:order_items(id, product_name, product_image, quantity, price, subtotal)')
    .eq('user_id', user.id)
    .in('status', ['pending_payment', 'paid', 'processing', 'shipped'])
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    data: {
      active_orders: orders || [],
    }
  })
}
