import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STORE_INFO } from '@/lib/constants'

// Dynamic geocoding via Nominatim (OpenStreetMap) — uses structured queries for accuracy
async function geocodeAddress(params: {
  address?: string
  village?: string
  district?: string
  city?: string
  province?: string
  postal_code?: string
}): Promise<{ lat: number; lng: number }> {
  const { address, village, district, city, province, postal_code } = params

  // Build queries from most specific to least specific
  const queries: { structured?: Record<string, string>; freeform?: string }[] = []

  // === STRUCTURED QUERIES (much more accurate for Indonesian addresses) ===

  // Query 1: Village + District + City + Province (most specific)
  if (village && district && city) {
    queries.push({
      structured: {
        village: village,
        county: district,
        city: city,
        state: province || '',
        country: 'Indonesia',
      },
    })
  }

  // Query 2: Village + City + Province
  if (village && city) {
    queries.push({
      structured: {
        village: village,
        city: city,
        state: province || '',
        country: 'Indonesia',
      },
    })
  }

  // Query 3: District + City + Province
  if (district && city) {
    queries.push({
      structured: {
        county: district,
        city: city,
        state: province || '',
        country: 'Indonesia',
      },
    })
  }

  // === FREEFORM QUERIES (fallback) ===

  // Query 4: Full combined — "Desa X, Kecamatan Y, Kota Z, Provinsi, Indonesia"
  const fullParts = [
    village ? `Desa ${village}` : null,
    district ? `Kecamatan ${district}` : null,
    city,
    province,
    'Indonesia',
  ].filter(Boolean)
  if (fullParts.length > 2) queries.push({ freeform: fullParts.join(', ') })

  // Query 5: Village, district, city (without prefixes)
  const simpleParts = [village, district, city, province, 'Indonesia'].filter(Boolean)
  if (simpleParts.length > 2) queries.push({ freeform: simpleParts.join(', ') })

  // Query 6: Street address + district + city
  if (address) {
    const addrParts = [address, district, city, province, 'Indonesia'].filter(Boolean)
    if (addrParts.length > 2) queries.push({ freeform: addrParts.join(', ') })
  }

  // Query 7: District + city + province
  const districtParts = [district, city, province, 'Indonesia'].filter(Boolean)
  if (districtParts.length > 2) queries.push({ freeform: districtParts.join(', ') })

  // Query 8: City + province
  const cityParts = [city, province, 'Indonesia'].filter(Boolean)
  if (cityParts.length > 1) queries.push({ freeform: cityParts.join(', ') })

  // Query 9: Postal code
  if (postal_code) queries.push({ freeform: `${postal_code}, Indonesia` })

  // Query 10: City only
  if (city) queries.push({ freeform: `${city}, Indonesia` })

  // Try each query from most specific to least specific
  for (const query of queries) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')

      if (query.structured) {
        // Use structured query parameters for accuracy
        for (const [key, value] of Object.entries(query.structured)) {
          if (value) url.searchParams.set(key, value)
        }
      } else if (query.freeform) {
        url.searchParams.set('q', query.freeform)
      }

      url.searchParams.set('format', 'json')
      url.searchParams.set('limit', '1')
      url.searchParams.set('countrycodes', 'id')

      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'TamimParfume/1.0',
          'Accept-Language': 'id',
        },
        next: { revalidate: 86400 }, // Cache 24 hours
      })

      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lng = parseFloat(data[0].lon)
          // Validate that coordinates are within Indonesia bounds
          if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) {
            return { lat, lng }
          }
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err)
    }
  }

  // Last resort fallback: center of Indonesia
  return { lat: -2.5, lng: 118.0 }
}

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

  // Use village + district + city + province for accurate geocoding
  const destCoords = await geocodeAddress({
    address: order.shipping_address || undefined,
    village: order.shipping_village || undefined,
    district: order.shipping_district || undefined,
    city: order.shipping_city || undefined,
    province: order.shipping_province || undefined,
    postal_code: order.shipping_postal_code || undefined,
  })

  const destination = {
    city: order.shipping_city || 'Tujuan',
    province: order.shipping_province || '',
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
