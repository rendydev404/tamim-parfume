'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

interface WishlistButtonProps {
  productId: string
  size?: number
  className?: string
}

export default function WishlistButton({ productId, size = 20, className = '' }: WishlistButtonProps) {
  const [isWished, setIsWished] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkWishlist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const checkWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist')
      const json = await res.json()
      const items = json.data || []
      setIsWished(items.some((item: { product_id: string }) => item.product_id === productId))
    } catch {
      // Not logged in or error — ignore
    }
  }

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      })

      if (res.status === 401) {
        toast.error('Silakan login untuk menambahkan ke wishlist')
        return
      }

      const json = await res.json()

      if (json.data?.action === 'added') {
        setIsWished(true)
        toast.success('Ditambahkan ke wishlist')
      } else {
        setIsWished(false)
        toast('Dihapus dari wishlist', { icon: '💔' })
      }
    } catch {
      toast.error('Gagal memperbarui wishlist')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleWishlist}
      disabled={loading}
      className={`wishlist-btn ${isWished ? 'wishlist-btn--active' : ''} ${className}`}
      title={isWished ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
      aria-label={isWished ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
    >
      <Heart
        size={size}
        fill={isWished ? 'var(--color-danger)' : 'none'}
        stroke={isWished ? 'var(--color-danger)' : 'currentColor'}
        style={{ transition: 'all 0.2s ease' }}
      />
    </button>
  )
}
