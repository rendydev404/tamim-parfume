import { NextRequest, NextResponse } from 'next/server'

// GET /api/street-search?q=jalan+coneang&village=Cikiruhwetan&district=Cikeusik&city=Pandeglang&province=Banten
// Multi-strategy street search combining Overpass API, Photon, and Nominatim
// for maximum coverage including pelosok/rural areas in Indonesia
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const village = request.nextUrl.searchParams.get('village') || ''
  const district = request.nextUrl.searchParams.get('district') || ''
  const city = request.nextUrl.searchParams.get('city') || ''
  const province = request.nextUrl.searchParams.get('province') || ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ data: [] })
  }

  const searchQuery = q.trim().toLowerCase()
  const allResults: any[] = []
  const seenLabels = new Set<string>()

  // Add timeout to prevent hanging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  // Helper to add unique results
  const addResult = (item: any) => {
    const key = (item.label || item.short_label || '').toLowerCase()
    if (key && !seenLabels.has(key)) {
      seenLabels.add(key)
      allResults.push(item)
    }
  }

  try {
    // Run all strategies in parallel for speed
    const strategies = await Promise.allSettled([
      // === Strategy 1: Overpass API — Query ALL streets in the village directly from OSM database ===
      // This is the most comprehensive source as it searches raw OSM data
      fetchOverpassStreets(village, district, city, searchQuery, controller.signal),

      // === Strategy 2: Photon geocoder — Alternative to Nominatim with better fuzzy matching ===
      fetchPhotonResults(searchQuery, village, district, city, province, controller.signal),

      // === Strategy 3: Nominatim structured search ===
      fetchNominatimStructured(searchQuery, city, district, province, controller.signal),

      // === Strategy 4: Nominatim freeform contextual search ===
      fetchNominatimFreeform(searchQuery, village, district, city, province, controller.signal),
    ])

    // Process results from all strategies
    for (const result of strategies) {
      if (result.status === 'fulfilled' && result.value) {
        for (const item of result.value) {
          addResult(item)
        }
      }
    }

    clearTimeout(timeoutId)

    // Sort: prioritize results with road names, then alphabetically
    const sorted = allResults
      .sort((a, b) => {
        // Prioritize items with road/street names
        const aHasRoad = a.road ? 1 : 0
        const bHasRoad = b.road ? 1 : 0
        if (bHasRoad !== aHasRoad) return bHasRoad - aHasRoad

        // Then sort by relevance (exact match first)
        const aExact = a.label?.toLowerCase().includes(searchQuery) ? 1 : 0
        const bExact = b.label?.toLowerCase().includes(searchQuery) ? 1 : 0
        if (bExact !== aExact) return bExact - aExact

        return (a.label || '').localeCompare(b.label || '')
      })
      .slice(0, 12)

    return NextResponse.json({ data: sorted })
  } catch {
    clearTimeout(timeoutId)
    return NextResponse.json({ data: [] })
  }
}

// === Strategy 1: Overpass API — direct OSM database query ===
// Finds ALL mapped roads/streets/paths within a village boundary
async function fetchOverpassStreets(
  village: string,
  district: string,
  city: string,
  searchQuery: string,
  signal: AbortSignal
): Promise<any[]> {
  if (!village && !district) return []

  try {
    // Build Overpass QL query to find all highways in the village area
    // Indonesia admin levels: 4=Province, 5=Kabupaten/Kota, 6=Kecamatan, 7=Desa/Kelurahan
    // Try simple village-level search first (most reliable), then fallback to district
    const queries: string[] = []

    if (village) {
      // Simple village search — most reliable
      queries.push(`
        [out:json][timeout:10];
        area["name"~"${escapeOverpass(village)}",i]["admin_level"~"7|8"]->.searchArea;
        (way["highway"]["name"](area.searchArea););
        out tags;
      `)
    }

    if (district && queries.length === 0) {
      // Fallback: district-level search
      queries.push(`
        [out:json][timeout:10];
        area["name"~"${escapeOverpass(district)}",i]["admin_level"="6"]->.searchArea;
        (way["highway"]["name"](area.searchArea););
        out tags;
      `)
    }

    // Try each query until we get results
    for (const overpassQuery of queries) {
      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal,
        })

        if (!res.ok) continue

        const data = await res.json()
        const results: any[] = []
        const seenRoads = new Set<string>()

        if (data.elements && Array.isArray(data.elements)) {
          for (const el of data.elements) {
            const tags = el.tags || {}
            const name = tags.name || ''
            if (!name) continue

            // Filter by search query — fuzzy match
            const nameLower = name.toLowerCase()
            const queryWords = searchQuery.split(/\s+/)
            const matches = queryWords.some(w => nameLower.includes(w)) || nameLower.includes(searchQuery)

            if (!matches) continue
            if (seenRoads.has(nameLower)) continue
            seenRoads.add(nameLower)

            const hwType = tags.highway || ''
            const typeLabel = getHighwayTypeLabel(hwType)

            const roadLabel = `${name}${typeLabel ? ` (${typeLabel})` : ''}`
            const contextParts = [village, district, city].filter(Boolean)
            const fullLabel = contextParts.length > 0
              ? `${roadLabel}, ${contextParts.join(', ')}`
              : roadLabel

            results.push({
              display_name: fullLabel,
              road: name,
              house_number: '',
              building: '',
              neighbourhood: tags.neighbourhood || '',
              village: village,
              city: city,
              state: '',
              postcode: '',
              type: hwType,
              label: fullLabel,
              short_label: roadLabel,
              source: 'overpass',
            })
          }
        }

        if (results.length > 0) return results
      } catch { /* try next query */ }
    }

    return []
  } catch {
    return []
  }
}

