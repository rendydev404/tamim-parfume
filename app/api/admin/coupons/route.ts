import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { code, description, type, value, min_purchase, max_discount, usage_limit, is_active, expires_at } = body

  if (!code || !type || !value) {
    return NextResponse.json({ error: 'Code, type, dan value wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: code.toUpperCase().trim(),
      description: description || null,
      type,
      value: Number(value),
      min_purchase: Number(min_purchase) || 0,
      max_discount: max_discount ? Number(max_discount) : null,
      usage_limit: usage_limit ? Number(usage_limit) : null,
      is_active: is_active ?? true,
      expires_at: expires_at || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
