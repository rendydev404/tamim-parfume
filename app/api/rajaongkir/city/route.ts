import { NextRequest, NextResponse } from 'next/server'
import { getCities, getCityById } from '@/lib/rajaongkir'

// GET /api/rajaongkir/city
// GET /api/rajaongkir/city?province=5
// GET /api/rajaongkir/city?id=501
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const provinceId = searchParams.get('province')
  const cityId = searchParams.get('id')

  try {
    if (cityId) {
      const city = await getCityById(cityId)
      return NextResponse.json({ data: city ? [city] : [] })
    }

    const cities = await getCities(provinceId || undefined)
    return NextResponse.json({ data: cities })
  } catch (error: any) {
    console.error('[RajaOngkir City]', error.message)
    return NextResponse.json({ data: [], error: error.message }, { status: 500 })
  }
}
