import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STORE_INFO } from '@/lib/constants'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) {
      console.warn('[Store Settings API] Failed to fetch or no settings found. Falling back to default static constants:', error?.message)
      return NextResponse.json({
        data: {
          name: STORE_INFO.name,
          phone: STORE_INFO.phone,
          address: STORE_INFO.address,
          district: STORE_INFO.district,
          city: STORE_INFO.city,
          province: STORE_INFO.province,
          postal_code: STORE_INFO.postal_code,
          lat: STORE_INFO.lat,
          lng: STORE_INFO.lng,
          biteship_area_id: 'ID1615211011',
          rajaongkir_id: 8174,
          village_code: '76116'
        }
      })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[Store Settings API Exception]:', err.message)
    // Always return a graceful fallback to prevent frontend crashes
    return NextResponse.json({
      data: {
        name: STORE_INFO.name,
        phone: STORE_INFO.phone,
        address: STORE_INFO.address,
        district: STORE_INFO.district,
        city: STORE_INFO.city,
        province: STORE_INFO.province,
        postal_code: STORE_INFO.postal_code,
        lat: STORE_INFO.lat,
        lng: STORE_INFO.lng,
        biteship_area_id: 'ID1615211011',
        rajaongkir_id: 8174,
        village_code: '76116'
      }
    })
  }
}
