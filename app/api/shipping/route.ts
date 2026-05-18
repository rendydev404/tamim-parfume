import { NextResponse } from 'next/server'
import { searchDestination } from '@/lib/rajaongkir'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'search') {
      const keyword = searchParams.get('keyword') || ''
      if (keyword.length < 2) {
        return NextResponse.json({ success: true, data: [] })
      }
      const data = await searchDestination(keyword)
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: 'Invalid type. Use type=search' }, { status: 400 })
  } catch (error) {
    console.error('Shipping API error:', error)
    return NextResponse.json({ success: false, error: 'API error' }, { status: 500 })
  }
}
