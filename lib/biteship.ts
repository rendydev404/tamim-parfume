// ============================================================
// TAMIM PARFUME — Biteship Logistics Gateway Integration
// ============================================================

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || ''
const BITESHIP_API_URL = process.env.BITESHIP_API_URL || 'https://api.biteship.com'

interface CreateShipmentParams {
  orderNumber: string
  courierCode: string // e.g. 'jne', 'sicepat', 'jnt'
  courierService: string // e.g. 'reg', 'yes'
  weightGrams: number
  
  // Origin (Shop/Warehouse)
  originName: string
  originPhone: string
  originAddress: string
  originAreaId: string // Biteship Area ID (fallback to geocoding or manual coordinates)

  // Destination (Customer)
  destinationName: string
  destinationPhone: string
  destinationAddress: string
  destinationAreaId: string // Biteship Area ID
  
  items: {
    name: string
    value: number
    quantity: number
  }[]
}

interface ShipmentResponse {
  success: boolean
  trackingNumber: string
  labelUrl: string
  biteshipOrderId: string
  status: string
  courierCompany: string
  courierType: string
  estimatedTimeOfDelivery: string
}

/**
 * Maps courier name to Biteship courier codes
 */
export function mapCourierToBiteship(courier: string): string {
  const c = courier.toLowerCase().trim()
  if (c.includes('jne')) return 'jne'
  if (c.includes('jnt') || c.includes('j&t')) return 'jnt'
  if (c.includes('sicepat')) return 'sicepat'
  if (c.includes('anteraja')) return 'anteraja'
  if (c.includes('tiki')) return 'tiki'
  if (c.includes('pos')) return 'pos'
  if (c.includes('ninja')) return 'ninja'
  if (c.includes('lion')) return 'lion'
  return c
}

/**
 * Creates a courier booking/shipment request in Biteship
 */
export async function createBiteshipShipment(params: CreateShipmentParams): Promise<ShipmentResponse> {
  const isMockMode = !BITESHIP_API_KEY || BITESHIP_API_KEY.includes('YOUR_BITESHIP_API_KEY') || BITESHIP_API_KEY === 'biteship_test_YOUR_BITESHIP_API_KEY'
  
  if (isMockMode) {
    console.log('[Biteship API] 🔧 Operating in MOCK MODE')
  } else if (BITESHIP_API_KEY.startsWith('biteship_live')) {
    console.log('[Biteship API] 🚀 Operating in LIVE PRODUCTION MODE')
  } else {
    console.log('[Biteship API] 🌐 Operating in API MODE')
  }

  if (isMockMode) {
    const randId = Math.floor(100000000 + Math.random() * 900000000)
    const courierUpper = params.courierCode.toUpperCase()
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    return {
      success: true,
      trackingNumber: `TP-${courierUpper}-MOCK${randId}`,
      labelUrl: `https://biteship.com/labels/mock-label-${randId}.pdf`,
      biteshipOrderId: `bship_order_${randId}`,
      status: 'allocated',
      courierCompany: params.courierCode,
      courierType: params.courierService,
      estimatedTimeOfDelivery: '2-3 Hari',
    }
  }

  const payload = {
    shipper_contact_name: params.originName,
    shipper_contact_phone: params.originPhone,
    shipper_contact_email: 'info@tamimparfume.com',
    origin_contact_name: params.originName,
    origin_contact_phone: params.originPhone,
    origin_address: params.originAddress,
    origin_area_id: params.originAreaId || 'ID1615211011', // Tegal Gundil area ID default
    
    recipient_contact_name: params.destinationName,
    recipient_contact_phone: params.destinationPhone,
    recipient_contact_email: '',
    destination_contact_name: params.destinationName,
    destination_contact_phone: params.destinationPhone,
    destination_address: params.destinationAddress,
    destination_area_id: params.destinationAreaId,
    
    courier_company: mapCourierToBiteship(params.courierCode),
    courier_type: params.courierService.toLowerCase(),
    delivery_type: 'now', // Now or scheduled
    
    items: params.items.map(item => ({
      name: item.name.substring(0, 50),
      value: Math.round(item.value),
      quantity: item.quantity,
      weight: 200, // Default 200g per bottle if not specified
    })),
    
    reference_id: params.orderNumber,
  }

  console.log('[Biteship API] Creating Shipment Payload:', JSON.stringify(payload, null, 2))

  try {
    const res = await fetch(`${BITESHIP_API_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    if (!res.ok) {
      console.error('[Biteship API Error]:', json)
      // Check if sandbox is having rate errors and fallback to mock
      if (BITESHIP_API_KEY.startsWith('biteship_test') && (json.code === 40002021 || json.error?.includes('Rates') || json.message?.includes('Rates') || json.error?.includes('rates') || json.message?.includes('rates'))) {
        console.warn('[Biteship API] ⚠️ Sandbox Rate Retrieval Failed (40002021). Falling back to local simulation.')
        const randId = Math.floor(100000000 + Math.random() * 900000000)
        const courierUpper = params.courierCode.toUpperCase()
        return {
          success: true,
          trackingNumber: `TP-${courierUpper}-MOCK${randId}`,
          labelUrl: `https://biteship.com/labels/mock-label-${randId}.pdf`,
          biteshipOrderId: `bship_order_${randId}`,
          status: 'allocated',
          courierCompany: params.courierCode,
          courierType: params.courierService,
          estimatedTimeOfDelivery: '2-3 Hari',
        }
      }
      throw new Error(json.error || json.message || 'Gagal membuat pengiriman kurir di Biteship')
    }

    const orderData = json.data || {}
    const courier = orderData.courier || {}

    return {
      success: true,
      trackingNumber: orderData.courier?.tracking_number || `AWB-${orderData.id}`,
      labelUrl: orderData.courier?.waybill_id ? `https://api.biteship.com/v1/waybills/${orderData.courier.waybill_id}/pdf` : '',
      biteshipOrderId: orderData.id,
      status: orderData.status,
      courierCompany: courier.company || params.courierCode,
      courierType: courier.type || params.courierService,
      estimatedTimeOfDelivery: courier.estimated_time_of_delivery || '2-3 Hari',
    }
  } catch (err: any) {
    if (BITESHIP_API_KEY.startsWith('biteship_test')) {
      console.warn('[Biteship API] ⚠️ Sandbox API Booking failed. Graceful fallback to sandbox mock simulation:', err.message)
      const randId = Math.floor(100000000 + Math.random() * 900000000)
      const courierUpper = params.courierCode.toUpperCase()
      return {
        success: true,
        trackingNumber: `TP-${courierUpper}-MOCK${randId}`,
        labelUrl: `https://biteship.com/labels/mock-label-${randId}.pdf`,
        biteshipOrderId: `bship_order_${randId}`,
        status: 'allocated',
        courierCompany: params.courierCode,
        courierType: params.courierService,
        estimatedTimeOfDelivery: '2-3 Hari',
      }
    }
    throw err
  }
}