// === Strategy 2: Photon geocoder ===
async function fetchPhotonResults(
  searchQuery: string,
  village: string,
  district: string,
  city: string,
  province: string,
  signal: AbortSignal
): Promise<any[]> {
  try {
    const regionParts = [village, district, city].filter(Boolean)
    const contextQuery = regionParts.length > 0
      ? `${searchQuery}, ${regionParts.join(', ')}`
      : `${searchQuery}, Indonesia`

    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', contextQuery)
    url.searchParams.set('limit', '5')
    url.searchParams.set('lang', 'default')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TamimParfume/1.0' },
      signal,
    })

    if (!res.ok) return []

    const data = await res.json()
    const results: any[] = []

    if (data.features && Array.isArray(data.features)) {
      for (const feature of data.features) {
        const props = feature.properties || {}

        // Only include results from Indonesia
        if (props.country && props.country !== 'Indonesia') continue

        const road = props.street || props.name || ''
        const houseNumber = props.housenumber || ''
        const building = ''
        const neighbourhood = props.district || ''
        const villageResult = props.locality || props.city || ''
        const cityResult = props.county || props.state || ''

        let shortLabel = road
        if (houseNumber) shortLabel += ` No. ${houseNumber}`

        const parts: string[] = []
        if (shortLabel) parts.push(shortLabel)
        if (neighbourhood && !parts.includes(neighbourhood)) parts.push(neighbourhood)
        if (villageResult && !parts.includes(villageResult)) parts.push(villageResult)
        if (cityResult && !parts.includes(cityResult)) parts.push(cityResult)

        if (parts.length === 0) continue

        results.push({
          display_name: parts.join(', '),
          road,
          house_number: houseNumber,
          building,
          neighbourhood,
          village: villageResult,
          city: cityResult,
          state: props.state || '',
          postcode: props.postcode || '',
          type: props.osm_value || '',
          label: parts.join(', '),
          short_label: shortLabel || parts[0],
          source: 'photon',
        })
      }
    }

    return results
  } catch {
    return []
  }
}

// === Strategy 3: Nominatim structured search ===
async function fetchNominatimStructured(
  searchQuery: string,
  city: string,
  district: string,
  province: string,
  signal: AbortSignal
): Promise<any[]> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('street', searchQuery)
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
      signal,
      cache: 'no-store',
    })

    if (!res.ok) return []

    const data = await res.json()
    return data.map((item: any) => transformNominatimResult(item))
  } catch {
    return []
  }
}

// === Strategy 4: Nominatim freeform search with context ===
async function fetchNominatimFreeform(
  searchQuery: string,
  village: string,
  district: string,
  city: string,
  province: string,
  signal: AbortSignal
): Promise<any[]> {
  try {
    const regionParts = [village, district, city, province].filter(Boolean)
    const contextQuery = `${searchQuery}, ${regionParts.join(', ')}, Indonesia`

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
      signal,
      cache: 'no-store',
    })

    if (!res.ok) return []

    const data = await res.json()
    return data.map((item: any) => transformNominatimResult(item))
  } catch {
    return []
  }
}

// Transform Nominatim result into our standard format
function transformNominatimResult(item: any) {
  const addr = item.address || {}
  const road = addr.road || addr.pedestrian || addr.footway || addr.residential || addr.path || addr.track || ''
  const houseNumber = addr.house_number || ''
  const building = addr.building || addr.amenity || addr.shop || ''
  const neighbourhood = addr.neighbourhood || addr.suburb || addr.hamlet || ''
  const village = addr.village || addr.town || addr.city_district || ''
  const city = addr.city || addr.county || addr.municipality || ''

  return {
    display_name: item.display_name,
    road,
    house_number: houseNumber,
    building,
    neighbourhood,
    village,
    city,
    state: addr.state || '',
    postcode: addr.postcode || '',
    type: item.type || '',
    label: buildLabel(item),
    short_label: buildShortLabel(item),
    source: 'nominatim',
  }
}

function buildShortLabel(item: any): string {
  const addr = item.address || {}
  const parts: string[] = []

  const road = addr.road || addr.pedestrian || addr.footway || addr.residential || addr.path || addr.track || ''
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
  const road = addr.road || addr.pedestrian || addr.footway || addr.residential || addr.path || addr.track || ''
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

// Escape special characters for Overpass QL regex
function escapeOverpass(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Translate OSM highway types to Indonesian labels
function getHighwayTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    motorway: 'Jalan Tol',
    trunk: 'Jalan Utama',
    primary: 'Jalan Primer',
    secondary: 'Jalan Sekunder',
    tertiary: 'Jalan Tersier',
    residential: 'Jalan Perumahan',
    unclassified: 'Jalan',
    living_street: 'Jalan Lingkungan',
    service: 'Jalan Servis',
    track: 'Jalan Setapak',
    path: 'Jalan Setapak',
    footway: 'Jalan Kaki',
    pedestrian: 'Jalan Pejalan Kaki',
    cycleway: 'Jalur Sepeda',
    construction: 'Dalam Pembangunan',
  }
  return labels[type] || ''
}
