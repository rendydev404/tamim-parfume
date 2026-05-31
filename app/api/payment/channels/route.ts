import { NextRequest, NextResponse } from 'next/server'
import { getAvailablePaymentMethods } from '@/lib/duitku'

// Map Duitku paymentMethod codes to our internal channel definitions
const CODE_TO_CHANNEL: Record<string, {
  group: string
  code: string
  name: string
  type: string
  icon_url: string
}> = {
  BC: { group: 'Virtual Account', code: 'bca', name: 'BCA Virtual Account', type: 'direct', icon_url: '/images/payment/bca.svg' },
  I1: { group: 'Virtual Account', code: 'bni', name: 'BNI Virtual Account', type: 'direct', icon_url: '/images/payment/bni.svg' },
  BR: { group: 'Virtual Account', code: 'bri', name: 'BRI Virtual Account', type: 'direct', icon_url: '/images/payment/bri.svg' },
  M2: { group: 'Virtual Account', code: 'mandiri', name: 'Mandiri Bill Payment', type: 'direct', icon_url: '/images/payment/mandiri.svg' },
  BT: { group: 'Virtual Account', code: 'permata', name: 'Permata Virtual Account', type: 'direct', icon_url: '/images/payment/permata.svg' },
  B1: { group: 'Virtual Account', code: 'cimb', name: 'CIMB Niaga Virtual Account', type: 'direct', icon_url: '/images/payment/cimb.svg' },
  VA: { group: 'Virtual Account', code: 'maybank', name: 'Maybank Virtual Account', type: 'direct', icon_url: '/images/payment/maybank.svg' },
  SP: { group: 'E-Wallet', code: 'qris', name: 'QRIS (GoPay/OVO/ShopeePay)', type: 'direct', icon_url: '/images/payment/qris.svg' },
  QR: { group: 'E-Wallet', code: 'qris', name: 'QRIS (GoPay/OVO/ShopeePay)', type: 'direct', icon_url: '/images/payment/qris.svg' },
  NQ: { group: 'E-Wallet', code: 'qris', name: 'QRIS (NusaPay)', type: 'direct', icon_url: '/images/payment/qris.svg' },
  DQ: { group: 'E-Wallet', code: 'qris', name: 'QRIS (Duitku)', type: 'direct', icon_url: '/images/payment/qris.svg' },
  OV: { group: 'E-Wallet', code: 'ovo', name: 'OVO', type: 'direct', icon_url: '/images/payment/ovo.svg' },
  DA: { group: 'E-Wallet', code: 'dana', name: 'DANA', type: 'direct', icon_url: '/images/payment/dana.svg' },
  FT: { group: 'Convenience Store', code: 'alfamart', name: 'Retail (Alfamart/Indomaret)', type: 'direct', icon_url: '/images/payment/alfamart.svg' },
  AL: { group: 'Convenience Store', code: 'alfamart', name: 'Alfamart', type: 'direct', icon_url: '/images/payment/alfamart.svg' },
  VC: { group: 'Credit Card', code: 'credit_card', name: 'Kartu Kredit/Debit', type: 'direct', icon_url: '/images/payment/visa.svg' },
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const amount = parseInt(searchParams.get('amount') || '10000', 10)

    // Dynamically fetch available payment methods from Duitku
    const duitkuMethods = await getAvailablePaymentMethods(amount)

    if (duitkuMethods.length === 0) {
      // Fallback: return default channels if API call fails
      const defaultChannels = [
        { group: 'Virtual Account', code: 'bca', name: 'BCA Virtual Account', type: 'direct', icon_url: '/images/payment/bca.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'Virtual Account', code: 'bni', name: 'BNI Virtual Account', type: 'direct', icon_url: '/images/payment/bni.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'Virtual Account', code: 'bri', name: 'BRI Virtual Account', type: 'direct', icon_url: '/images/payment/bri.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'Virtual Account', code: 'mandiri', name: 'Mandiri Bill Payment', type: 'direct', icon_url: '/images/payment/mandiri.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'E-Wallet', code: 'qris', name: 'QRIS (GoPay/OVO/ShopeePay)', type: 'direct', icon_url: '/images/payment/qris.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'Convenience Store', code: 'alfamart', name: 'Alfamart', type: 'direct', icon_url: '/images/payment/alfamart.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
        { group: 'Convenience Store', code: 'indomaret', name: 'Indomaret', type: 'direct', icon_url: '/images/payment/indomaret.svg', active: true, fee_customer: { flat: 0, percent: 0 } },
      ]
      return NextResponse.json({ success: true, data: defaultChannels })
    }

    // Transform Duitku response into our channel format
    const seenCodes = new Set<string>()
    const channels = []

    for (const method of duitkuMethods) {
      const channelDef = CODE_TO_CHANNEL[method.paymentMethod]
      if (!channelDef) {
        // Unknown payment method code, still include it with generic info
        channels.push({
          group: 'Lainnya',
          code: method.paymentMethod.toLowerCase(),
          name: method.paymentName || method.paymentMethod,
          type: 'direct',
          icon_url: method.paymentImage || '',
          active: true,
          fee_customer: { flat: parseInt(method.totalFee || '0', 10), percent: 0 },
        })
        continue
      }

      // Avoid duplicates (e.g., multiple QRIS codes like SP, QR, NQ)
      if (seenCodes.has(channelDef.code)) continue
      seenCodes.add(channelDef.code)

      channels.push({
        ...channelDef,
        // Use the official image from Duitku API if available
        icon_url: method.paymentImage || channelDef.icon_url,
        active: true,
        fee_customer: { flat: parseInt(method.totalFee || '0', 10), percent: 0 },
      })
    }

    return NextResponse.json({ success: true, data: channels })
  } catch (error) {
    console.error('Payment channels error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment channels' },
      { status: 500 }
    )
  }
}
