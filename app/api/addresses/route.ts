import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/addresses — List user's addresses
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/addresses — Create new address
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { label, recipient_name, phone, province, city, district, postal_code, full_address, is_default } = body

  if (!recipient_name || !phone || !province || !city || !full_address) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // If this is set as default, unset other defaults first
  if (is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
  }

  // Check if this is the first address — auto-set as default
  const { count } = await supabase
    .from('addresses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: user.id,
      label: label || 'Rumah',
      recipient_name,
      phone,
      province,
      province_id: '',
      city,
      city_id: '',
      district: district || '',
      postal_code: postal_code || '',
      full_address,
      is_default: is_default || (count === 0),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
