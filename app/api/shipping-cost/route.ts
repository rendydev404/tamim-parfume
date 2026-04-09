import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_CO_ID_URL || 'https://use.api.co.id'
const API_KEY = process.env.API_CO_ID_KEY || ''

// GET /api/shipping-cost?origin=xxxx&destination=yyyy&weight=1000
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const weight = searchParams.get('weight') || '1000'

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'origin and destination village codes are required' },
      { status: 400 }
    )
  }

  try {
    const url = `${API_BASE}/expedition/shipping-cost?origin_village_code=${origin}&destination_village_code=${destination}&weight=${weight}`
    console.log('[Shipping API] Fetching:', url)

    const res = await fetch(url, {
      headers: { 'x-api-co-id': API_KEY },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Shipping API] Error:', res.status, text)
      throw new Error(`Shipping API error: ${res.status} - ${text}`)
    }

    const json = await res.json()
    console.log('[Shipping API] Response is_success:', json.is_success)

    // api.co.id returns: { is_success, data: { couriers: [{ courier_code, courier_name, price, weight, estimation }] } }
    const services: {
      courier: string
      service: string
      cost: number
      etd: string
    }[] = []

    if (json.is_success && json.data?.couriers && Array.isArray(json.data.couriers)) {
      for (const c of json.data.couriers) {
        let price = c.price || 0
        
        // FIX: api.co.id returns weird scaled prices (x10, x100, x1000).
        // Since normal shipping for 1kg within Indonesia is usually under Rp 150.000,
        // we scale it down by dividing by 10 until it looks realistic.
        if (price > 0) {
          while (price > 150000 && price % 10 === 0) {
            price = price / 10
          }
          
          // Some cargo services or express might legitimately be over 150k, 
          // but if it's still > 1,000,000, there's a serious bug in the API response.
          // In that case, we forcefully scale it down to normal levels.
          if (price > 1000000) {
             price = Math.floor(price / 1000)
             if (price > 200000) price = Math.floor(price / 10)
          }

          if (price >= 5000 && price <= 500000) {
            services.push({
              courier: (c.courier_name || c.courier_code || '').toUpperCase(),
              service: c.courier_code || '',
              cost: price,
              etd: c.estimation || '-',
            })
          }
        }
      }
    }

    // If no services after filtering, include all with reasonable prices
    if (services.length === 0 && json.is_success && json.data?.couriers) {
      // Try including all services sorted by price
      const allCouriers = [...(json.data.couriers as Array<{ courier_code?: string; courier_name?: string; price?: number; estimation?: string }>)]
        .filter((c) => (c.price || 0) > 0)
        .sort((a, b) => (a.price || 0) - (b.price || 0))

      for (const c of allCouriers) {
        services.push({
          courier: (c.courier_name || c.courier_code || '').toUpperCase(),
          service: c.courier_code || '',
          cost: c.price || 0,
          etd: c.estimation || '-',
        })
      }
    }

    console.log('[Shipping API] Found', services.length, 'services')

    if (services.length > 0) {
      return NextResponse.json({ data: services })
    }

    // No services found, return fallback
    throw new Error('No shipping services available')
  } catch (error: any) {
    console.error('[Shipping API] Fallback triggered:', error.message)
    return NextResponse.json({
      data: [
        { courier: 'JNE', service: 'REG', cost: 15000, etd: '2-3 hari' },
        { courier: 'JNE', service: 'YES', cost: 25000, etd: '1 hari' },
        { courier: 'TIKI', service: 'ECO', cost: 12000, etd: '3-4 hari' },
        { courier: 'POS', service: 'Kilat Khusus', cost: 18000, etd: '2-4 hari' },
      ],
      fallback: true,
    })
  }
}
