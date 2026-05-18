import { NextResponse } from 'next/server'
import { getProvinces } from '@/lib/rajaongkir'

// GET /api/rajaongkir/province
export async function GET() {
  try {
    const provinces = await getProvinces()
    return NextResponse.json({ data: provinces })
  } catch (error: any) {
    console.error('[RajaOngkir Province]', error.message)
    return NextResponse.json({ data: [], error: error.message }, { status: 500 })
  }
}
