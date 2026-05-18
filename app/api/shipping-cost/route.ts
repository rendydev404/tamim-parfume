import { NextRequest, NextResponse } from 'next/server'
import { calculateAllCouriers, calculateShippingApiCoId } from '@/lib/rajaongkir'

// Province zone mapping — grouped by distance from Bogor (Jawa Barat)
// Zone 1: Sama provinsi, Zone 2: Jawa, Zone 3: Sumatera/Bali/NTB
// Zone 4: Kalimantan/Sulawesi/NTT, Zone 5: Papua/Maluku
const PROVINCE_ZONES: Record<string, number> = {
  // Zone 1 - Jawa Barat (same province)
  'jawa barat': 1,
  // Zone 2 - Jawa lainnya + Banten + DKI
  'dki jakarta': 2, 'banten': 2, 'jawa tengah': 2, 'di yogyakarta': 2, 'jawa timur': 2,
  // Zone 3 - Sumatera + Bali + NTB
  'lampung': 3, 'bali': 3, 'sumatera selatan': 3, 'bengkulu': 3, 'jambi': 3,
  'sumatera barat': 3, 'riau': 3, 'kepulauan riau': 3, 'sumatera utara': 3,
  'bangka belitung': 3, 'nusa tenggara barat': 3, 'kepulauan bangka belitung': 3,
  // Zone 4 - Kalimantan + Sulawesi + NTT + Aceh
  'aceh': 4, 'nusa tenggara timur': 4,
  'kalimantan barat': 4, 'kalimantan tengah': 4, 'kalimantan selatan': 4,
  'kalimantan timur': 4, 'kalimantan utara': 4,
  'sulawesi utara': 4, 'sulawesi tengah': 4, 'sulawesi selatan': 4,
  'sulawesi tenggara': 4, 'sulawesi barat': 4, 'gorontalo': 4,
  // Zone 5 - Papua + Maluku
  'maluku': 5, 'maluku utara': 5, 'papua': 5, 'papua barat': 5,
  'papua selatan': 5, 'papua tengah': 5, 'papua pegunungan': 5,
  'papua barat daya': 5,
}

// Base rates per zone per kg (in Rupiah)
const ZONE_RATES = {
  jne: {
    REG: { 1: 9000, 2: 11000, 3: 18000, 4: 26000, 5: 38000 },
    YES: { 1: 14000, 2: 18000, 3: 30000, 4: 42000, 5: 65000 },
    OKE: { 1: 7000, 2: 9000, 3: 15000, 4: 22000, 5: 32000 },
  },
  tiki: {
    ECO: { 1: 7000, 2: 8000, 3: 14000, 4: 20000, 5: 30000 },
    REG: { 1: 10000, 2: 12000, 3: 19000, 4: 28000, 5: 40000 },
    ONS: { 1: 16000, 2: 20000, 3: 35000, 4: 50000, 5: 75000 },
  },
  pos: {
    'Paket Kilat Khusus': { 1: 10000, 2: 12000, 3: 16000, 4: 24000, 5: 35000 },
    'Express Next Day': { 1: 18000, 2: 22000, 3: 35000, 4: 48000, 5: 70000 },
  },
}

const ZONE_ETD: Record<number, Record<string, string>> = {
  1: { REG: '1-2 hari', YES: '1 hari', OKE: '2-3 hari', ECO: '2-3 hari', ONS: '1 hari', 'Paket Kilat Khusus': '2-4 hari', 'Express Next Day': '1 hari' },
  2: { REG: '1-2 hari', YES: '1 hari', OKE: '2-3 hari', ECO: '2-4 hari', ONS: '1 hari', 'Paket Kilat Khusus': '2-4 hari', 'Express Next Day': '1 hari' },
  3: { REG: '2-3 hari', YES: '1-2 hari', OKE: '3-5 hari', ECO: '3-5 hari', ONS: '1-2 hari', 'Paket Kilat Khusus': '3-6 hari', 'Express Next Day': '1-2 hari' },
  4: { REG: '3-5 hari', YES: '2-3 hari', OKE: '4-7 hari', ECO: '4-7 hari', ONS: '2-3 hari', 'Paket Kilat Khusus': '5-8 hari', 'Express Next Day': '2-3 hari' },
  5: { REG: '5-7 hari', YES: '3-4 hari', OKE: '7-10 hari', ECO: '7-12 hari', ONS: '3-5 hari', 'Paket Kilat Khusus': '7-14 hari', 'Express Next Day': '3-5 hari' },
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  REG: 'Layanan Reguler',
  YES: 'Yakin Esok Sampai',
  OKE: 'Ongkos Kirim Ekonomis',
  ECO: 'Economy Service',
  ONS: 'Over Night Service',
  'Paket Kilat Khusus': 'Pos Indonesia Kilat',
  'Express Next Day': 'Pos Indonesia Express',
}

