import { NextRequest, NextResponse } from 'next/server'
import { searchDestination } from '@/lib/rajaongkir'

// GET /api/shipping/destination?keyword=bogor
// Uses RajaOngkir V2 domestic-destination search
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword')

  if (!keyword || keyword.trim().length < 2) {
    return NextResponse.json({ data: [] })
  }

  try {
    const results = await searchDestination(keyword.trim())
    return NextResponse.json({ data: results })
  } catch (error: any) {
    console.error('[Destination Search] Error:', error.message)
    // Return 200 with empty data instead of 500 to prevent scary browser console errors
    return NextResponse.json({ data: [] })
  }
}
