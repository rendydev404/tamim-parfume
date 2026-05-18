// ============================================================
// TAMIM PARFUME — RajaOngkir API V2 Client
// Via Komerce Integration: https://rajaongkir.komerce.id/api/v1/
// Docs: https://rajaongkir.com/docs/shipping-cost
// ============================================================

const RAJAONGKIR_KEY = process.env.RAJAONGKIR_API_KEY || ''
const RAJAONGKIR_BASE = 'https://rajaongkir.komerce.id/api/v1'

// Legacy fallback (api.co.id)
const API_CO_KEY = process.env.API_CO_ID_KEY || ''
const API_CO_URL = process.env.API_CO_ID_URL || 'https://use.api.co.id'

export interface ShippingService {
  courier: string
  service: string
  description: string
  cost: number
  etd: string
}

export interface DomesticDestination {
  id: number
  label: string
  province_name: string
  city_name: string
  district_name: string
  subdistrict_name: string
  zip_code: string
}

// ============================================================
// Core API Helper
// ============================================================

async function rajaOngkirFetch(endpoint: string, options?: RequestInit) {
  const url = `${RAJAONGKIR_BASE}${endpoint}`
  console.log(`[RajaOngkir] Calling: ${url}`)

  const res = await fetch(url, {
    ...options,
    headers: {
      'key': RAJAONGKIR_KEY,
      ...(options?.headers || {}),
    },
  })

  const text = await res.text()
  
  if (!res.ok) {
    console.error(`[RajaOngkir] ${endpoint} error:`, res.status, text)
    throw new Error(`RajaOngkir API error: ${res.status} - ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    console.error(`[RajaOngkir] Invalid JSON response from ${endpoint}:`, text.substring(0, 200))
    throw new Error('RajaOngkir returned invalid JSON')
  }
}

// ============================================================
// Search Domestic Destination
// API: GET /destination/domestic-destination?search=keyword
// Returns: { meta: { message, code, status }, data: [...] }
// ============================================================

/**
 * Search domestic destinations by keyword (city, district, subdistrict, zip_code)
 * Used for autocomplete in checkout flow
 */
export async function searchDestination(keyword: string): Promise<DomesticDestination[]> {
  if (!keyword || keyword.trim().length < 2) return []
  
  try {
    const json = await rajaOngkirFetch(
      `/destination/domestic-destination?search=${encodeURIComponent(keyword.trim())}&limit=15&offset=0`
    )

    if (json.meta?.code === 200 && Array.isArray(json.data)) {
      return json.data.map((d: any) => ({
        id: d.id || 0,
        label: d.label || '',
        province_name: d.province_name || '',
        city_name: d.city_name || '',
        district_name: d.district_name || '',
        subdistrict_name: d.subdistrict_name || '',
        zip_code: d.zip_code || '',
      }))
    }

    console.log('[RajaOngkir] Search returned non-200 or no data:', json.meta)
    return []
  } catch (error: any) {
    console.error('[RajaOngkir] searchDestination error:', error.message)
    throw error
  }
}

// ============================================================
// Calculate Domestic Shipping Cost
// API: POST /calculate/domestic-cost
// Body: origin, destination, weight (grams), courier
// Returns: { meta: {...}, data: [{ name, code, service, description, cost, etd }] }
// ============================================================

/**
 * Calculate shipping cost for a single courier
 */
export async function calculateDomesticCost(params: {
  origin: number       // destination ID from search (origin)
  destination: number  // destination ID from search (destination)
  weight: number       // weight in grams
  courier: string      // courier code: jne, jnt, sicepat, anteraja, pos, tiki, etc.
}): Promise<ShippingService[]> {
  const body = new URLSearchParams({
    origin: params.origin.toString(),
    destination: params.destination.toString(),
    weight: params.weight.toString(),
    courier: params.courier.toLowerCase(),
  })

  console.log(`[RajaOngkir] Calculate cost: origin=${params.origin}, dest=${params.destination}, weight=${params.weight}g, courier=${params.courier}`)

  const json = await rajaOngkirFetch('/calculate/domestic-cost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const services: ShippingService[] = []

  // Services to exclude (trucking, cargo, motor delivery — not relevant for small parcels)
  const EXCLUDED_SERVICES = ['JTR', 'JTR<130', 'JTR>130', 'JTR>200', 'TRC', 'T15', 'T25', 'T60', 'BIGPACK', 'SPS']
  const MAX_REASONABLE_COST = 100000 // Max Rp 100.000 for parfum-sized parcels

  if (json.meta?.code === 200 && Array.isArray(json.data)) {
    for (const svc of json.data) {
      const serviceCode = (svc.service || '').toUpperCase()
      
      // Skip excluded services and unreasonably expensive ones
      if (svc.cost > 0 && svc.cost <= MAX_REASONABLE_COST && !EXCLUDED_SERVICES.includes(serviceCode)) {
        services.push({
          courier: (svc.code || svc.name || params.courier).toUpperCase(),
          service: svc.service || '',
          description: svc.description || '',
          cost: svc.cost,
          etd: svc.etd || '-',
        })
      }
    }
  }

  return services
}

/**
 * Calculate shipping for ALL popular couriers simultaneously
 * Supported couriers: jne, tiki, pos, jnt, sicepat, anteraja, ninja, lion, idexpress
 */
export async function calculateAllCouriers(params: {
  origin: number
  destination: number
  weight: number
}): Promise<ShippingService[]> {
  // Most popular couriers in Indonesia
  const couriers = ['jne', 'tiki', 'pos', 'jnt', 'sicepat', 'anteraja', 'ninja', 'lion', 'idexpress']
  
  const results = await Promise.allSettled(
    couriers.map(courier =>
      calculateDomesticCost({
        origin: params.origin,
        destination: params.destination,
        weight: params.weight,
        courier,
      })
    )
  )

  const allServices: ShippingService[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allServices.push(...result.value)
    } else if (result.status === 'rejected') {
      console.log(`[RajaOngkir] Courier ${couriers[i]} failed:`, result.reason?.message || 'unknown')
    }
  }

  // Sort by cost (cheapest first)
  allServices.sort((a, b) => a.cost - b.cost)
  return allServices
}

// ============================================================
// Legacy Komerce destination search (backwards compatibility)
// ============================================================

export async function calculateShippingKomerce(params: {
  originId: number
  destinationId: number
  weight: number
  itemValue: number
}): Promise<ShippingService[]> {
  // Now uses the new V2 API under the hood
  return calculateAllCouriers({
    origin: params.originId,
    destination: params.destinationId,
    weight: params.weight,
  })
}

// ============================================================
// Fallback: api.co.id shipping calculation
// ============================================================

export async function calculateShippingApiCoId(
  originVillageCode: string,
  destinationVillageCode: string,
  weight: number
): Promise<ShippingService[]> {
  const url = `${API_CO_URL}/expedition/shipping-cost?origin_village_code=${originVillageCode}&destination_village_code=${destinationVillageCode}&weight=${weight}`

  const res = await fetch(url, {
    headers: { 'x-api-co-id': API_CO_KEY },
  })

  if (!res.ok) {
    throw new Error(`api.co.id failed: ${res.status}`)
  }

  const json = await res.json()
  const services: ShippingService[] = []

  if (json.is_success && json.data?.couriers && Array.isArray(json.data.couriers)) {
    for (const c of json.data.couriers) {
      let price = c.price || 0
      if (price > 0) {
        while (price > 150000 && price % 10 === 0) {
          price = price / 10
        }
        if (price > 1000000) {
          price = Math.floor(price / 1000)
          if (price > 200000) price = Math.floor(price / 10)
        }
        if (price >= 5000 && price <= 500000) {
          services.push({
            courier: (c.courier_name || c.courier_code || '').toUpperCase(),
            service: c.courier_code || '',
            description: '',
            cost: price,
            etd: c.estimation || '-',
          })
        }
      }
    }
  }

  return services
}
