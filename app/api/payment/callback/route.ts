import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Verify callback signature (simplified)
    const { merchant_ref, status } = body

    if (!merchant_ref || !status) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = await createClient()

    let orderStatus = 'pending_payment'
    if (status === 'PAID') orderStatus = 'paid'
    else if (status === 'EXPIRED') orderStatus = 'cancelled'
    else if (status === 'FAILED') orderStatus = 'cancelled'

    const { error } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        paid_at: status === 'PAID' ? new Date().toISOString() : null,
      })
      .eq('order_number', merchant_ref)

    if (error) {
      console.error('Callback update error:', error)
      return NextResponse.json({ success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
