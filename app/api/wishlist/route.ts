import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabase
    .from('wishlist')
    .select('*, product:products(*, images:product_images(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { product_id } = await request.json()

  if (!product_id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  // Check if already in wishlist
  const { data: existing } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', product_id)
    .single()

  if (existing) {
    // Remove from wishlist
    await supabase.from('wishlist').delete().eq('id', existing.id)
    return NextResponse.json({ data: { action: 'removed' } })
  } else {
    // Add to wishlist
    const { error } = await supabase
      .from('wishlist')
      .insert({ user_id: user.id, product_id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: { action: 'added' } })
  }
}
