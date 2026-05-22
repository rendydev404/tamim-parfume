import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBiteshipShipment, resolveBiteshipAreaId, mapCourierToBiteship } from '@/lib/biteship'

// POST: Book a shipment in Biteship for a paid order
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  // 1. Authenticate & Authorize
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Fetch Request Body for overrides (optional)
  const body = await request.json().catch(() => ({}))

  // 3. Fetch Order Details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  // 4. Fetch Order Items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  if (itemsError || !orderItems || orderItems.length === 0) {
    return NextResponse.json({ error: 'Item pesanan tidak ditemukan' }, { status: 400 })
  }

  // 5. Determine Courier & Service
  const courierCode = body.courierCode || order.shipping_courier || 'jne'
  const courierService = body.courierService || order.shipping_service || 'reg'

  try {
    // 6. Geocode destination using Biteship Maps API to find the Area ID
    console.log(`[Biteship Admin API] Geocoding destination for area: ${order.shipping_district}, ${order.shipping_city}, ${order.shipping_province}`)
    const destinationAreaId = await resolveBiteshipAreaId({
      district: order.shipping_district || '',
      city: order.shipping_city || '',
      province: order.shipping_province || ''
    })

    console.log(`[Biteship Admin API] Resolved destination Area ID: ${destinationAreaId}`)

    // 7. Calculate weight (default: 200g per product quantity if weight not specified in items)
    const weightGrams = orderItems.reduce((acc, item) => {
      const quantity = Number(item.quantity || 1)
      const weight = Number(item.weight || 200) // fallback to 200g
      return acc + (quantity * weight)
    }, 0)

    // 8. Structure booking items for Biteship
    const biteshipItems = orderItems.map(item => ({
      name: item.product_name || 'Tamim Parfume Product',
      value: Number(item.price || 0),
      quantity: Number(item.quantity || 1)
    }))

    // 9. Fetch store settings dynamically from database with defaults fallback
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
      console.warn('[Biteship Admin API] Failed to query dynamic store settings, using defaults:', dbErr.message)
    }

    // 10. Call Biteship Booking Helper
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
      throw new Error('Respons Biteship tidak valid')
    }

    console.log(`[Biteship Admin API] Courier Booking success. Waybill/Resi: ${shipmentResult.trackingNumber}`)

    // 10. Update Database State
    const updates: Record<string, any> = {
      shipping_tracking: shipmentResult.trackingNumber,
      status: 'shipped',
      updated_at: new Date().toISOString()
    }

    let savedWithLabel = false
    try {
      // Try to save with shipping_label column if it exists in the database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          ...updates,
          shipping_label: shipmentResult.labelUrl
        })
        .eq('id', id)

      if (updateError) {
        // If error is due to missing column (PostgreSQL error code 42703 or column message)
        if (updateError.message.includes('shipping_label') || updateError.code === '42703') {
          console.warn('[Biteship Admin API] column "shipping_label" does not exist in database, falling back to base columns')
          const { error: fallbackError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', id)

          if (fallbackError) throw fallbackError
        } else {
          throw updateError
        }
      } else {
        savedWithLabel = true
      }
    } catch (dbErr: any) {
      console.error('[Biteship Admin API] Database update error:', dbErr)
      return NextResponse.json({ error: dbErr.message || 'Gagal menyimpan data resi pengiriman ke database' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Booking kurir berhasil dan resi diterbitkan.',
      data: {
        trackingNumber: shipmentResult.trackingNumber,
        labelUrl: shipmentResult.labelUrl,
        biteshipOrderId: shipmentResult.biteshipOrderId,
        status: 'shipped',
        savedWithLabel
      }
    })

  } catch (error: any) {
    console.error('[Biteship Admin API Error]:', error)
    return NextResponse.json({
      error: error.message || 'Terjadi kesalahan sewaktu memproses booking kurir Biteship'
    }, { status: 500 })
  }
}
