import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STORE_INFO } from '@/lib/constants'

// ============================================================
// GEOCODING — Multi-strategy, village-level precision
// Uses Photon (primary) + Nominatim (fallback) for accuracy
// ============================================================

async function geocodeAddress(params: {
  address?: string
  village?: string
  district?: string
  city?: string
  province?: string
}): Promise<{ lat: number; lng: number }> {
  const { address, village, district, city, province } = params

  console.log(`[Geocode] Input: village="${village}", district="${district}", city="${city}", province="${province}", address="${address}"`)

  // Build search queries from most specific to least specific
  const queries: string[] = []

  // Most specific: village + district + city
  if (village && district && city) {
    queries.push(`${village}, ${district}, ${city}, ${province || ''}, Indonesia`)
    queries.push(`Desa ${village}, Kecamatan ${district}, ${city}, Indonesia`)
    queries.push(`${village}, ${district}, ${city}, Indonesia`)
  }

  // Village + city
  if (village && city) {
    queries.push(`${village}, ${city}, Indonesia`)
  }

  // Village only (with province context)
  if (village) {
    queries.push(`${village}, ${province || 'Indonesia'}`)
  }

  // Street address + village/district context
  if (address && village) {
    queries.push(`${address}, ${village}, ${city || ''}, Indonesia`)
  }

  // District + city (fallback)
  if (district && city) {
    queries.push(`Kecamatan ${district}, ${city}, Indonesia`)
    queries.push(`${district}, ${city}, Indonesia`)
  }

  // City + province (last resort before default)
  if (city) {
    queries.push(`${city}, ${province || ''}, Indonesia`)
  }

  // Try Photon first (better accuracy for Indonesian villages)
  for (const q of queries) {
    const result = await searchPhoton(q, village)
    if (result) {
      console.log(`[Geocode] ✅ Photon hit for "${q}" → ${result.lat}, ${result.lng}`)
      return result
    }
  }

  // Fallback to Nominatim
  for (const q of queries) {
    const result = await searchNominatim(q, village)
    if (result) {
      console.log(`[Geocode] ✅ Nominatim hit for "${q}" → ${result.lat}, ${result.lng}`)
      return result
    }
  }

  console.log('[Geocode] ❌ No results, using Indonesia center')
  return { lat: -2.5, lng: 118.0 }
}

// Search using Photon geocoder (built on OSM, good for villages)
async function searchPhoton(
  query: string,
  preferredName?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '5')
    url.searchParams.set('lang', 'default')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TamimParfume/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.features || data.features.length === 0) return null

    // Score each result and pick the best one
    let bestResult: { lat: number; lng: number; score: number } | null = null

    for (const feature of data.features) {
      const props = feature.properties || {}
      const coords = feature.geometry?.coordinates

      if (props.country && props.country !== 'Indonesia') continue
      if (!coords || coords.length < 2) continue

      const lat = coords[1]
      const lng = coords[0]

      // Validate Indonesia bounds
      if (lat < -11 || lat > 6 || lng < 95 || lng > 141) continue

      let score = 0
      const name = (props.name || '').toLowerCase()
      const osmValue = props.osm_value || ''

      // Strongly prefer results that match our village name
      if (preferredName && name === preferredName.toLowerCase()) {
        score += 100
      } else if (preferredName && name.includes(preferredName.toLowerCase())) {
        score += 50
      }

      // Prefer village/hamlet type results
      if (['village', 'hamlet'].includes(osmValue)) score += 30
      else if (['suburb', 'neighbourhood', 'town'].includes(osmValue)) score += 15
      else if (['city', 'county'].includes(osmValue)) score -= 20
      else if (['state', 'country'].includes(osmValue)) score -= 50

      if (!bestResult || score > bestResult.score) {
        bestResult = { lat, lng, score }
      }
    }

    return bestResult ? { lat: bestResult.lat, lng: bestResult.lng } : null
  } catch {
    return null
  }
}

// Search using Nominatim (OSM official geocoder)
async function searchNominatim(
  query: string,
  preferredName?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '3')
    url.searchParams.set('countrycodes', 'id')
    url.searchParams.set('accept-language', 'id')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TamimParfume/1.0' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data || data.length === 0) return null

    // Pick the result that best matches our village name
    let best = data[0]
    if (preferredName) {
      const preferred = data.find((d: any) =>
        (d.display_name || '').toLowerCase().includes(preferredName.toLowerCase())
      )
      if (preferred) best = preferred
    }

    const lat = parseFloat(best.lat)
    const lng = parseFloat(best.lon)

    if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) {
      return { lat, lng }
    }

    return null
  } catch {
    return null
  }
}

