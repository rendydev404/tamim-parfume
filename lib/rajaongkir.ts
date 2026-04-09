// ============================================================
// TAMIM PARFUME — RajaOngkir API Helper
// ============================================================

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || ''
const RAJAONGKIR_API_URL = process.env.RAJAONGKIR_API_URL || 'https://api.rajaongkir.com/starter'

/**
 * Get all provinces
 */
export async function getProvinces() {
  const res = await fetch(`${RAJAONGKIR_API_URL}/province`, {
    headers: { key: RAJAONGKIR_API_KEY },
    next: { revalidate: 86400 }, // Cache 24h
  })

  if (!res.ok) throw new Error('Failed to fetch provinces')
  const json = await res.json()
  return json.rajaongkir.results
}

/**
 * Get cities by province ID
 */
export async function getCities(provinceId: string) {
  const res = await fetch(
    `${RAJAONGKIR_API_URL}/city?province=${provinceId}`,
    {
      headers: { key: RAJAONGKIR_API_KEY },
      next: { revalidate: 86400 },
    }
  )

  if (!res.ok) throw new Error('Failed to fetch cities')
  const json = await res.json()
  return json.rajaongkir.results
}

/**
 * Calculate shipping cost
 */
export async function getShippingCost(params: {
  origin: string
  destination: string
  weight: number // grams
  courier: string
}) {
  const res = await fetch(`${RAJAONGKIR_API_URL}/cost`, {
    method: 'POST',
    headers: {
      key: RAJAONGKIR_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      weight: params.weight.toString(),
      courier: params.courier,
    }),
  })

  if (!res.ok) throw new Error('Failed to calculate shipping cost')
  const json = await res.json()
  return json.rajaongkir.results
}
