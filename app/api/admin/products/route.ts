import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, slug, price, is_active, images:product_images(url, is_primary)')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching products for slider dropdown:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Format products to extract primary image url
    const formatted = (products || []).map((p) => {
      const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'))
      const productImages = (p.images as { url: string; is_primary: boolean }[]) || []
      const nonVidImg = productImages.find((img) => !isVid(img.url))
      const primaryImage = nonVidImg || productImages.find((img) => img.is_primary) || productImages[0]
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        is_active: p.is_active,
        image_url: primaryImage?.url || null
      }
    })

    return NextResponse.json({ success: true, data: formatted })
  } catch (error) {
    console.error('GET admin products error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}
