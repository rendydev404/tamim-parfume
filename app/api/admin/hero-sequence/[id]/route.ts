import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BUCKET = 'products'

// PUT: Update sequence (activate/deactivate, rename)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // If activating, deactivate all others first
    if (body.is_active === true) {
      await supabaseAdmin
        .from('hero_sequences')
        .update({ is_active: false })
        .neq('id', id)
    }

    const updateData: Record<string, unknown> = {}
    if (typeof body.is_active === 'boolean') updateData.is_active = body.is_active
    if (body.name) updateData.name = body.name

    const { error } = await supabaseAdmin
      .from('hero_sequences')
      .update(updateData)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT hero-sequence error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE: Delete a specific sequence and its frames
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get sequence info for folder path
    const { data: seq } = await supabaseAdmin
      .from('hero_sequences')
      .select('folder')
      .eq('id', id)
      .single()

    if (seq?.folder) {
      // Delete frames from storage
      const { data: files } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(seq.folder, { limit: 1000 })

      if (files && files.length > 0) {
        const paths = files.map(f => `${seq.folder}/${f.name}`)
        for (let i = 0; i < paths.length; i += 100) {
          await supabaseAdmin.storage
            .from(BUCKET)
            .remove(paths.slice(i, i + 100))
        }
      }
    }

    // Delete the record
    const { error } = await supabaseAdmin
      .from('hero_sequences')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE hero-sequence error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
