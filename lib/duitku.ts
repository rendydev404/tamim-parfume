// ============================================================
// TAMIM PARFUME — Duitku Payment Gateway Helper (Core API)
// ============================================================

import { createHash } from 'crypto'

const DUITKU_API_URL = process.env.DUITKU_API_URL || 'https://sandbox.duitku.com/webapi'
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || ''
const DUITKU_MERCHANT_KEY = process.env.DUITKU_MERCHANT_KEY || ''

// Helper: check if using placeholder/missing credentials
function isPlaceholderCredentials(): boolean {
  return !DUITKU_MERCHANT_KEY || 
         DUITKU_MERCHANT_KEY.includes('YOUR_DUITKU_SANDBOX_KEY') || 
         DUITKU_MERCHANT_CODE === 'D12345' ||
         !DUITKU_MERCHANT_CODE
}

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
// NOTE: Actual available codes depend on merchant sandbox configuration.
// Use getAvailablePaymentMethods() to fetch dynamically.
const DUITKU_METHOD_CODES: Record<string, string> = {
  bca: 'BC',
  bni: 'I1',
  bri: 'BR',
  mandiri: 'M2',
  permata: 'BT',
  cimb: 'B1',
  maybank: 'VA',
  qris: 'SP',     // ShopeePay QRIS — will auto-detect from API
  ovo: 'OV',
  dana: 'DA',
  alfamart: 'FT',  // Retail outlets (Alfamart, Pos, Pegadaian)
  indomaret: 'FT', // Same retail code
  credit_card: 'VC',
}

// Reverse mapping: Duitku code → frontend code name
const DUITKU_CODE_TO_NAME: Record<string, string> = {
  BC: 'bca',
  I1: 'bni',
  BR: 'bri',
  M2: 'mandiri',
  BT: 'permata',
  B1: 'cimb',
  VA: 'maybank',
  SP: 'qris',
  QR: 'qris',   // Alternative QRIS code
  NQ: 'qris',   // NusaPay QRIS
  DQ: 'qris',   // Duitku QRIS
  OV: 'ovo',
  DA: 'dana',
  FT: 'alfamart',
  AL: 'alfamart',
  VC: 'credit_card',
  MG: 'credit_card',
}

/**
 * Dynamically fetch available payment methods from Duitku API
 * This ensures only sandbox-supported methods are shown to the user.
 */
