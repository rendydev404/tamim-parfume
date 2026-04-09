import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.code !== undefined) updates.code = body.code.toUpperCase().trim()
  if (body.description !== undefined) updates.description = body.description || null
  if (body.type !== undefined) updates.type = body.type
  if (body.value !== undefined) updates.value = Number(body.value)
  if (body.min_purchase !== undefined) updates.min_purchase = Number(body.min_purchase) || 0
  if (body.max_discount !== undefined) updates.max_discount = body.max_discount ? Number(body.max_discount) : null
  if (body.usage_limit !== undefined) updates.usage_limit = body.usage_limit ? Number(body.usage_limit) : null
  if (body.is_active !== undefined) updates.is_active = body.is_active
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at || null

  const { data, error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