// ============================================================
// TRACKING API
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  // Only user's own orders (unless admin)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (order.user_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!order.shipping_tracking) {
    return NextResponse.json({ error: 'Resi belum tersedia' }, { status: 404 })
  }

  const origin = {
    city: STORE_INFO.city,
    district: STORE_INFO.district,
    lat: STORE_INFO.lat,
    lng: STORE_INFO.lng,
  }

  // ======= KEY FIX =======
  // The postal_code field in saved addresses actually stores the VILLAGE NAME
  // (due to how handleSaveAddress works in profile page).
  // So we use postal_code as a village name fallback when shipping_village is empty.
  const villageName = order.shipping_village
    || order.shipping_postal_code  // postal_code stores village name for saved addresses
    || ''
  const districtName = order.shipping_district || ''
  const cityName = order.shipping_city || ''
  const provinceName = order.shipping_province || ''

  // Geocode destination with village-level accuracy
  const destCoords = await geocodeAddress({
    address: order.shipping_address || undefined,
    village: villageName || undefined,
    district: districtName || undefined,
    city: cityName || undefined,
    province: provinceName || undefined,
  })

  const destination = {
    city: cityName || 'Tujuan',
    village: villageName,
    district: districtName,
    province: provinceName,
    lat: destCoords.lat,
    lng: destCoords.lng,
  }

  // Generate simulated checkpoints based on order timestamps
  const checkpoints = generateCheckpoints(order, origin, destination)

  // Calculate current position along the route
  const progress = calculateProgress(order)
  const currentPosition = {
    lat: origin.lat + (destination.lat - origin.lat) * progress,
    lng: origin.lng + (destination.lng - origin.lng) * progress,
  }

  return NextResponse.json({
    success: true,
    data: {
      tracking_number: order.shipping_tracking,
      courier: order.shipping_courier?.toUpperCase() || 'JNE',
      service: order.shipping_service || 'REG',
      status: order.status,
      origin,
      destination,
      current_position: currentPosition,
      progress,
      checkpoints,
    },
  })
}

function generateCheckpoints(
  order: Record<string, unknown>,
  origin: { city: string; district: string },
  destination: { city: string }
) {
  const orderDate = new Date(order.created_at as string)
  const status = order.status as string
  const isShipped = ['shipped', 'delivered'].includes(status)
  const isDelivered = status === 'delivered'

  const checkpoints: {
    status: string
    description: string
    location: string
    timestamp: string
    completed: boolean
  }[] = []

  // CP 1: Order confirmed
  checkpoints.push({
    status: 'confirmed',
    description: 'Pesanan dikonfirmasi',
    location: origin.city,
    timestamp: orderDate.toISOString(),
    completed: true,
  })

  if (!isShipped) return checkpoints

  // CP 2: Picked up by courier (shipped_at or +1 day after order)
  const pickupDate = new Date(orderDate)
  pickupDate.setHours(pickupDate.getHours() + 4)
  checkpoints.push({
    status: 'pickup',
    description: `Paket telah diambil oleh kurir di ${origin.district}, ${origin.city}`,
    location: `${origin.district}, ${origin.city}`,
    timestamp: pickupDate.toISOString(),
    completed: true,
  })

  // CP 3: Arrived at sorting facility origin
  const sortOriginDate = new Date(pickupDate)
  sortOriginDate.setHours(sortOriginDate.getHours() + 3)
  checkpoints.push({
    status: 'sort_origin',
    description: `Paket tiba di gudang sortir ${origin.city}`,
    location: `Gudang Sortir ${origin.city}`,
    timestamp: sortOriginDate.toISOString(),
    completed: true,
  })

  // CP 4: In transit
  const transitDate = new Date(sortOriginDate)
  transitDate.setHours(transitDate.getHours() + 8)
  checkpoints.push({
    status: 'in_transit',
    description: `Paket sedang dikirim ke ${destination.city}`,
    location: 'Dalam Perjalanan',
    timestamp: transitDate.toISOString(),
    completed: true,
  })

  // Calculate hours since shipped
  const now = new Date()
  const hoursSinceShipped = (now.getTime() - pickupDate.getTime()) / (1000 * 60 * 60)

  // CP 5: Arrived at destination sorting (after ~18h)
  if (hoursSinceShipped > 18 || isDelivered) {
    const sortDestDate = new Date(transitDate)
    sortDestDate.setHours(sortDestDate.getHours() + 10)
    checkpoints.push({
      status: 'sort_dest',
      description: `Paket tiba di gudang sortir ${destination.city}`,
      location: `Gudang Sortir ${destination.city}`,
      timestamp: sortDestDate.toISOString(),
      completed: true,
    })

    // CP 6: Out for delivery (after ~24h)
    if (hoursSinceShipped > 24 || isDelivered) {
      const outDate = new Date(sortDestDate)
      outDate.setHours(outDate.getHours() + 6)
      checkpoints.push({
        status: 'out_for_delivery',
        description: 'Paket sedang diantar ke alamat penerima',
        location: destination.city,
        timestamp: outDate.toISOString(),
        completed: isDelivered,
      })
    }

    // CP 7: Delivered
    if (isDelivered) {
      const deliverDate = new Date(sortDestDate)
      deliverDate.setHours(deliverDate.getHours() + 10)
      checkpoints.push({
        status: 'delivered',
        description: 'Paket telah diterima oleh penerima',
        location: destination.city,
        timestamp: deliverDate.toISOString(),
        completed: true,
      })
    }
  }

  return checkpoints
}

function calculateProgress(order: Record<string, unknown>): number {
  const status = order.status as string
  if (status === 'delivered') return 1

  if (status !== 'shipped') return 0

  const orderDate = new Date(order.created_at as string)
  const now = new Date()
  const hoursSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60)

  // Simulate progress over ~48 hours
  const progress = Math.min(hoursSinceOrder / 48, 0.9)
  return Math.max(0.1, progress)
}
