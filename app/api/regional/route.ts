import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_CO_ID_URL || 'https://use.api.co.id'
const API_KEY = process.env.API_CO_ID_KEY || ''

async function apiCoIdFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-api-co-id': API_KEY },
    next: { revalidate: 86400 }, // Cache for 24h
  })
  if (!res.ok) {
    throw new Error(`api.co.id error: ${res.status}`)
  }
  return res.json()
}

// GET /api/regional?type=provinces
// GET /api/regional?type=regencies&code=11
// GET /api/regional?type=districts&code=1101
// GET /api/regional?type=villages&code=110101
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  try {
    let data

    switch (type) {
      case 'provinces':
        data = await apiCoIdFetch('/regional/indonesia/provinces')
        break
      case 'regencies':
        if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
        data = await apiCoIdFetch(`/regional/indonesia/provinces/${code}/regencies`)
        break
      case 'districts':
        if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
        data = await apiCoIdFetch(`/regional/indonesia/regencies/${code}/districts`)
        break
      case 'villages':
        if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })
        data = await apiCoIdFetch(`/regional/indonesia/districts/${code}/villages`)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // api.co.id returns { is_success, data: [...] }
    // Extract inner data array to avoid double-wrapping
    const result = data?.data || data
    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('Regional API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch regional data' }, { status: 500 })
  }
}
