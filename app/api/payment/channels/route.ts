import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const channels = [
      {
        group: 'Virtual Account',
        code: 'bca',
        name: 'BCA Virtual Account',
        type: 'direct',
        icon_url: '/images/payment/bca.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'Virtual Account',
        code: 'bni',
        name: 'BNI Virtual Account',
        type: 'direct',
        icon_url: '/images/payment/bni.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'Virtual Account',
        code: 'bri',
        name: 'BRI Virtual Account',
        type: 'direct',
        icon_url: '/images/payment/bri.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'Virtual Account',
        code: 'mandiri',
        name: 'Mandiri Bill Payment',
        type: 'direct',
        icon_url: '/images/payment/mandiri.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'E-Wallet',
        code: 'qris',
        name: 'QRIS (GoPay/OVO/ShopeePay)',
        type: 'direct',
        icon_url: '/images/payment/qris.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'Convenience Store',
        code: 'alfamart',
        name: 'Alfamart',
        type: 'direct',
        icon_url: '/images/payment/alfamart.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      },
      {
        group: 'Convenience Store',
        code: 'indomaret',
        name: 'Indomaret',
        type: 'direct',
        icon_url: '/images/payment/indomaret.svg',
        active: true,
        fee_customer: { flat: 0, percent: 0 }
      }
    ]

    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    console.error('Payment channels error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment channels' },
      { status: 500 }
    )
  }
}

