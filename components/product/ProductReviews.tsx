'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2, MessageSquare, Camera, Video, Play } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReviewMedia {
  url: string
  type: 'image' | 'video'
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  images?: string[]
  videos?: string[]
  media?: ReviewMedia[]
  user: {
    full_name: string
    avatar_url: string | null
  } | null
}

interface Props {
  productId: string
  productName: string
}

export default function ProductReviews({ productId, productName }: Props) {
  const searchParams = useSearchParams()
  const orderIdFromUrl = searchParams.get('order_id')

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [canReview, setCanReview] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  // New premium states
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [lightboxMedia, setLightboxMedia] = useState<ReviewMedia[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number>(0)

  useEffect(() => {
    loadReviews()
    checkCanReview()
  }, [])

  // Keyboard events for lightbox navigation & close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxMedia) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevLightboxItem()
      if (e.key === 'ArrowRight') nextLightboxItem()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxMedia])

  const loadReviews = async () => {
    const supabase = createClient()
    
    // Fetch reviews
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, user_id')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      // Fetch user profiles for all reviewers
      const userIds = [...new Set(data.map(r => r.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map(
        (profiles || []).map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      )

      setReviews(data.map(r => {
        let text = r.comment
        let images: string[] = []
        let videos: string[] = []
        try {
          if (r.comment && r.comment.trim().startsWith('{')) {
            const parsed = JSON.parse(r.comment)
            if (parsed && typeof parsed === 'object') {
              text = parsed.text || ''
              images = parsed.images || []
              videos = parsed.videos || []
            }
          }
        } catch (e) {
          // Backward compatibility
          text = r.comment
        }

        // Build unified media array
        const media: ReviewMedia[] = [
          ...images.map(url => ({ url, type: 'image' as const })),
          ...videos.map(url => ({ url, type: 'video' as const })),
        ]

        return {
          id: r.id,
          rating: r.rating,
          comment: text,
          created_at: r.created_at,
          images,
          videos,
          media,
          user: profileMap.get(r.user_id) || null,
        }
      }))
    } else {
      setReviews([])
    }
    setLoading(false)
  }

  const checkCanReview = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    if (orderIdFromUrl) {
      // Specific order_id provided via URL (from "Beri Ulasan" button)
      // Check if this specific order+product combo already has a review
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderIdFromUrl)
        .eq('product_id', productId)
        .maybeSingle()

      if (existingReview) return // Already reviewed for this order

      // Verify this order belongs to the user and is completed
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderIdFromUrl)
        .eq('user_id', user.id)
        .in('status', ['delivered', 'completed'])
        .maybeSingle()

      if (orderData) {
        setReviewOrderId(orderIdFromUrl)
        setCanReview(true)
      }
    } else {
      // No order_id in URL — find the first eligible completed order for this product
      // that hasn't been reviewed yet
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('order_id, order:orders!inner(id, user_id, status)')
        .eq('product_id', productId)

      if (orderItems) {
        // Filter to only delivered/completed orders belonging to this user
        const eligibleItems = orderItems.filter((item: Record<string, any>) => {
          const order = item.order as Record<string, any>
          return order.user_id === user.id &&
                 (order.status === 'delivered' || order.status === 'completed')
        })

        // Check which of these orders already have reviews
        for (const item of eligibleItems) {
          const orderId = item.order_id as string
          const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('order_id', orderId)
            .eq('product_id', productId)
            .maybeSingle()

          if (!existingReview) {
            // Found an order that hasn't been reviewed yet
            setReviewOrderId(orderId)
            setCanReview(true)
            return
          }
        }
      }
    }
  }

  // Client-side Image Compressor
  const compressAndEncodeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Max constraint 800px
          const MAX_SIZE = 800
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width)
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height)
              height = MAX_SIZE
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(e.target?.result as string)
            return
          }
          
          ctx.drawImage(img, 0, 0, width, height)
          
          // Compress to high-quality JPEG (0.75) to minimize database payload size
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75)
          resolve(compressedBase64)
        }
        img.onerror = () => reject(new Error('Gagal memuat gambar'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Gagal membaca file'))
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const newImages = [...uploadedImages]
    if (newImages.length + files.length > 3) {
      toast.error('Maksimal hanya dapat mengunggah 3 foto')
      return
    }
    
    setUploading(true)
    const toastId = toast.loading('Mengompresi dan memproses foto...')
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        // Check initial size (max 10MB limit before processing)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} terlalu besar (maks 10MB)`)
          continue
        }
        const compressed = await compressAndEncodeImage(file)
        newImages.push(compressed)
      }
      setUploadedImages(newImages)
      toast.success('Foto berhasil diproses!', { id: toastId })
    } catch (err) {
      toast.error('Gagal memproses gambar', { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]

    // Validate type
    if (!file.type.startsWith('video/')) {
      toast.error('Hanya file video yang diperbolehkan')
      return
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ukuran video maksimal 50MB')
      return
    }

    setUploading(true)
    const toastId = toast.loading('Mengunggah video...')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setUploadedVideo(result.data.url)
      toast.success('Video berhasil diunggah!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah video', { id: toastId })
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const removeUploadedVideo = () => {
    setUploadedVideo(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !comment.trim() || !reviewOrderId) return
    setSubmitting(true)

    try {
      const supabase = createClient()
      
      // Double check if user has already reviewed this order+product combo
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', reviewOrderId)
        .eq('product_id', productId)
        .maybeSingle()

      if (existing) {
        toast.error('Anda sudah memberikan ulasan untuk produk ini pada pesanan tersebut.')
        setShowForm(false)
        setComment('')
        setUploadedImages([])
        setCanReview(false)
        return
      }

      // Zero-migration solution: save comment, images, and videos serialized in JSON
      const hasMedia = uploadedImages.length > 0 || uploadedVideo
      const commentPayload = hasMedia
        ? JSON.stringify({
            text: comment.trim(),
            images: uploadedImages,
            ...(uploadedVideo ? { videos: [uploadedVideo] } : {}),
          })
        : comment.trim()

      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          order_id: reviewOrderId,
          rating,
          comment: commentPayload,
        })

      if (error) throw error
      toast.success('Ulasan berhasil dikirim!')
      setShowForm(false)
      setComment('')
      setUploadedImages([])
      setUploadedVideo(null)
      setCanReview(false)
      loadReviews()
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengirim ulasan')
    } finally {
      setSubmitting(false)
    }
  }

  // Lightbox controllers
  const openLightbox = (media: ReviewMedia[], index: number) => {
    setLightboxMedia(media)
    setLightboxIndex(index)
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setLightboxMedia(null)
    setLightboxIndex(0)
    document.body.style.overflow = 'unset'
  }

  const prevLightboxItem = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!lightboxMedia) return
    setLightboxIndex(prev => (prev === 0 ? lightboxMedia.length - 1 : prev - 1))
  }

  const nextLightboxItem = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!lightboxMedia) return
    setLightboxIndex(prev => (prev === lightboxMedia.length - 1 ? 0 : prev + 1))
  }

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100
      : 0,
  }))

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Filter reviews client-side
  const filteredReviews = reviews.filter(r => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'media') return (r.media && r.media.length > 0)
    return r.rating === parseInt(activeFilter)
  })

  return (
    <div style={{ marginTop: '40px' }}>
      {/* Scope specific styling */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .review-photo-thumb {
          position: relative;
          transition: all var(--transition-fast) ease;
        }
        .review-photo-thumb:hover {
          transform: scale(1.04);
          filter: brightness(0.95);
        }
        .filter-chip {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 30px;
          cursor: pointer;
          transition: all var(--transition-fast) ease;
          user-select: none;
        }
        .filter-chip:hover {
          opacity: 0.9;
        }
      `}</style>

      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '20px',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <MessageSquare size={20} />
        Ulasan Produk
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* Rating Summary */}
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {/* Average */}
              <div style={{ textAlign: 'center', minWidth: '100px' }}>
                <p style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1 }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : '-'}
                </p>
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', margin: '8px 0' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={16}
                      fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'}
                      color="#f59e0b"
                    />
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {reviews.length} ulasan
                </p>
              </div>

              {/* Distribution */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                {ratingDistribution.map(({ star, count, percentage }) => (
                  <div key={star} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '12px', width: '14px', textAlign: 'right' }}>{star}</span>
                    <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    <div style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '4px',
                      background: 'var(--color-bg-tertiary)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        borderRadius: '4px',
                        background: '#f59e0b',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', width: '20px' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Write Review Button */}
          {canReview && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary btn-sm"
              style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Star size={14} /> Tulis Ulasan
            </button>
          )}

          {/* Review Form */}
          {showForm && (
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
                Tulis Ulasan untuk {productName}
              </h4>
              <form onSubmit={handleSubmit}>
                {/* Star selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                    Rating
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          transition: 'transform 0.1s',
                          transform: (hoverRating >= s || (!hoverRating && rating >= s)) ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <Star
                          size={28}
                          fill={(hoverRating >= s || (!hoverRating && rating >= s)) ? '#f59e0b' : 'none'}
                          color="#f59e0b"
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginLeft: '8px', alignSelf: 'center' }}>
                      {rating === 1 ? 'Buruk' : rating === 2 ? 'Kurang' : rating === 3 ? 'Cukup' : rating === 4 ? 'Bagus' : 'Sangat Bagus'}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Komentar</label>
                  <textarea
                    className="input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ceritakan pengalaman Anda dengan produk ini..."
                    required
                    style={{ minHeight: '100px' }}
                  />
                </div>

                {/* Image Uploader */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} /> Unggah Foto (Maks 3)
                  </label>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Thumbnail previews */}
                    {uploadedImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '1.5px solid var(--color-border)',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <img src={img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(idx)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 'bold',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    
                    {/* Upload button container */}
                    {uploadedImages.length < 3 && (
                      <label
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px dashed var(--color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          background: 'var(--color-bg-secondary)',
                          transition: 'all var(--transition-fast) ease',
                        }}
                      >
                        <span style={{ fontSize: '20px', color: 'var(--color-text-muted)', fontWeight: 300 }}>+</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageChange}
                          disabled={uploading}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Video Uploader */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={16} /> Unggah Video (Maks 1, maks 50MB)
                  </label>
                  
                  {uploadedVideo ? (
                    <div style={{
                      position: 'relative',
                      maxWidth: '240px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: '1.5px solid var(--color-border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <video
                        src={uploadedVideo}
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }}
                        controls
                        muted
                      />
                      <button
                        type="button"
                        onClick={removeUploadedVideo}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        width: '120px',
                        height: '80px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        background: 'var(--color-bg-secondary)',
                        transition: 'all var(--transition-fast) ease',
                        opacity: uploading ? 0.5 : 1,
                      }}
                    >
                      <Play size={18} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Video</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoChange}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || uploading}>
                    {submitting ? (
                      <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mengirim...</>
                    ) : (
                      'Kirim Ulasan'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setUploadedImages([])
                      setUploadedVideo(null)
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Interactive Filtering Chips */}
          {reviews.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                { id: 'all', label: `Semua (${reviews.length})` },
                { id: 'media', label: `Dengan Media (${reviews.filter(r => r.media && r.media.length > 0).length})` },
                ...[5, 4, 3, 2, 1].map(star => ({
                  id: star.toString(),
                  label: `${star} Bintang (${reviews.filter(r => r.rating === star).length})`
                }))
              ].map(chip => {
                const isActive = activeFilter === chip.id
                return (
                  <button
                    key={chip.id}
                    onClick={() => setActiveFilter(chip.id)}
                    className="filter-chip"
                    style={{
                      border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: isActive ? 'var(--color-primary)' : 'var(--color-bg)',
                      color: isActive ? 'var(--color-secondary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Review List */}
          {filteredReviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReviews.map((review) => (
                <div key={review.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    {review.user?.avatar_url ? (
                      <img
                        src={review.user.avatar_url}
                        alt={review.user.full_name}
                        referrerPolicy="no-referrer"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: 'var(--color-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {review.user ? getInitials(review.user.full_name) : '?'}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {review.user?.full_name || 'Pengguna'}
                          <span title="Pembelian Terverifikasi" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              style={{ color: '#16a34a', flexShrink: 0 }}
                            >
                              <title>Pembelian Terverifikasi</title>
                              <path
                                fill="currentColor"
                                d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                              />
                            </svg>
                          </span>
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      {/* Stars */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={13}
                              fill={s <= review.rating ? '#f59e0b' : 'none'}
                              color="#f59e0b"
                            />
                          ))}
                        </div>
                      </div>

                      <p style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                        margin: 0,
                      }}>
                        {review.comment}
                      </p>

                      {/* Premium Review Media Grid (Photos + Videos) */}
                      {review.media && review.media.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                          {review.media.map((item, mediaIdx) => (
                            <div
                              key={mediaIdx}
                              onClick={() => openLightbox(review.media!, mediaIdx)}
                              className="review-photo-thumb"
                              style={{
                                width: item.type === 'video' ? '120px' : '72px',
                                height: '72px',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                cursor: 'zoom-in',
                                border: '1px solid var(--color-border-light)',
                                boxShadow: 'var(--shadow-sm)',
                                position: 'relative',
                              }}
                            >
                              {item.type === 'video' ? (
                                <>
                                  <video
                                    src={item.url}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                    muted
                                    preload="metadata"
                                  />
                                  {/* Play icon overlay */}
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.3)',
                                  }}>
                                    <Play size={24} fill="#fff" color="#fff" />
                                  </div>
                                </>
                              ) : (
                                <img
                                  src={item.url}
                                  alt={`Foto ulasan ${mediaIdx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
            }}>
              <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p>Tidak ada ulasan yang sesuai dengan filter saat ini</p>
            </div>
          )}
        </>
      )}

      {/* Lightbox Modal */}
      {lightboxMedia && lightboxMedia.length > 0 && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 300,
              zIndex: 10001,
            }}
          >
            ✕
          </button>

          {/* Left Navigation */}
          {lightboxMedia.length > 1 && (
            <button
              onClick={prevLightboxItem}
              style={{
                position: 'absolute',
                left: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '24px',
                zIndex: 10000,
              }}
            >
              ‹
            </button>
          )}

          {/* Media Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {lightboxMedia[lightboxIndex].type === 'video' ? (
              <video
                key={lightboxMedia[lightboxIndex].url}
                src={lightboxMedia[lightboxIndex].url}
                controls
                autoPlay
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                  background: '#000',
                }}
              />
            ) : (
              <img
                src={lightboxMedia[lightboxIndex].url}
                alt={`Foto ulasan besar ${lightboxIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                }}
              />
            )}
            {/* Index Counter */}
            <p style={{
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              marginTop: '16px',
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '6px 14px',
              borderRadius: '20px',
              letterSpacing: '1px'
            }}>
              {lightboxIndex + 1} / {lightboxMedia.length}
            </p>
          </div>

          {/* Right Navigation */}
          {lightboxMedia.length > 1 && (
            <button
              onClick={nextLightboxItem}
              style={{
                position: 'absolute',
                right: '24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '24px',
                zIndex: 10000,
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
