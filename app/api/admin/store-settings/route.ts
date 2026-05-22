import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, phone, address, district, city, province, postal_code, lat, lng, biteship_area_id, rajaongkir_id, village_code } = body

    if (!address || !lat || !lng) {
      return NextResponse.json({ error: 'Alamat, latitude, dan longitude wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('store_settings')
      .upsert({
        id: 1, // Always row ID 1 to ensure a single singleton config row
        name: name || 'Tamim Parfume',
        phone: phone || '08129000123',
        address,
        district: district || '',
        city: city || '',
        province: province || '',
        postal_code: postal_code || '',
        lat: Number(lat),
        lng: Number(lng),
        biteship_area_id: biteship_area_id || 'ID1615211011',
        rajaongkir_id: Number(rajaongkir_id || 8174),
        village_code: village_code || '76116',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('[Store Settings Update Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[Store Settings Update Exception]:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
