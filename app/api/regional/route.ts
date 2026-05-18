import { NextRequest, NextResponse } from 'next/server'

// Binderbyte API for Indonesian regional data
const BINDERBYTE_KEY = process.env.BINDERBYTE_API_KEY || ''
const BINDERBYTE_BASE = 'https://api.binderbyte.com/wilayah'

// Fallback: api.co.id
const API_CO_BASE = process.env.API_CO_ID_URL || 'https://use.api.co.id'
const API_CO_KEY = process.env.API_CO_ID_KEY || ''

async function binderFetch(endpoint: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ api_key: BINDERBYTE_KEY, ...params })
  const url = `${BINDERBYTE_BASE}/${endpoint}?${qs.toString()}`
  
  const res = await fetch(url, {
    next: { revalidate: 86400 },
  })
  
  if (!res.ok) {
    throw new Error(`Binderbyte error: ${res.status}`)
  }
  
  const json = await res.json()
  if (!json.result) {
    throw new Error(json.message || 'Binderbyte returned error')
  }
  
  return json.value || []
}

async function apiCoIdFetch(path: string) {
  const res = await fetch(`${API_CO_BASE}${path}`, {
    headers: { 'x-api-co-id': API_CO_KEY },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`api.co.id error: ${res.status}`)
  return res.json()
}

function normalizeItems(items: any[]): { code: string; name: string }[] {
  return items.map(item => ({
    code: item.id || '',
    name: item.name || '',
  }))
}

// GET /api/regional?type=provinces
// GET /api/regional?type=regencies&code=32
// GET /api/regional?type=districts&code=3201
// GET /api/regional?type=villages&code=320101
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  if (!type || !['provinces', 'regencies', 'districts', 'villages'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (type !== 'provinces' && !code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  // ===== Try Binderbyte first =====
  if (BINDERBYTE_KEY && !BINDERBYTE_KEY.includes('YOUR_')) {
    try {
      let data: any[] = []
      switch (type) {
        case 'provinces':
          data = await binderFetch('provinsi')
          break
        case 'regencies':
          data = await binderFetch('kabupaten', { id_provinsi: code! })
          break
        case 'districts':
          data = await binderFetch('kecamatan', { id_kabupaten: code! })
          break
        case 'villages':
          data = await binderFetch('kelurahan', { id_kecamatan: code! })
          break
      }
      const result = normalizeItems(data)
      if (result.length > 0) {
        return NextResponse.json({ data: result, source: 'binderbyte' })
      }
    } catch (err: any) {
      console.log('[Regional] Binderbyte failed:', err.message, '→ trying api.co.id')
    }
  }

  // ===== Fallback: api.co.id =====
  try {
    let data
    switch (type) {
      case 'provinces':
        data = await apiCoIdFetch('/regional/indonesia/provinces')
        break
      case 'regencies':
        data = await apiCoIdFetch(`/regional/indonesia/provinces/${code}/regencies`)
        break
      case 'districts':
        data = await apiCoIdFetch(`/regional/indonesia/regencies/${code}/districts`)
        break
      case 'villages':
        data = await apiCoIdFetch(`/regional/indonesia/districts/${code}/villages`)
        break
    }
    const result = data?.data || data
    return NextResponse.json({ data: result, source: 'api_co_id' })
  } catch (err: any) {
    console.error('[Regional] api.co.id also failed:', err.message)
    return NextResponse.json({ error: 'All regional APIs failed', data: [] }, { status: 500 })
  }
}
