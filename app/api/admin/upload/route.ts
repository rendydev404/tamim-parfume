import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// Use service role to bypass RLS for storage uploads
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'products'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Convert to WebP with optimization
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 82 })
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer()

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${folder}/${timestamp}-${random}.webp`

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('products')
      .upload(filename, webpBuffer, {
        contentType: 'image/webp',
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
      .from('products')
      .getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
        size: webpBuffer.length,
        originalSize: buffer.length,
        savings: Math.round((1 - webpBuffer.length / buffer.length) * 100),
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Upload processing failed' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to remove uploaded images
export async function DELETE(request: Request) {
  try {
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'No path provided' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin.storage
      .from('products')
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Delete failed' },
      { status: 500 }
    )
  }
}
