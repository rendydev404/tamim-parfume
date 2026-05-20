import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BUCKET = 'products'

// GET: List all sequences, or get active one (?active=true)
export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get('active') === 'true'

    if (activeOnly) {
      const { data, error } = await supabaseAdmin
        .from('hero_sequences')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        if (error.message?.includes('does not exist')) {
          return NextResponse.json({ success: true, data: null })
        }
      }
      return NextResponse.json({ success: true, data: data || null })
    }

    // List all
    const { data, error } = await supabaseAdmin
      .from('hero_sequences')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [] })
      }
      console.error('Error listing sequences:', error)
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('GET hero-sequence error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
}

// POST: Save a new sequence (after frames uploaded)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, frameCount, name } = body

    if (!sessionId || !frameCount) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or frameCount' }, { status: 400 })
    }

    const folderPath = `hero-sequence/${sessionId}`
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(`${folderPath}/frame-0001.webp`)

    const baseUrl = urlData.publicUrl.replace(/frame-\d{4}\.webp$/, '')

    const { data, error } = await supabaseAdmin
      .from('hero_sequences')
      .insert({
        name: name || `Sequence ${new Date().toLocaleDateString('id-ID')}`,
        session_id: sessionId,
        folder: folderPath,
        frame_count: frameCount,
        base_url: baseUrl,
        is_active: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('POST hero-sequence error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 })
  }
}
