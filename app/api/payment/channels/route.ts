import { NextResponse } from 'next/server'
import { getPaymentChannels } from '@/lib/tripay'

export async function GET() {
  try {
    const channels = await getPaymentChannels()
    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    console.error('Payment channels error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment channels' },
      { status: 500 }
    )
  }
}