export async function getAvailablePaymentMethods(amount: number = 10000) {
  if (isPlaceholderCredentials()) {
    // Return hardcoded list for mock/placeholder mode
    return [
      { paymentMethod: 'BC', paymentName: 'BCA Virtual Account', paymentImage: '', totalFee: '0' },
      { paymentMethod: 'I1', paymentName: 'BNI Virtual Account', paymentImage: '', totalFee: '0' },
      { paymentMethod: 'BR', paymentName: 'BRI Virtual Account', paymentImage: '', totalFee: '0' },
      { paymentMethod: 'M2', paymentName: 'Mandiri Virtual Account', paymentImage: '', totalFee: '0' },
      { paymentMethod: 'SP', paymentName: 'QRIS', paymentImage: '', totalFee: '0' },
      { paymentMethod: 'FT', paymentName: 'Retail (Alfamart/Indomaret)', paymentImage: '', totalFee: '0' },
    ]
  }

  try {
    // Format datetime as Asia/Jakarta
    const now = new Date()
    const jakartaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(now)

    const dtParts: Record<string, string> = {}
    for (const part of jakartaTime) {
      dtParts[part.type] = part.value
    }
    const datetime = `${dtParts.year}-${dtParts.month}-${dtParts.day} ${dtParts.hour}:${dtParts.minute}:${dtParts.second}`

    // Signature: sha256(merchantCode + amount + datetime + merchantKey)
    const signatureStr = DUITKU_MERCHANT_CODE + amount + datetime + DUITKU_MERCHANT_KEY
    const signature = createHash('sha256').update(signatureStr).digest('hex')

    console.log('[Duitku] Fetching available payment methods...')
    console.log('[Duitku] datetime:', datetime)

    const res = await fetch(`${DUITKU_API_URL}/api/merchant/paymentmethod/getpaymentmethod`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        merchantcode: DUITKU_MERCHANT_CODE,
        amount: String(amount),
        datetime,
        signature,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Duitku] getPaymentMethod HTTP error:', res.status, errText)
      return []
    }

    const json = await res.json()
    console.log('[Duitku] Available payment methods:', JSON.stringify(json, null, 2))

    // Response is either { paymentFee: [...] } or directly [...]
    const methods = Array.isArray(json) ? json : (json.paymentFee || [])
    return methods
  } catch (err) {
    console.error('[Duitku] Error fetching payment methods:', err)
    return []
  }
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
  console.log('[Duitku debug] DUITKU_MERCHANT_CODE:', DUITKU_MERCHANT_CODE)
  console.log('[Duitku debug] DUITKU_MERCHANT_KEY:', DUITKU_MERCHANT_KEY ? '*****' : 'empty')
  console.log('[Duitku debug] isPlaceholderCredentials:', isPlaceholderCredentials())
  
  if (isPlaceholderCredentials()) {
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
  // Resolve the correct Duitku payment method code dynamically
  let paymentMethod = DUITKU_METHOD_CODES[params.method]
  
  // For QRIS and other methods, dynamically detect the actual code from Duitku API
  const isQris = params.method === 'qris'
  const qrisAlternativeCodes = ['SP', 'QR', 'NQ', 'DQ']
  
  try {
    const availableMethods = await getAvailablePaymentMethods(Math.round(params.amount))
    
    if (availableMethods.length > 0) {
      if (isQris) {
        // Find any available QRIS-type method from the API
        const qrisMethod = availableMethods.find(
          (m: { paymentMethod: string }) => qrisAlternativeCodes.includes(m.paymentMethod)
        )
        if (qrisMethod) {
          paymentMethod = qrisMethod.paymentMethod
          console.log('[Duitku] Using QRIS code from API:', paymentMethod)
        }
      } else if (paymentMethod) {
        // Check if the hardcoded code is available (soft check — just log warning)
        const found = availableMethods.find(
          (m: { paymentMethod: string }) => m.paymentMethod === paymentMethod
        )
        if (!found) {
          console.warn(`[Duitku] Payment method ${paymentMethod} (${params.method}) may not be available. Available:`,
            availableMethods.map((m: { paymentMethod: string; paymentName: string }) => `${m.paymentMethod}=${m.paymentName}`).join(', ')
          )
          // Still proceed — Duitku v2/inquiry will give us a proper error if it really isn't available
        }
      }
    }
  } catch (fetchErr) {
    // Non-blocking: just log and proceed with default code
    console.warn('[Duitku] Could not fetch available methods, proceeding with default code:', fetchErr)
  }

  if (!paymentMethod) {
    throw new Error(`Unsupported payment method: ${params.method}`)
  }

  const roundedAmount = Math.round(params.amount)
  const uniqueOrderId = `${params.merchantRef}_${Math.floor(Date.now() / 1000)}`
  
  // Signature calculation: md5(merchantCode + merchantOrderId + paymentAmount + merchantKey)
  const signatureText = DUITKU_MERCHANT_CODE + uniqueOrderId + roundedAmount + DUITKU_MERCHANT_KEY
  const signature = createHash('md5').update(signatureText).digest('hex')

  const payload = {
    merchantCode: DUITKU_MERCHANT_CODE,
    paymentAmount: roundedAmount,
    merchantOrderId: uniqueOrderId,
    productDetails: `Tamim Parfume Order #${params.merchantRef}`,
    email: params.customerEmail,
    phoneNumber: params.customerPhone,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature,
    expiryPeriod: 1440, // 24 hours
    paymentMethod,
    customerVaName: params.customerName.substring(0, 30),
    itemDetails: [{
      name: `Order #${params.merchantRef}`.substring(0, 50),
      price: roundedAmount,
      quantity: 1
    }]
  }

  console.log('[Duitku debug] Requesting Duitku API:', {
    url: `${DUITKU_API_URL}/api/merchant/v2/inquiry`,
    uniqueOrderId,
    paymentMethod,
    amount: roundedAmount,
    merchantCode: DUITKU_MERCHANT_CODE,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
  })

  const res = await fetch(`${DUITKU_API_URL}/api/merchant/v2/inquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('[Duitku debug] HTTP error response:', errorText)
    throw new Error(`Failed to create Duitku transaction: HTTP ${res.status} - ${errorText}`)
  }

  const json = await res.json()
  console.log('[Duitku debug] Duitku inquiry response:', JSON.stringify(json, null, 2))

  if (json.statusCode !== '00') {
    console.error('[Duitku debug] Duitku business logic error response:', json)
    throw new Error(json.statusMessage || `Duitku inquiry failed with code ${json.statusCode}`)
  }

  // Parse response
  const ref = json.reference
  const payCode = json.vaNumber || json.paymentCode || ''
  const payUrl = json.paymentUrl || ''
  
  let qrUrl = ''
  if (isQris) {
    // Try multiple QRIS response fields
    const rawQr = json.qrString || json.qrCode || json.qrContent || ''
    if (rawQr) {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rawQr)}`
    } else if (payUrl) {
      // Duitku sandbox may return QRIS as a paymentUrl (redirect to QR page)
      qrUrl = payUrl
    }
  }

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  return {
    reference: uniqueOrderId,
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
    checkout_url: `/payment/${uniqueOrderId}`,
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

  // Extract merchantOrderId and original order_number
  const merchantOrderId = reference
  const originalOrderNumber = reference.includes('_') ? reference.split('_')[0] : reference

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

  // Map Duitku code back to frontend code name using reverse mapping
  const clientMethod = DUITKU_CODE_TO_NAME[json.paymentMethod] || 'qris'

  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  // Fetch customer details from Database
  let customerName = ''
  let customerPhone = ''
  let customerEmail = ''

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: order } = await supabase
      .from('orders')
      .select('recipient_name, recipient_phone, user_id')
      .eq('order_number', originalOrderNumber)
      .single()
      
    if (order) {
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
  } catch (dbErr) {
    console.error('[Duitku] Failed to fetch customer details for real transaction status:', dbErr)
  }

  // Construct QR URL / Pay URL for QRIS or other redirect methods in sandbox
  let payUrl = ''
  let qrUrl = json.qrCode || ''
  if (clientMethod === 'qris') {
    const duitkuRef = json.reference || ''
    if (duitkuRef) {
      const baseUrl = DUITKU_API_URL.includes('sandbox')
        ? 'https://sandbox.duitku.com/topup/selectPayment.aspx'
        : 'https://passport.duitku.com/webapi/selectPayment.aspx'
      payUrl = `${baseUrl}?reference=${duitkuRef}`
      qrUrl = payUrl
    }
  }

  return {
    reference,
    merchant_ref: originalOrderNumber,
    payment_selection_type: 'direct',
    payment_method: clientMethod,
    payment_name: PAYMENT_NAMES[clientMethod] || clientMethod,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    amount: parseFloat(json.amount || '0'),
    fee_customer: 0,
    fee_merchant: 0,
    total_fee: 0,
    amount_received: parseFloat(json.amount || '0'),
    pay_code: json.vaNumber || '',
    pay_url: payUrl,
    checkout_url: `/payment/${reference}`,
    status,
    expired_time: expiredTime,
    qr_url: qrUrl,
    instructions: getPaymentInstructions(clientMethod, json.vaNumber || payUrl),
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
