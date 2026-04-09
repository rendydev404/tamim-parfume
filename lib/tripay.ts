// ============================================================
// TAMIM PARFUME — Tripay Payment Gateway Helper
// ============================================================

const TRIPAY_API_URL = process.env.TRIPAY_API_URL || 'https://tripay.co.id/api-sandbox'
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY || ''
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY || ''
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || ''

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

/**
 * Get available payment channels from Tripay
 */
export async function getPaymentChannels() {
  const res = await fetch(`${TRIPAY_API_URL}/merchant/payment-channel`, {
    headers: {
      Authorization: `Bearer ${TRIPAY_API_KEY}`,
    },
    next: { revalidate: 3600 }, // Cache 1 hour
  })

  if (!res.ok) {
    throw new Error('Failed to fetch payment channels')
  }

  const json = await res.json()
  return json.data
}

/**
 * Create a payment transaction
 */
export async function createTransaction(params: CreateTransactionParams) {
  const { createHmac } = await import('crypto')
  
  const signature = createHmac('sha256', TRIPAY_PRIVATE_KEY)
    .update(TRIPAY_MERCHANT_CODE + params.merchantRef + params.amount)
    .digest('hex')

  const payload = {
    method: params.method,
    merchant_ref: params.merchantRef,
    amount: params.amount,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    order_items: params.orderItems.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    callback_url: params.callbackUrl,
    return_url: params.returnUrl,
    expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    signature,
  }

  const res = await fetch(`${TRIPAY_API_URL}/transaction/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TRIPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.message || 'Failed to create transaction')
  }

  const json = await res.json()
  return json.data
}

/**
 * Verify Tripay callback signature
 */
export async function verifyCallback(callbackData: string): Promise<boolean> {
  const { createHmac } = await import('crypto')
  
  const json = JSON.parse(callbackData)
  const signature = createHmac('sha256', TRIPAY_PRIVATE_KEY)
    .update(callbackData)
    .digest('hex')

  return signature === json.signature
}

/**
 * Get transaction detail
 */
export async function getTransactionDetail(reference: string) {
  const res = await fetch(
    `${TRIPAY_API_URL}/transaction/detail?reference=${reference}`,
    {
      headers: {
        Authorization: `Bearer ${TRIPAY_API_KEY}`,
      },
    }
  )

  if (!res.ok) {
    throw new Error('Failed to get transaction detail')
  }

  const json = await res.json()
  return json.data
}
