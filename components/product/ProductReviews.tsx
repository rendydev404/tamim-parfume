'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Loader2, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
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
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [canReview, setCanReview] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  useEffect(() => {
    loadReviews()
    checkCanReview()
  }, [])

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

      setReviews(data.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        user: profileMap.get(r.user_id) || null,
      })))
    }
    setLoading(false)
  }

  const checkCanReview = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Check if user has already reviewed this product
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingReview) return // Already reviewed

    // Check if user has a completed/delivered order with this product
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('id, order:orders!inner(user_id, status)')
      .eq('product_id', productId)

    if (orderItems) {
      const hasDelivered = orderItems.some((item: Record<string, unknown>) => {
        const order = item.order as Record<string, unknown>
        return order.user_id === user.id && 
               (order.status === 'delivered' || order.status === 'completed')
      })
      setCanReview(hasDelivered)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !comment.trim()) return
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          rating,
          comment: comment.trim(),
        })

      if (error) throw error
      toast.success('Ulasan berhasil dikirim!')
      setShowForm(false)
      setComment('')
      setCanReview(false)
      loadReviews()
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err.message || 'Gagal mengirim ulasan')
    } finally {
      setSubmitting(false)
    }
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

  return (
    <div style={{ marginTop: '40px' }}>
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
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
              style={{ marginBottom: '16px' }}
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

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mengirim...</>
                    ) : (
                      'Kirim Ulasan'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Review List */}
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((review) => (
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
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          {review.user?.full_name || 'Pengguna'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      {/* Stars */}
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={13}
                            fill={s <= review.rating ? '#f59e0b' : 'none'}
                            color="#f59e0b"
                          />
                        ))}
                      </div>

                      <p style={{
                        fontSize: '13px',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                        margin: 0,
                      }}>
                        {review.comment}
                      </p>
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
              <p>Belum ada ulasan untuk produk ini</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
