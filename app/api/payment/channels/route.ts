import { NextRequest, NextResponse } from 'next/server'

// Midtrans supported payment channels
// These are static since Midtrans Core API doesn't have a "list channels" endpoint.
// Enable/disable channels based on your Midtrans dashboard configuration.
const MIDTRANS_CHANNELS = [
  // Virtual Account
  { group: 'Virtual Account', code: 'bca', name: 'BCA Virtual Account', type: 'direct', icon_url: '/images/payment/bca.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
  { group: 'Virtual Account', code: 'bni', name: 'BNI Virtual Account', type: 'direct', icon_url: '/images/payment/bni.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
  { group: 'Virtual Account', code: 'bri', name: 'BRI Virtual Account', type: 'direct', icon_url: '/images/payment/bri.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
  { group: 'Virtual Account', code: 'mandiri', name: 'Mandiri Bill Payment', type: 'direct', icon_url: '/images/payment/mandiri.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
  // E-Wallet (QRIS)
  { group: 'E-Wallet', code: 'qris', name: 'QRIS', type: 'direct', icon_url: '/images/payment/image.png', active: true, fee_customer: { flat: 0, percent: 0 } },
  // Convenience Store
  { group: 'Convenience Store', code: 'alfamart', name: 'Alfamart', type: 'direct', icon_url: '/images/payment/alfamart.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
  { group: 'Convenience Store', code: 'indomaret', name: 'Indomaret', type: 'direct', icon_url: '/images/payment/indomaret.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
]

export async function GET(request: NextRequest) {
  try {
    // Return Midtrans payment channels (static list)
    // Filter only active channels
    const channels = MIDTRANS_CHANNELS.filter(ch => ch.active)
    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    console.error('Payment channels error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment channels' },
      { status: 500 }
    )
  }
}
