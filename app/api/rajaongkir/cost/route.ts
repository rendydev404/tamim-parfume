import { NextRequest, NextResponse } from 'next/server'
import { calculateAllCouriers } from '@/lib/rajaongkir'

// GET /api/rajaongkir/cost?origin=152&destination=444&weight=1000
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = searchParams.get('origin') || ''
  const destination = searchParams.get('destination') || ''
  const weight = parseInt(searchParams.get('weight') || '1000')

  if (!origin || !destination) {
    return NextResponse.json(
      { data: [], error: 'origin and destination are required' },
      { status: 400 }
    )
  }

  try {
    const services = await calculateAllCouriers({
      origin: parseInt(origin),
      destination: parseInt(destination),
      weight: Math.max(weight, 100), // minimum 100 gram
    })

    if (services.length > 0) {
      return NextResponse.json({ data: services, source: 'rajaongkir' })
    }

    // If RajaOngkir returns no results, return fallback
    console.log('[RajaOngkir Cost] No results from API, returning fallback')
    return NextResponse.json({
      data: [
        { courier: 'JNE', service: 'REG', description: 'Layanan Reguler', cost: 15000, etd: '2-3 hari' },
        { courier: 'JNE', service: 'YES', description: 'Yakin Esok Sampai', cost: 25000, etd: '1 hari' },
        { courier: 'TIKI', service: 'ECO', description: 'Economy Service', cost: 12000, etd: '4-5 hari' },
        { courier: 'TIKI', service: 'REG', description: 'Regular Service', cost: 16000, etd: '2-3 hari' },
        { courier: 'POS', service: 'Paket Kilat Khusus', description: 'Pos Indonesia', cost: 18000, etd: '2-4 hari' },
      ],
      source: 'fallback',
    })
  } catch (error: any) {
    console.error('[RajaOngkir Cost] Error:', error.message)
    // Return fallback on error
    return NextResponse.json({
      data: [
        { courier: 'JNE', service: 'REG', description: 'Layanan Reguler', cost: 15000, etd: '2-3 hari' },
        { courier: 'JNE', service: 'YES', description: 'Yakin Esok Sampai', cost: 25000, etd: '1 hari' },
        { courier: 'TIKI', service: 'ECO', description: 'Economy Service', cost: 12000, etd: '4-5 hari' },
        { courier: 'POS', service: 'Paket Kilat Khusus', description: 'Pos Indonesia', cost: 18000, etd: '2-4 hari' },
      ],
      source: 'fallback',
    })
  }
}
