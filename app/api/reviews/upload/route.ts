import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS for storage uploads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Only image and video files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (images max 10MB, videos max 50MB)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `File size must be less than ${isVideo ? '50MB' : '10MB'}` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'webp')
    const filename = `reviews/${timestamp}-${random}.${ext}`
    const contentType = file.type

    // Upload to Supabase Storage (bucket: reviews)
    const { data, error } = await supabaseAdmin.storage
      .from('reviews')
      .upload(filename, buffer, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${error.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('reviews')
      .getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
        type: isVideo ? 'video' : 'image',
        size: buffer.length,
      },
    })
  } catch (error) {
    console.error('Review upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Upload processing failed' },
      { status: 500 }
    )
  }
}
