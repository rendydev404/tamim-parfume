import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BUCKET = 'products'

// POST: Upload a single frame image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const frameNum = formData.get('frameNum') as string
    const sessionId = formData.get('sessionId') as string

    if (!file || !frameNum || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing file, frameNum, or sessionId' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Optimize with sharp
    const optimized = await sharp(buffer)
      .webp({ quality: 78 })
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()

    const filePath = `hero-sequence/${sessionId}/frame-${frameNum}.webp`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, optimized, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      })

    if (uploadError) {
      console.error(`[hero-frame] Upload error frame ${frameNum}:`, uploadError.message)
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    })
  } catch (error) {
    console.error('[hero-frame] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process frame' },
      { status: 500 }
    )
  }
}
