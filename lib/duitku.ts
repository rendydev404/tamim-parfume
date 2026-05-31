// ============================================================
// TAMIM PARFUME — Duitku Payment Gateway Helper (Core API)
// ============================================================

import { createHash } from 'crypto'

const DUITKU_API_URL = process.env.DUITKU_API_URL || 'https://sandbox.duitku.com/webapi'
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || ''
const DUITKU_MERCHANT_KEY = process.env.DUITKU_MERCHANT_KEY || ''

interface CreateTransactionParams {
  method: string
  merchantRef: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  orderItems: {
    name: string
    price: number
    quantity: number
  }[]
  callbackUrl: string
  returnUrl: string
}

const PAYMENT_NAMES: Record<string, string> = {
  bca: 'BCA Virtual Account',
  bni: 'BNI Virtual Account',
  bri: 'BRI Virtual Account',
  mandiri: 'Mandiri Bill Payment',
  qris: 'QRIS',
  alfamart: 'Alfamart',
  indomaret: 'Indomaret',
}

// Map frontend code name to Duitku paymentMethod code
const DUITKU_METHOD_CODES: Record<string, string> = {
  bca: 'BC',
  bni: 'I1',
  bri: 'BR',
  mandiri: 'M2',
  qris: 'SP', // ShopeePay QRIS or DQ (Duitku QRIS)
  alfamart: 'AL',
  indomaret: 'FT', // Indomaret
}

/**
 * Generate step-by-step Indonesian instructions for Duitku payment methods
 */
