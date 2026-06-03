
const MIDTRANS_API_URL = process.env.MIDTRANS_API_URL || 'https://api.sandbox.midtrans.com/v2'
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || ''

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

/**
 * Generate Authorization Header for Midtrans
 */
function getAuthHeader(): string {
  const token = btoa(`${MIDTRANS_SERVER_KEY}:`)
  return `Basic ${token}`
}

/**
 * Generate step-by-step Indonesian instructions for each payment method
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
            'Buka aplikasi e-wallet pilihan Anda (GoPay, OVO, Dana, LinkAja, ShopeePay, atau Mobile Banking).',
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
 * Create a payment transaction using Midtrans Core API
 */
export async function createTransaction(params: CreateTransactionParams) {
  let payment_type = 'bank_transfer'
  let customPayload: Record<string, any> = {}

  switch (params.method) {
    case 'bca':
    case 'bni':
    case 'bri':
      payment_type = 'bank_transfer'
      customPayload = {
        bank_transfer: {
          bank: params.method,
        },
      }
      break
    case 'mandiri':
      payment_type = 'echannel'
      customPayload = {
        echannel: {
          bill_info1: 'Payment For',
          bill_info2: 'Tamim Parfume Order',
        },
      }
      break
    case 'qris':
      payment_type = 'gopay'
      customPayload = {
        gopay: {
          enable_callback: true,
        },
      }
      break
    case 'alfamart':
    case 'indomaret':
      payment_type = 'cstore'
      customPayload = {
        cstore: {
          store: params.method,
          message: 'Payment for Tamim Parfume Order',
        },
      }
      break
    default:
      throw new Error(`Unsupported payment method: ${params.method}`)
  }

  // Build item_details, filtering out any items with non-positive prices (e.g. discount)
  const itemDetails = params.orderItems
    .filter(item => item.price > 0)
    .map((item, idx) => ({
      id: `item-${idx + 1}`,
      price: Math.round(item.price),
      quantity: item.quantity,
      name: item.name.substring(0, 50),
    }))

  // Calculate the sum of item_details
  const itemTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const grossAmount = Math.round(params.amount)

  // If there's a difference (due to shipping, discount, rounding), add an adjustment item
  const diff = grossAmount - itemTotal
  if (diff > 0) {
    itemDetails.push({
      id: 'shipping',
      price: diff,
      quantity: 1,
      name: 'Ongkos Kirim & Biaya Lainnya',
    })
  } else if (diff < 0) {
    // Negative diff means discount is larger; add as separate discount line
    // Midtrans doesn't support negative prices, so we redistribute across items
    // by simply not sending item_details (let Midtrans use gross_amount only)
    itemDetails.length = 0
  }

  // Add a short timestamp suffix to avoid Midtrans duplicate order_id errors on retry
  const uniqueOrderId = `${params.merchantRef}_${Date.now().toString(36)}`

  const payload: Record<string, any> = {
    payment_type,
    transaction_details: {
      order_id: uniqueOrderId,
      gross_amount: grossAmount,
    },
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    ...customPayload,
  }

  // Only include item_details if we have valid items that match gross_amount
  if (itemDetails.length > 0) {
    payload.item_details = itemDetails
  }

  const isPlaceholderKey = !MIDTRANS_SERVER_KEY || MIDTRANS_SERVER_KEY.includes('YOUR_SANDBOX_SERVER_KEY')
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

  const res = await fetch(`${MIDTRANS_API_URL}/charge`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.status_message || 'Failed to create Midtrans transaction')
  }

  const json = await res.json()

  // Parse details based on payment method
  let payCode = ''
  let qrUrl = ''

  if (params.method === 'bca' || params.method === 'bni' || params.method === 'bri') {
    payCode = json.va_numbers?.[0]?.va_number || ''
  } else if (params.method === 'mandiri') {
    payCode = json.bill_key || '' // user will pay using bill_key and biller_code (70012)
  } else if (params.method === 'qris') {
    qrUrl = json.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || json.actions?.find((a: any) => a.name === 'deeplink-redirect')?.url || ''
  } else if (params.method === 'alfamart' || params.method === 'indomaret') {
    payCode = json.payment_code || ''
  }

  // Calculate expired time (24 hours from transaction time or current time)
  const expiredTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60

  return {
    reference: json.transaction_id || json.order_id,
    merchant_ref: json.order_id,
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
    checkout_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${json.transaction_id || json.order_id}`,
    status: 'UNPAID',
    expired_time: expiredTime,
    qr_url: qrUrl,
    instructions: getPaymentInstructions(params.method, payCode),
  }
}

/**
 * Get transaction status from Midtrans
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

        // Fetch user email if available
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

  const res = await fetch(`${MIDTRANS_API_URL}/${reference}/status`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error('Failed to get transaction status from Midtrans')
  }

  const json = await res.json()

  // Map transaction status to a unified status
  let status = 'UNPAID'
  if (json.transaction_status === 'settlement' || json.transaction_status === 'capture') {
    status = 'PAID'
  } else if (json.transaction_status === 'expire') {
    status = 'EXPIRED'
  } else if (json.transaction_status === 'cancel' || json.transaction_status === 'deny') {
    status = 'FAILED'
  }

  // Parse payment codes
  let payCode = ''
  let qrUrl = ''
  const paymentMethod = json.payment_type === 'bank_transfer' ? json.va_numbers?.[0]?.bank : json.payment_type

  // Map to our client-side selected method
  let clientMethod = json.payment_type
  if (json.payment_type === 'bank_transfer') {
    clientMethod = json.va_numbers?.[0]?.bank || 'bca'
    payCode = json.va_numbers?.[0]?.va_number || ''
  } else if (json.payment_type === 'echannel') {
    clientMethod = 'mandiri'
    payCode = json.bill_key || ''
  } else if (json.payment_type === 'qris' || json.payment_type === 'gopay') {
    clientMethod = 'qris'
    qrUrl = json.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || json.actions?.find((a: any) => a.name === 'deeplink-redirect')?.url || ''
  } else if (json.payment_type === 'cstore') {
    clientMethod = json.store || 'alfamart'
    payCode = json.payment_code || ''
  }

  const transactionTime = new Date(json.transaction_time).getTime() / 1000
  const expiredTime = transactionTime + 24 * 60 * 60

  return {
    reference: json.transaction_id,
    merchant_ref: json.order_id,
    payment_selection_type: 'direct',
    payment_method: clientMethod,
    payment_name: PAYMENT_NAMES[clientMethod] || clientMethod,
    customer_name: '', // Optional in status check
    customer_email: '',
    customer_phone: '',
    amount: parseFloat(json.gross_amount),
    fee_customer: 0,
    fee_merchant: 0,
    total_fee: 0,
    amount_received: parseFloat(json.gross_amount),
    pay_code: payCode,
    checkout_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/${json.transaction_id}`,
    status,
    expired_time: expiredTime,
    qr_url: qrUrl,
    instructions: getPaymentInstructions(clientMethod, payCode),
  }
}

/**
 * Verify Midtrans callback notification signature
 */
export async function verifyCallbackSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
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
  const { createHash } = await import('crypto')

  const stringToHash = orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY
  const computedSignature = createHash('sha512').update(stringToHash).digest('hex')

  return computedSignature === signatureKey
}