function getZone(provinceName: string): number {
  const normalized = provinceName.toLowerCase().trim()
  return PROVINCE_ZONES[normalized] || 4 // Default zone 4 if unknown
}

function calculateLocalShipping(province: string, weight: number) {
  const zone = getZone(province)
  const weightKg = Math.max(Math.ceil(weight / 1000), 1) // minimum 1kg
  const services: { courier: string; service: string; description: string; cost: number; etd: string }[] = []

  // Add small random variation per request to feel more realistic
  const variation = () => Math.floor(Math.random() * 2000) - 1000 // ±1000

  for (const [courier, courierServices] of Object.entries(ZONE_RATES)) {
    for (const [service, zoneRates] of Object.entries(courierServices)) {
      const baseRate = (zoneRates as Record<number, number>)[zone] || 20000
      const cost = Math.max(baseRate * weightKg + variation(), baseRate) // Never below base
      const etd = ZONE_ETD[zone]?.[service] || '3-5 hari'
      const description = SERVICE_DESCRIPTIONS[service] || ''

      services.push({
        courier: courier.toUpperCase(),
        service,
        description,
        cost: Math.round(cost / 500) * 500, // Round to nearest 500
        etd,
      })
    }
  }

  services.sort((a, b) => a.cost - b.cost)
  return services
}

// GET /api/shipping-cost?origin=XXX&destination=YYY&weight=1000&item_value=100000&province=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const weight = parseInt(searchParams.get('weight') || '1000')
  const province = searchParams.get('province') || ''

  // 1. Primary: RajaOngkir V2 API via Komerce (destination IDs)
  const originId = searchParams.get('origin')
  const destinationId = searchParams.get('destination')

  if (originId && destinationId) {
    try {
      console.log(`[Shipping Cost] Trying RajaOngkir V2: origin=${originId}, dest=${destinationId}, weight=${weight}g`)
      const services = await calculateAllCouriers({
        origin: parseInt(originId),
        destination: parseInt(destinationId),
        weight,
      })
      if (services.length > 0) {
        console.log(`[Shipping Cost] ✅ RajaOngkir V2 returned ${services.length} services`)
        return NextResponse.json({ data: services, source: 'rajaongkir_v2' })
      }
      console.log('[Shipping Cost] RajaOngkir V2 returned 0 services, trying fallback...')
    } catch (error: any) {
      console.log('[Shipping Cost] RajaOngkir V2 failed:', error.message)
    }
  }

  // 2. Fallback: api.co.id village codes
  const originVillage = searchParams.get('origin_village') || ''
  const destinationVillage = searchParams.get('destination_village') || ''

  if (originVillage && destinationVillage) {
    try {
      const services = await calculateShippingApiCoId(originVillage, destinationVillage, weight)
      if (services.length > 0) {
        return NextResponse.json({ data: services, source: 'api_co_id' })
      }
    } catch (error: any) {
      console.error('[Shipping Cost] api.co.id also failed:', error.message)
    }
  }

  // 3. Smart local calculation based on province + weight
  if (province) {
    const services = calculateLocalShipping(province, weight)
    return NextResponse.json({ data: services, source: 'calculated' })
  }

  // Final fallback: default prices (Zone 3 average)
  const services = calculateLocalShipping('sumatera selatan', weight) // Use zone 3 as default
  return NextResponse.json({ data: services, source: 'default' })
}
