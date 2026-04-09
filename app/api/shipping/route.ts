import { NextResponse } from 'next/server'
import { getProvinces, getCities, getShippingCost } from '@/lib/rajaongkir'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'provinces') {
      const data = await getProvinces()
      return NextResponse.json({ success: true, data })
    }

    if (type === 'cities') {
      const provinceId = searchParams.get('province_id')
      if (!provinceId) {
        return NextResponse.json({ success: false, error: 'province_id required' }, { status: 400 })
      }
      const data = await getCities(provinceId)
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Shipping API error:', error)
    return NextResponse.json({ success: false, error: 'API error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { origin, destination, weight, courier } = await request.json()

    if (!origin || !destination || !weight || !courier) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const data = await getShippingCost({ origin, destination, weight, courier })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Shipping cost error:', error)
    return NextResponse.json({ success: false, error: 'API error' }, { status: 500 })
  }
}
