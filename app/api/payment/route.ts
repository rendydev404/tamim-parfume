import { NextResponse } from 'next/server'
import { createTransaction } from '@/lib/tripay'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderId,
      orderNumber,
      method,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      items,
    } = body

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const transaction = await createTransaction({
      method,
      merchantRef: orderNumber,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      orderItems: items,
      callbackUrl: `${appUrl}/api/payment/callback`,
      returnUrl: `${appUrl}/orders/${orderId}`,
    })

    return NextResponse.json({ success: true, data: transaction })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
