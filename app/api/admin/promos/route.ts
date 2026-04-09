import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: List all promos (admin sees all, public sees active only)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  let query = supabase.from('promos').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter by date for non-admin
  let promos = data || []
  if (!isAdmin) {
    const now = new Date()
    promos = promos.filter(p => {
      if (p.start_date && new Date(p.start_date) > now) return false
      if (p.end_date && new Date(p.end_date) <= now) return false
      return true
    })
  }

  return NextResponse.json({ data: promos })
}

// POST: Create promo (admin only)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { title, message, display_type, link_url, link_text, bg_color, text_color, accent_color, is_active, start_date, end_date, priority } = body

  if (!title || !message) {
    return NextResponse.json({ error: 'Judul dan pesan wajib diisi' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('promos')
    .insert({
      title,
      message,
      display_type: display_type || 'banner',
      link_url: link_url || null,
      link_text: link_text || 'Belanja',
      bg_color: bg_color || '#1a1a1a',
      text_color: text_color || '#ffffff',
      accent_color: accent_color || '#d4a574',
      is_active: is_active ?? true,
      start_date: start_date || null,
      end_date: end_date || null,
      priority: priority || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
