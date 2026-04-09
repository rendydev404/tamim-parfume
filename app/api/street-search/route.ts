import { NextRequest, NextResponse } from 'next/server'

// GET /api/street-search?q=jalan+coneang&village=Cikiruhwetan&district=Cimanggu&city=Pandeglang&province=Banten
// Proxy to Nominatim (OpenStreetMap) filtered by selected region — with multiple search strategies
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const village = request.nextUrl.searchParams.get('village') || ''
  const district = request.nextUrl.searchParams.get('district') || ''
  const city = request.nextUrl.searchParams.get('city') || ''
  const province = request.nextUrl.searchParams.get('province') || ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ data: [] })
  }

  const allResults: any[] = []
  const seenNames = new Set<string>()

  // Add timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    // === Strategy 1: Structured Nominatim search (most accurate) ===
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('street', q)
      if (city) url.searchParams.set('city', city)
      if (district) url.searchParams.set('county', district)
      if (province) url.searchParams.set('state', province)
      url.searchParams.set('country', 'Indonesia')
      url.searchParams.set('countrycodes', 'id')
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '5')
      url.searchParams.set('accept-language', 'id')
      url.searchParams.set('dedupe', '1')

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'TamimParfume/1.0' },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (res.ok) {
        const results = await res.json()
        for (const item of results) {
          const key = item.display_name
          if (!seenNames.has(key)) {
            seenNames.add(key)
            allResults.push(item)
          }
        }
      }
    } catch { /* ignore individual strategy failure */ }

    // === Strategy 2: Contextual freeform search — q + village + district + city ===
    try {
      const regionParts = [village, district, city, province].filter(Boolean)
      const contextQuery = `${q}, ${regionParts.join(', ')}, Indonesia`

      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', contextQuery)
      url.searchParams.set('countrycodes', 'id')
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '5')
      url.searchParams.set('accept-language', 'id')
      url.searchParams.set('dedupe', '1')

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'TamimParfume/1.0' },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (res.ok) {
        const results = await res.json()
        for (const item of results) {
          const key = item.display_name
          if (!seenNames.has(key)) {
            seenNames.add(key)
            allResults.push(item)
          }
        }
      }
    } catch { /* ignore */ }

    // === Strategy 3: Broader search — q + city only (if no results from strategies 1 & 2) ===
    if (allResults.length < 3) {
      try {
        const broadQuery = city ? `${q}, ${city}, Indonesia` : `${q}, ${province}, Indonesia`

        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', broadQuery)
        url.searchParams.set('countrycodes', 'id')
        url.searchParams.set('format', 'json')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('limit', '5')
        url.searchParams.set('accept-language', 'id')
        url.searchParams.set('dedupe', '1')

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': 'TamimParfume/1.0' },
          signal: controller.signal,
          cache: 'no-store',
        })

        if (res.ok) {
          const results = await res.json()
          for (const item of results) {
            const key = item.display_name
            if (!seenNames.has(key)) {
              seenNames.add(key)
              allResults.push(item)
            }
          }
        }
      } catch { /* ignore */ }
    }

    clearTimeout(timeoutId)

    // Filter and transform results
    const data = allResults
      .map((item: any) => {
        const addr = item.address || {}
        return {
          display_name: item.display_name,
          road: addr.road || addr.pedestrian || addr.footway || addr.residential || '',
          house_number: addr.house_number || '',
          building: addr.building || addr.amenity || addr.shop || '',
          neighbourhood: addr.neighbourhood || addr.suburb || addr.hamlet || '',
          village: addr.village || addr.town || addr.city_district || '',
          city: addr.city || addr.county || addr.municipality || '',
          state: addr.state || '',
          postcode: addr.postcode || '',
          type: item.type || '',
          label: buildLabel(item),
          short_label: buildShortLabel(item),
        }
      })
      // Prioritize results that have a road name
      .sort((a: any, b: any) => {
        const aHasRoad = a.road ? 1 : 0
        const bHasRoad = b.road ? 1 : 0
        return bHasRoad - aHasRoad
      })
      .slice(0, 8) // Max 8 results

    return NextResponse.json({ data })
  } catch {
    clearTimeout(timeoutId)
    return NextResponse.json({ data: [] })
  }
}

function buildShortLabel(item: any): string {
  const addr = item.address || {}
  const parts: string[] = []

  const road = addr.road || addr.pedestrian || addr.footway || addr.residential || ''
  if (road) {
    let roadLabel = road
    if (addr.house_number) {
      roadLabel += ` No. ${addr.house_number}`
    }
    parts.push(roadLabel)
  }

  if (addr.building) parts.push(addr.building)
  if (addr.amenity) parts.push(addr.amenity)
  if (addr.shop) parts.push(addr.shop)

  if (parts.length === 0) {
    // Fallback: use the first 2 parts of display_name
    return item.display_name?.split(',').slice(0, 2).join(',').trim() || ''
  }

  return parts.join(', ')
}

function buildLabel(item: any): string {
  const addr = item.address || {}
  const parts: string[] = []

  // Road/street name with house number
  const road = addr.road || addr.pedestrian || addr.footway || addr.residential || ''
  if (road) {
    let roadLabel = road
    if (addr.house_number) {
      roadLabel += ` No. ${addr.house_number}`
    }
    parts.push(roadLabel)
  }

  // Building / amenity
  if (addr.building) parts.push(addr.building)
  if (addr.amenity) parts.push(addr.amenity)

  // Neighbourhood / hamlet
  const neighbourhood = addr.neighbourhood || addr.suburb || addr.hamlet || ''
  if (neighbourhood && !parts.includes(neighbourhood)) {
    parts.push(neighbourhood)
  }

  // Village/town
  const village = addr.village || addr.town || addr.city_district || ''
  if (village && !parts.includes(village)) {
    parts.push(village)
  }

  // District
  const district = addr.district || ''
  if (district && !parts.includes(district)) {
    parts.push(district)
  }

  // City
  const city = addr.city || addr.county || addr.municipality || ''
  if (city && !parts.includes(city)) {
    parts.push(city)
  }

  if (parts.length === 0) {
    return item.display_name?.split(',').slice(0, 3).join(',').trim() || 'Alamat tidak diketahui'
  }

  return parts.join(', ')
}
