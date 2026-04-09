import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const limit = parseInt(searchParams.get('limit') || '6')

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
  }

  const supabase = await createClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_price, images:product_images(url, is_primary)')
    .eq('is_active', true)
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,short_description.ilike.%${q}%`)
    .order('sold_count', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = (products || []).map((p) => ({
    ...p,
    image: p.images?.find((i: { is_primary: boolean }) => i.is_primary)?.url || p.images?.[0]?.url || null,
    images: undefined,
  }))

  return NextResponse.json({ data: results })
}
