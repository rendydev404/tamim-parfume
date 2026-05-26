import Link from 'next/link'
import { ArrowRight, Sparkles, Shield, Truck, User, Heart, Moon, Stars } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import PromoBanner from '@/components/layout/PromoBanner'
import ImageSequence from '@/components/ui/ImageSequence'

export const revalidate = 60 // ISR: revalidate every 60s

async function getFeaturedProducts() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(name), images:product_images(url, is_primary)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sold_count', { ascending: false })
      .limit(8)
    return data || []
  } catch {
    return []
  }
}

async function getNewProducts() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('products')
      .select('*, category:categories(name), images:product_images(url, is_primary)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)
    return data || []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const supabase = await createClient()

  const [featured, newest, authRes] = await Promise.all([
    getFeaturedProducts(),
    getNewProducts(),
    supabase.auth.getUser(),
  ])

  const user = authRes.data.user

  return (
    <>
      {/* Promo Banner Top */}
      <PromoBanner />

      {/* Hero Image Sequence */}
      <ImageSequence />

      {/* Original Hero converted to Promo Banner Section */}
      <section style={{ 
        background: 'var(--color-bg)', 
        borderBottom: '1px solid var(--color-border-light)',
        padding: '60px 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ 
              color: 'var(--color-accent)', 
              fontWeight: 600, 
              fontSize: '14px', 
              letterSpacing: '0.05em',
              marginBottom: '16px',
              textTransform: 'uppercase'
            }}>
              ✦ Premium Collection
            </p>
            <h2 style={{ 
              fontSize: '2.5rem', 
              marginBottom: '20px', 
              fontFamily: 'var(--font-heading)' 
            }}>
              Temukan Aroma Signature Anda
            </h2>
            <p style={{ 
              color: 'var(--color-text-secondary)', 
              fontSize: '1.1rem', 
              marginBottom: '32px',
              lineHeight: 1.6
            }}>
              Koleksi parfum premium pilihan dari seluruh dunia. 
              Dari Arabian oud hingga designer fragrance, temukan wangi yang mendefinisikan Anda.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/products" className="btn btn-accent btn-lg">
                Jelajahi Koleksi
                <ArrowRight size={18} />
              </Link>
              <Link href="/products?category=arabian" className="btn btn-lg" style={{ 
                background: 'var(--color-bg-secondary)', 
                color: 'var(--color-text)', 
                border: '1px solid var(--color-border-light)' 
              }}>
                Arabian Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* USP Bar */}
      <section style={{ 
        background: 'var(--color-bg-secondary)', 
        borderBottom: '1px solid var(--color-border-light)',
        padding: '20px 0',
      }}>
        <div className="container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '32px', 
            flexWrap: 'wrap',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} />
              <span>100% Original</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} />
              <span>Garansi Keaslian</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={16} />
              <span>Pengiriman Seluruh Indonesia</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section__header">
              <h2 className="section__title">Produk Unggulan</h2>
              <Link href="/products?sort=popular" className="section__link">
                Lihat Semua <ArrowRight size={14} />
              </Link>
            </div>
            <div className="product-grid">
              {featured.map((product: Record<string, unknown>) => {
                const imgs = (product.images as { url: string; is_primary: boolean }[]) || []
                const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'))
                const nonVidImg = imgs.find(i => !isVid(i.url))
                const primaryImg = nonVidImg || imgs.find(i => i.is_primary) || imgs[0]
                return (
                  <ProductCard
                    key={product.id as string}
                    id={product.id as string}
                    slug={product.slug as string}
                    name={product.name as string}
                    price={product.price as number}
                    comparePrice={product.compare_price as number | null}
                    image={primaryImg?.url || (product.image_url as string | null)}
                    category={
                      (product.category as Record<string, unknown>)?.name as string | undefined
                    }
                    soldCount={product.sold_count as number}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Categories CTA */}
      <section style={{ background: 'var(--color-bg-secondary)', padding: '48px 0' }}>
        <div className="container">
          <h2 className="section__title" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Belanja Berdasarkan Kategori
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
          }}>
            {[
              { name: 'Parfum Pria', slug: 'pria', icon: User },
              { name: 'Parfum Wanita', slug: 'wanita', icon: Heart },
              { name: 'Arabian Oud', slug: 'arabian', icon: Moon },
              { name: 'Unisex', slug: 'unisex', icon: Stars },
            ].map((cat) => {
              const Icon = cat.icon
              return (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all var(--transition-base)',
                  textDecoration: 'none',
                }}
                className="card"
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>{cat.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Lihat koleksi →</p>
                </div>
              </Link>
            )})}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      {newest.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section__header">
              <h2 className="section__title">Produk Terbaru</h2>
              <Link href="/products?sort=newest" className="section__link">
                Lihat Semua <ArrowRight size={14} />
              </Link>
            </div>
            <div className="product-grid">
              {newest.map((product: Record<string, unknown>) => {
                const imgs = (product.images as { url: string; is_primary: boolean }[]) || []
                const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'))
                const nonVidImg = imgs.find(i => !isVid(i.url))
                const primaryImg = nonVidImg || imgs.find(i => i.is_primary) || imgs[0]
                return (
                  <ProductCard
                    key={product.id as string}
                    id={product.id as string}
                    slug={product.slug as string}
                    name={product.name as string}
                    price={product.price as number}
                    comparePrice={product.compare_price as number | null}
                    image={primaryImg?.url || (product.image_url as string | null)}
                    category={
                      (product.category as Record<string, unknown>)?.name as string | undefined
                    }
                    soldCount={product.sold_count as number}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner - only show for guests */}
      {!user && (
        <section style={{ 
          background: 'var(--color-primary)', 
          color: 'var(--color-secondary)',
          padding: '48px 0',
          textAlign: 'center',
        }}>
          <div className="container">
            <h2 style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: '1.5rem',
              marginBottom: '12px',
              color: 'var(--color-secondary)',
            }}>
              Bergabunglah dengan TAMIM PARFUME
            </h2>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '14px',
              marginBottom: '24px',
              maxWidth: '480px',
              margin: '0 auto 24px',
            }}>
              Daftar sekarang dan dapatkan akses ke koleksi parfum premium serta penawaran eksklusif.
            </p>
            <Link href="/register" className="btn btn-accent">
              Daftar Sekarang
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