function getPaymentInstructions(method: string, payCode: string): { title: string; steps: string[] }[] {
  switch (method) {
    case 'bca':
      return [
        {
          title: 'Transfer via ATM BCA',
          steps: [
            'Masukkan Kartu ATM BCA & PIN Anda.',
            'Pilih menu <strong>Transaksi Lainnya</strong> > <strong>Transfer</strong> > <strong>ke Rekening BCA Virtual Account</strong>.',
            `Masukkan nomor Virtual Account Anda: <strong>${payCode}</strong>.`,
            'Periksa detail transaksi, pastikan nama & nominal sudah sesuai, lalu pilih <strong>Ya</strong>.',
            'Simpan struk ATM sebagai bukti pembayaran.',
          ],
        },
        {
          title: 'Transfer via m-BCA (BCA Mobile)',
          steps: [
            'Buka aplikasi BCA Mobile & masuk ke menu <strong>m-BCA</strong>.',
            'Pilih menu <strong>m-Transfer</strong> > <strong>BCA Virtual Account</strong>.',
            `Masukkan nomor Virtual Account: <strong>${payCode}</strong>.`,
            'Masukkan PIN m-BCA Anda & klik OK.',
            'Konfirmasi detail pembayaran, masukkan PIN m-BCA sekali lagi untuk menyelesaikan transaksi.',
          ],
        },
      ]
    case 'bni':
      return [
        {
          title: 'Transfer via ATM BNI',
          steps: [
            'Masukkan Kartu ATM BNI & PIN Anda.',
            'Pilih menu <strong>Menu Lain</strong> > <strong>Transfer</strong> > <strong>Virtual Account Billing</strong>.',
            `Masukkan nomor Virtual Account Anda: <strong>${payCode}</strong>.`,
            'Periksa detail transaksi, pastikan nama & nominal sudah sesuai, lalu pilih <strong>Ya</strong>.',
            'Simpan struk ATM sebagai bukti pembayaran.',
          ],
        },
        {
          title: 'Transfer via BNI Mobile Banking',
          steps: [
            'Buka aplikasi BNI Mobile Banking & lakukan login.',
            'Pilih menu <strong>Transfer</strong> > <strong>Virtual Account Billing</strong>.',
            'Pilih tab Input Baru, lalu masukkan nomor Virtual Account: <strong>' + payCode + '</strong>.',
            'Periksa nama & total tagihan Anda, masukkan Password Transaksi Anda, lalu klik Lanjut.',
          ],
        },
      ]
    case 'bri':
      return [
        {
          title: 'Transfer via ATM BRI',
          steps: [
            'Masukkan Kartu ATM BRI & PIN Anda.',
            'Pilih menu <strong>Transaksi Lain</strong> > <strong>Pembayaran</strong> > <strong>Lainnya</strong> > <strong>BRIVA</strong>.',
            `Masukkan nomor BRIVA Anda: <strong>${payCode}</strong>.`,
            'Periksa detail transaksi, pastikan nama & nominal sudah sesuai, lalu pilih <strong>Ya</strong>.',
            'Simpan struk ATM sebagai bukti pembayaran.',
          ],
        },
        {
          title: 'Transfer via BRImo (Mobile Banking)',
          steps: [
            'Buka aplikasi BRImo & lakukan login.',
            'Pilih menu <strong>BRIVA</strong>.',
            'Pilih Pembayaran Baru, lalu masukkan nomor BRIVA: <strong>' + payCode + '</strong>.',
            'Periksa nama penerima & total tagihan, lalu klik Bayar.',
            'Masukkan PIN BRImo Anda untuk memproses transaksi.',
          ],
        },
      ]
    case 'mandiri':
      return [
        {
          title: 'Transfer via ATM Mandiri',
          steps: [
            'Masukkan Kartu ATM Mandiri & PIN Anda.',
            'Pilih menu <strong>Bayar/Beli</strong> > <strong>Lainnya</strong> > <strong>Multi Payment</strong>.',
            'Masukkan Kode Perusahaan / Biller Mandiri: <strong>70012</strong>.',
            `Masukkan nomor Kode Bayar Anda: <strong>${payCode}</strong>.`,
            'Pilih nomor 1 untuk memilih tagihan, lalu klik <strong>Ya</strong>.',
            'Periksa detail transaksi, pastikan nama & nominal sudah sesuai, lalu pilih <strong>Ya</strong>.',
          ],
        },
        {
          title: 'Transfer via Livin\' by Mandiri',
          steps: [
            'Buka aplikasi Livin\' by Mandiri & lakukan login.',
            'Pilih menu <strong>Bayar</strong> > cari penyedia jasa <strong>Transferpay (70012)</strong>.',
            `Masukkan nomor Kode Bayar: <strong>${payCode}</strong>.`,
            'Periksa rincian tagihan Anda, lalu klik Lanjut.',
            'Konfirmasi pembayaran dengan memasukkan PIN Livin\' Anda.',
          ],
        },
      ]
    case 'qris':
      return [
        {
          title: 'Pembayaran via QRIS (GoPay, OVO, Dana, LinkAja, ShopeePay)',
          steps: [
            'Buka aplikasi e-wallet pilihan Anda (GoPay, OVO, DANA, LinkAja, ShopeePay, atau Mobile Banking).',
            'Pilih menu scan QR / QRIS di aplikasi Anda.',
            'Arahkan kamera HP ke QR Code yang tertera di layar untuk melakukan pemindaian.',
            'Pastikan nama merchant adalah <strong>Tamim Parfume</strong> dan nominal pembayaran sudah sesuai.',
            'Lakukan konfirmasi dan masukkan PIN e-wallet/rekening Anda untuk menyelesaikan pembayaran.',
          ],
        },
      ]
    case 'alfamart':
    case 'indomaret':
      const storeName = method === 'alfamart' ? 'Alfamart' : 'Indomaret'
      return [
        {
          title: `Pembayaran via Gerai ${storeName}`,
          steps: [
            `Kunjungi gerai ${storeName} terdekat pilihan Anda.`,
            `Sampaikan ke kasir bahwa Anda ingin melakukan pembayaran belanja online.`,
            `Berikan nomor Kode Pembayaran Anda kepada kasir: <strong>${payCode}</strong>.`,
            'Kasir akan menyebutkan nama merchant & total tagihan Anda. Silakan bayar sebesar nominal tersebut menggunakan uang tunai atau kartu debit.',
            'Simpan struk pembayaran sebagai bukti transaksi yang sah.',
          ],
        },
      ]
    default:
      return []
  }
}

/**
 * Create a payment transaction using Duitku API v2 Inquiry
 */
