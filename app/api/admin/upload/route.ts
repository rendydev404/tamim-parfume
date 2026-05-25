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
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Only image and video files are allowed' },
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

    let finalBuffer: any = buffer
    let filename = ''
    let contentType = ''
    
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)

    if (isImage) {
      // Convert to WebP with optimization
      finalBuffer = await sharp(buffer)
        .webp({ quality: 82 })
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer()
      filename = `${folder}/${timestamp}-${random}.webp`
      contentType = 'image/webp'
    } else if (isVideo) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
      filename = `${folder}/${timestamp}-${random}.${ext}`
      contentType = file.type
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('products')
      .upload(filename, finalBuffer, {
        contentType: contentType,
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
        size: finalBuffer.length,
        originalSize: buffer.length,
        savings: Math.round((1 - finalBuffer.length / buffer.length) * 100),
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
    const body = await request.json()
    const paths: string[] = []

    if (body.paths && Array.isArray(body.paths)) {
      paths.push(...body.paths)
    } else if (body.path) {
      paths.push(body.path)
    }

    if (paths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No path or paths provided' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin.storage
      .from('products')
      .remove(paths)

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
