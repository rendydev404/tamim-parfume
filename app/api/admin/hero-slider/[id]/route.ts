import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PUT: Update a single slide
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    const allowedFields = [
      'product_id', 'custom_image_url', 'title', 'subtitle', 'description',
      'cta_text', 'cta_link', 'bg_color_from', 'bg_color_to',
      'accent_color', 'text_color', 'sort_order', 'is_active',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('hero_slides')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update hero slide error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('PUT hero-slider error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE: Delete a slide
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // Get slide info to clean up custom images if any
    const { data: slide } = await supabase
      .from('hero_slides')
      .select('custom_image_url')
      .eq('id', id)
      .single()

    // Delete custom image from storage if it's in our bucket
    if (slide?.custom_image_url && slide.custom_image_url.includes('hero-slider/')) {
      const path = slide.custom_image_url.split('/products/')[1]
      if (path) {
        await supabase.storage.from('products').remove([path])
      }
    }

    // Delete the record
    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete hero slide error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE hero-slider error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
