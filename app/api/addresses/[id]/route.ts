import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/addresses/[id] — Update address
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { label, recipient_name, phone, province, city, district, postal_code, full_address, is_default } = body

  // If setting as default, unset others first
  if (is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
  }

  const { data, error } = await supabase
    .from('addresses')
    .update({
      label: label || 'Rumah',
      recipient_name,
      phone,
      province,
      city,
      district: district || '',
      postal_code: postal_code || '',
      full_address,
      is_default: is_default || false,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE /api/addresses/[id] — Delete address
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if this is the default address
  const { data: addr } = await supabase
    .from('addresses')
    .select('is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If we deleted the default, make the most recent one default
  if (addr?.is_default) {
    const { data: remaining } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (remaining && remaining.length > 0) {
      await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', remaining[0].id)
    }
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/addresses/[id] — Set as default
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Unset all defaults
  await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', user.id)

  // Set this one as default
  const { data, error } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