/**
 * Track shipment checkpoints directly from Biteship
 */
export async function trackBiteshipShipment(trackingNumber: string, courierCode: string) {
  const isMockMode = !BITESHIP_API_KEY || BITESHIP_API_KEY.includes('YOUR_BITESHIP_API_KEY') || trackingNumber.startsWith('TP-') || trackingNumber.includes('MOCK')
  
  if (isMockMode) {
    return {
      success: true,
      tracking_number: trackingNumber,
      courier: courierCode.toUpperCase(),
      history: [], // Let the page fallback to time-based geocoded simulation
      status: 'allocated',
    }
  }

  const res = await fetch(`${BITESHIP_API_URL}/v1/trackings/${trackingNumber}/couriers/${mapCourierToBiteship(courierCode)}`, {
    headers: {
      Authorization: BITESHIP_API_KEY,
    },
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error || json.message || 'Gagal melacak nomor resi di Biteship')
  }

  return json
}

/**
 * Resolves a region search query to a Biteship Area ID
 */
export async function resolveBiteshipAreaId(params: {
  district: string
  city: string
  province: string
}): Promise<string> {
  const isMockMode = !BITESHIP_API_KEY || BITESHIP_API_KEY.includes('YOUR_BITESHIP_API_KEY') || BITESHIP_API_KEY === 'biteship_test_YOUR_BITESHIP_API_KEY'
  
  if (isMockMode) {
    console.log('[Biteship API] 🔧 resolveBiteshipAreaId operating in MOCK MODE')
    // Default placeholder for Tegal Gundil, Bogor Utara, Kota Bogor
    return 'ID1615211011'
  } else if (BITESHIP_API_KEY.startsWith('biteship_live')) {
    console.log('[Biteship API] 🚀 resolveBiteshipAreaId operating in LIVE PRODUCTION MODE')
  }

  try {
    const query = `${params.district}, ${params.city}, ${params.province}`
    const res = await fetch(`${BITESHIP_API_URL}/v1/maps/areas?countries=ID&input=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: BITESHIP_API_KEY,
      },
    })

    if (!res.ok) return 'ID1615211011'

    const json = await res.json()
    const areas = json.areas || []
    
    if (areas.length > 0) {
      // Find area that matches best or return the first hit
      return areas[0].id
    }
  } catch (err) {
    console.error('[Biteship API] Failed to resolve Area ID:', err)
  }

  return 'ID1615211011' // Fallback to store area ID
}

/**
 * Automatically books a shipment in Biteship for a given paid order ID.
 * This is triggered upon successful payment callback or manual payment confirmation by admin.
 */
export async function autoBookBiteshipShipment(
  orderId: string,
  supabase: any
): Promise<{ success: boolean; trackingNumber?: string; labelUrl?: string; error?: string }> {
  try {
    console.log(`[Biteship Auto-Book] Starting auto-booking for order ${orderId}`)

    // 1. Fetch Order Details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Pesanan tidak ditemukan' }
    }

    // If order already has tracking number, do not double-book
    if (order.shipping_tracking) {
      console.log(`[Biteship Auto-Book] Order ${order.order_number} already has airway bill: ${order.shipping_tracking}. Skipping.`)
      return { success: true, trackingNumber: order.shipping_tracking, labelUrl: order.shipping_label }
    }

    // Check if shipment is local delivery or courier is missing
    const courierCode = order.shipping_courier
    const courierService = order.shipping_service

    if (!courierCode || courierCode.toLowerCase() === 'local' || courierCode.toLowerCase() === 'pickup') {
      console.log(`[Biteship Auto-Book] Order ${order.order_number} uses non-biteship shipping: ${courierCode}. Skipping booking.`)
      return { success: true }
    }

    // 2. Fetch Order Items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError || !orderItems || orderItems.length === 0) {
      return { success: false, error: 'Item pesanan tidak ditemukan' }
    }

    // 3. Resolve destination Area ID using Biteship Maps API
    const destinationAreaId = await resolveBiteshipAreaId({
      district: order.shipping_district || '',
      city: order.shipping_city || '',
      province: order.shipping_province || ''
    })

    // 4. Calculate total weight
    const weightGrams = orderItems.reduce((acc: number, item: any) => {
      const quantity = Number(item.quantity || 1)
      const weight = Number(item.weight || 200) // Default weight 200g
      return acc + (quantity * weight)
    }, 0)

    // 5. Structure items payload
    const biteshipItems = orderItems.map((item: any) => ({
      name: (item.product_name || 'Tamim Parfume Product').substring(0, 50),
      value: Number(item.price || 0),
      quantity: Number(item.quantity || 1)
    }))
    // 6. Fetch store settings dynamically from database with defaults fallback
    let originName = 'Tamim Parfume'
    let originPhone = '08129000123'
    let originAddress = 'Jl. Achmad Adnawijaya No.5, RT.05/RW.11, Tegal Gundil, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16152'
    let originAreaId = 'ID1615211011'

    try {
      const { data: dbSettings } = await supabase
        .from('store_settings')
        .select('name, phone, address, biteship_area_id')
        .eq('id', 1)
        .maybeSingle()

      if (dbSettings) {
        if (dbSettings.name) originName = dbSettings.name
        if (dbSettings.phone) originPhone = dbSettings.phone
        if (dbSettings.address) originAddress = dbSettings.address
        if (dbSettings.biteship_area_id) originAreaId = dbSettings.biteship_area_id
      }
    } catch (dbErr: any) {
      console.warn('[Biteship Auto-Book] Failed to query dynamic store settings, using defaults:', dbErr.message)
    }

    // 7. Call Biteship Booking
    const shipmentResult = await createBiteshipShipment({
      orderNumber: order.order_number,
      courierCode: mapCourierToBiteship(courierCode),
      courierService: courierService,
      weightGrams: weightGrams,

      // Origin
      originName,
      originPhone,
      originAddress,
      originAreaId,

      // Destination
      destinationName: order.recipient_name,
      destinationPhone: order.recipient_phone,
      destinationAddress: order.shipping_address,
      destinationAreaId: destinationAreaId,

      items: biteshipItems
    })

    if (!shipmentResult.success) {
      return { success: false, error: 'Booking Biteship gagal' }
    }

    console.log(`[Biteship Auto-Book] Shipment successfully created. Waybill/Resi: ${shipmentResult.trackingNumber}`)

    // 7. Update Database with airway bill & auto-transition to shipped status
    const updates: Record<string, any> = {
      shipping_tracking: shipmentResult.trackingNumber,
      status: 'shipped',
      updated_at: new Date().toISOString()
    }

    // Try to update including shipping_label column with graceful fallback
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          ...updates,
          shipping_label: shipmentResult.labelUrl
        })
        .eq('id', orderId)

      if (updateError) {
        // Fallback for missing shipping_label column (PostgreSQL 42703)
        if (updateError.message.includes('shipping_label') || updateError.code === '42703') {
          console.warn('[Biteship Auto-Book] Column "shipping_label" does not exist in database, falling back.')
          const { error: fallbackError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId)

          if (fallbackError) throw fallbackError
        } else {
          throw updateError
        }
      }
    } catch (dbErr: any) {
      console.error('[Biteship Auto-Book] Database update error:', dbErr)
      return { success: false, error: dbErr.message || 'Gagal menyimpan resi ke database' }
    }

    return {
      success: true,
      trackingNumber: shipmentResult.trackingNumber,
      labelUrl: shipmentResult.labelUrl
    }
  } catch (err: any) {
    console.error('[Biteship Auto-Book] Exception:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan tidak terduga pada auto-booking' }
  }
}