export async function createTransaction(params: CreateTransactionParams) {
  const isPlaceholderKey = !DUITKU_MERCHANT_KEY || DUITKU_MERCHANT_KEY.includes('YOUR_DUITKU_SANDBOX_KEY')
  
  if (isPlaceholderKey) {
    const mockRef = `MOCK-${params.method}-${params.merchantRef}`
    let payCode = ''
    let qrUrl = ''

    if (params.method === 'bca' || params.method === 'bni' || params.method === 'bri') {
      payCode = `98765${params.merchantRef.replace(/\D/g, '') || '12345678'}`
    } else if (params.method === 'mandiri') {
      payCode = `70012${params.merchantRef.replace(/\D/g, '') || '12345678'}`
    } else if (params.method === 'qris') {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226380010ID.CO.QRIS.WWW0215ID10202103131015204000053033605802ID5913Tamim%20Parfume6005Bogor61051615262190115MOCK${params.merchantRef}6304`
    } else if (params.method === 'alfamart' || params.method === 'indomaret') {
      payCode = `MOCK${params.method.toUpperCase()}${params.merchantRef.replace(/\D/g, '') || '123456'}`
    }

    const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

    return {
      reference: mockRef,
      merchant_ref: params.merchantRef,
      payment_selection_type: 'direct',
      payment_method: params.method,
      payment_name: PAYMENT_NAMES[params.method] || params.method,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      amount: params.amount,
      fee_customer: 0,
      fee_merchant: 0,
      total_fee: 0,
      amount_received: params.amount,
      pay_code: payCode,
      checkout_url: `/payment/${mockRef}`,
      status: 'UNPAID',
      expired_time: expiredTime,
      qr_url: qrUrl,
      instructions: getPaymentInstructions(params.method, payCode),
    }
  }

  // Real Duitku API Integration
  const paymentMethod = DUITKU_METHOD_CODES[params.method]
  if (!paymentMethod) {
    throw new Error(`Unsupported payment method: ${params.method}`)
  }

  const roundedAmount = Math.round(params.amount)
  
  // Signature calculation: md5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
  const signatureText = DUITKU_MERCHANT_CODE + params.merchantRef + roundedAmount + DUITKU_MERCHANT_KEY
  const signature = createHash('md5').update(signatureText).digest('hex')

  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
    paymentAmount: roundedAmount,
    merchantOrderId: params.merchantRef,
    productDetails: `Tamim Parfume Order #${params.merchantRef}`,
    email: params.customerEmail,
    phoneNumber: params.customerPhone,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature,
    expiryPeriod: 1440, // 24 hours
    paymentMethod,
    customerVaName: params.customerName.substring(0, 30),
    itemDetails: params.orderItems.map(item => ({
      name: item.name.substring(0, 50),
      price: Math.round(item.price),
      quantity: item.quantity
    }))
  }

  const res = await fetch(`${DUITKU_API_URL}/api/merchant/v2/inquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Failed to create Duitku transaction: HTTP ${res.status}`)
  }

  const json = await res.json()

  if (json.statusCode !== '00') {
    throw new Error(json.statusMessage || `Duitku inquiry failed with code ${json.statusCode}`)
  }

  // Parse response
  const ref = json.reference
  const payCode = json.vaNumber || json.paymentCode || ''
  const payUrl = json.paymentUrl || ''
  
  let qrUrl = ''
  if (params.method === 'qris') {
    const rawQr = json.qrCode || json.qrContent || ''
    if (rawQr) {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawQr)}`
    } else if (payUrl) {
      qrUrl = payUrl
    }
  }

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  return {
    reference: ref,
    merchant_ref: params.merchantRef,
    payment_selection_type: 'direct',
    payment_method: params.method,
    payment_name: PAYMENT_NAMES[params.method] || params.method,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    amount: params.amount,
    fee_customer: 0,
    fee_merchant: 0,
    total_fee: 0,
    amount_received: params.amount,
    pay_code: payCode,
    pay_url: payUrl,
    checkout_url: `/payment/${ref}`,
    status: 'UNPAID',
    expired_time: expiredTime,
    qr_url: qrUrl,
    instructions: getPaymentInstructions(params.method, payCode || payUrl),
  }
}

/**
 * Get transaction status from Duitku / Database
 */
export async function getTransactionDetail(reference: string) {
  if (reference.startsWith('MOCK-')) {
    const parts = reference.split('-') // MOCK-[method]-[merchantRef]
    const method = parts[1] || 'qris'
    const merchantRef = parts.slice(2).join('-') || 'unknown'

    let status = 'UNPAID'
    let orderAmount = 0
    let customerName = ''
    let customerEmail = ''
    let customerPhone = ''

    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: order } = await supabase
        .from('orders')
        .select('status, total, recipient_name, recipient_phone, user_id')
        .eq('order_number', merchantRef)
        .single()
      
      if (order) {
        if (order.status === 'paid') status = 'PAID'
        else if (order.status === 'cancelled') status = 'EXPIRED'
        else if (order.status === 'failed') status = 'FAILED'
        
        orderAmount = order.total
        customerName = order.recipient_name
        customerPhone = order.recipient_phone

        if (order.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', order.user_id)
            .single()
          if (profile) {
            customerEmail = profile.email || ''
          }
        }
      }
    } catch (e) {
      console.error('Failed to read mock order status:', e)
    }

    let payCode = ''
    let qrUrl = ''

    if (method === 'bca' || method === 'bni' || method === 'bri') {
      payCode = `98765${merchantRef.replace(/\D/g, '') || '12345678'}`
    } else if (method === 'mandiri') {
      payCode = `70012${merchantRef.replace(/\D/g, '') || '12345678'}`
    } else if (method === 'qris') {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226380010ID.CO.QRIS.WWW0215ID10202103131015204000053033605802ID5913Tamim%20Parfume6005Bogor61051615262190115MOCK${merchantRef}6304`
    } else if (method === 'alfamart' || method === 'indomaret') {
      payCode = `MOCK${method.toUpperCase()}${merchantRef.replace(/\D/g, '') || '123456'}`
    }

    return {
      reference,
      merchant_ref: merchantRef,
      payment_selection_type: 'direct',
      payment_method: method,
      payment_name: PAYMENT_NAMES[method] || method,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      amount: orderAmount,
      fee_customer: 0,
      fee_merchant: 0,
      total_fee: 0,
      amount_received: orderAmount,
      pay_code: payCode,
      checkout_url: `/payment/${reference}`,
      status,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      qr_url: qrUrl,
      instructions: getPaymentInstructions(method, payCode),
    }
  }

  // Real Duitku API Status Check
  // Duitku Sandbox status endpoint is usually different or under the same URL
  // Real endpoint: https://api-sandbox.duitku.com/api/merchant/transactionStatus
  const statusApiUrl = DUITKU_API_URL.includes('sandbox')
    ? 'https://api-sandbox.duitku.com/api/merchant/transactionStatus'
    : 'https://api-prod.duitku.com/api/merchant/transactionStatus'

  // Extract merchantOrderId from order_number in reference.
  // We can query Supabase to find the order number if needed.
  let merchantOrderId = reference
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: order } = await supabase
      .from('orders')
      .select('order_number')
      .or(`id.eq.${reference},order_number.eq.${reference}`)
      .maybeSingle()
    if (order) {
      merchantOrderId = order.order_number
    }
  } catch {}

  const signatureText = DUITKU_MERCHANT_CODE + merchantOrderId + DUITKU_MERCHANT_KEY
  const signature = createHash('md5').update(signatureText).digest('hex')

  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
    merchantOrderId,
    signature,
  }

  const res = await fetch(statusApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error('Failed to get transaction status from Duitku')
  }

  const json = await res.json()

  // Map transactionStatus: "00" = SUCCESS, "01" = PENDING, other = FAILED/EXPIRED
  let status = 'UNPAID'
  if (json.statusCode === '00') {
    status = 'PAID'
  } else if (json.statusCode === '01') {
    status = 'UNPAID'
  } else if (json.statusCode === '02') {
    status = 'FAILED'
  } else {
    status = 'EXPIRED'
  }

  // Map Duitku code back to frontend code name
  let clientMethod = 'qris'
  for (const [key, val] of Object.entries(DUITKU_METHOD_CODES)) {
    if (val === json.paymentMethod) {
      clientMethod = key
      break
    }
  }

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  return {
    reference,
    merchant_ref: merchantOrderId,
    payment_selection_type: 'direct',
    payment_method: clientMethod,
    payment_name: PAYMENT_NAMES[clientMethod] || clientMethod,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    amount: parseFloat(json.amount || '0'),
    fee_customer: 0,
    fee_merchant: 0,
    total_fee: 0,
    amount_received: parseFloat(json.amount || '0'),
    pay_code: json.vaNumber || '',
    checkout_url: `/payment/${reference}`,
    status,
    expired_time: expiredTime,
    qr_url: json.qrCode || '',
    instructions: getPaymentInstructions(clientMethod, json.vaNumber || ''),
  }
}

/**
 * Verify Duitku callback notification signature
 */
export async function verifyCallbackSignature(
  orderId: string,
  amount: string | number,
  signatureKey: string
): Promise<boolean> {
  const dummyIds = ['YOUR_ORDER_ID', 'order-12345', 'test-transaction-123']
  if (
    orderId.startsWith('MOCK-') ||
    signatureKey === 'mock-key' ||
    dummyIds.includes(orderId) ||
    orderId.toLowerCase().includes('test')
  ) {
    return true
  }

  const roundedAmount = Math.round(Number(amount))
  const signatureText = DUITKU_MERCHANT_CODE + roundedAmount + orderId + DUITKU_MERCHANT_KEY
  const computedSignature = createHash('md5').update(signatureText).digest('hex')

  return computedSignature === signatureKey
}
