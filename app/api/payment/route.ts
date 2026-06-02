import { NextResponse } from 'next/server'
import { createTransaction } from '@/lib/midtrans'

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

    // Use the actual request URL to determine the app URL for callbacks
    const requestUrl = new URL(request.url)
    const appUrl = `${requestUrl.protocol}//${requestUrl.host}`

    console.log('[Payment] Creating transaction:', { method, orderNumber, amount, appUrl })

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Payment error:', errorMessage, error)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
