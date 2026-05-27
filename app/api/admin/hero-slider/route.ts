import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: List all slides (admin) or active slides only (?active=true)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const activeOnly = request.nextUrl.searchParams.get('active') === 'true'

    let query = supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      // Table might not exist yet
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [] })
      }
      console.error('Error listing hero slides:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('GET hero-slider error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: Create a new slide
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      product_id,
      custom_image_url,
      title,
      subtitle,
      description,
      cta_text,
      cta_link,
      bg_color_from,
      bg_color_to,
      accent_color,
      text_color,
    } = body

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    // Get the max sort_order to append at end
    const { data: maxData } = await supabase
      .from('hero_slides')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxData?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('hero_slides')
      .insert({
        product_id: product_id || null,
        custom_image_url: custom_image_url || null,
        title,
        subtitle: subtitle || null,
        description: description || null,
        cta_text: cta_text || 'Beli Sekarang',
        cta_link: cta_link || null,
        bg_color_from: bg_color_from || '#1a1a2e',
        bg_color_to: bg_color_to || '#0a0a15',
        accent_color: accent_color || '#d4af37',
        text_color: text_color || '#ffffff',
        sort_order: nextOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert hero slide error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('POST hero-slider error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create slide' }, { status: 500 })
  }
}

// PUT: Bulk update sort order
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { items } = body // Array of { id, sort_order }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Items array required' }, { status: 400 })
    }

    for (const item of items) {
      await supabase
        .from('hero_slides')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT hero-slider sort error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 })
  }
}
