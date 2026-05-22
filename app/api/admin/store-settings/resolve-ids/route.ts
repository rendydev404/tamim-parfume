import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveBiteshipAreaId } from '@/lib/biteship'
import { searchDestination } from '@/lib/rajaongkir'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const district = searchParams.get('district') || ''
    const city = searchParams.get('city') || ''
    const province = searchParams.get('province') || ''
    const village = searchParams.get('village') || ''

    console.log(`[Resolve IDs API] Resolving: village=${village}, district=${district}, city=${city}, province=${province}`)

    // 1. Resolve Biteship Area ID
    let biteshipAreaId = 'ID1615211011' // Fallback
    try {
      if (district && city) {
        biteshipAreaId = await resolveBiteshipAreaId({ district, city, province })
      }
    } catch (e: any) {
      console.warn('[Resolve IDs API] Biteship resolution failed:', e.message)
    }

    // 2. Resolve RajaOngkir subdistrict ID
    let rajaongkirId = 8174 // Fallback
    try {
      const query = district || city
      if (query) {
        const dests = await searchDestination(query)
        // Find best match matching the city
        const normalizedCity = city.toLowerCase().replace(/^(kota|kabupaten)\s+/i, '').trim()
        const bestMatch = dests.find(d => {
          const dCity = d.city_name.toLowerCase()
          return dCity.includes(normalizedCity) || normalizedCity.includes(dCity)
        }) || dests[0]

        if (bestMatch) {
          rajaongkirId = bestMatch.id
        }
      }
    } catch (e: any) {
      console.warn('[Resolve IDs API] RajaOngkir resolution failed:', e.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        biteship_area_id: biteshipAreaId,
        rajaongkir_id: rajaongkirId,
        village_code: '76116' // Standard default fallback
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
