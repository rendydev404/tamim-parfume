'use client'

import { useState, useEffect } from 'react'
import { Heart, Loader2, ShoppingBag } from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/product/ProductCard'
import Link from 'next/link'

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist')
      const json = await res.json()
      setItems(json.data || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '24px', paddingBottom: '100px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Heart size={24} style={{ color: 'var(--color-danger)' }} />
          <h1 style={{ fontSize: '1.5rem' }}>Wishlist</h1>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        ) : items.length > 0 ? (
          <>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              {items.length} produk dalam wishlist
            </p>
            <div className="products-grid">
              {items.map((item: any) => {
                const product = item.product
                if (!product) return null
                const primaryImage = product.images?.find((i: any) => i.is_primary)?.url || product.images?.[0]?.url
                return (
                  <ProductCard
                    key={item.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    comparePrice={product.compare_price}
                    image={primaryImage}
                    category={product.category?.name}
                    soldCount={product.sold_count}
                  />
                )
              })}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <Heart size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
            <h3 className="empty-state__title">Wishlist masih kosong</h3>
            <p className="empty-state__description">Tambahkan produk ke wishlist dengan menekan tombol hati</p>
            <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
              <ShoppingBag size={16} />
              Jelajahi Produk
            </Link>
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  )
}
