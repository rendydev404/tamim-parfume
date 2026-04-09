import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { discountPercent } from '@/lib/utils'
import ProductCard from '@/components/product/ProductCard'
import ProductGallery from '@/components/product/ProductGallery'
import ProductReviews from '@/components/product/ProductReviews'
import ProductDetailClient from '@/components/product/ProductDetailClient'
import type { ProductVariant } from '@/lib/types'
import type { Metadata } from 'next'
import { ShieldCheck, Truck, RotateCcw, Star } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, short_description')
    .eq('slug', slug)
    .single()

  if (!product) return { title: 'Produk Tidak Ditemukan' }

  return {
    title: product.name,
    description: product.short_description || `Beli ${product.name} di TAMIM PARFUME`,
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), images:product_images(*)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) notFound()

  // Fetch product variants
  const { data: variantsData } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('sort_order')

  const variants: ProductVariant[] = (variantsData || []) as ProductVariant[]

  const discount = product.compare_price
    ? discountPercent(product.price, product.compare_price)
    : 0

  // Get real rating from reviews
  const { data: reviewStats } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', product.id)

  const reviewCount = reviewStats?.length || 0
  const avgRating = reviewCount > 0
    ? reviewStats!.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviewCount
    : 0

  // Related products
  const { data: related } = await supabase
    .from('products')
    .select('*, category:categories(name), images:product_images(url, is_primary)')
    .eq('is_active', true)
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .limit(4)

  // Sort images: primary first
  const sortedImages = [...(product.images || [])].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    if (a.is_primary) return -1
    if (b.is_primary) return 1
    return (a.sort_order as number) - (b.sort_order as number)
  })

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '40px' }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
        <a href="/" style={{ color: 'var(--color-text-secondary)' }}>Home</a>
        {' / '}
        <a href="/products" style={{ color: 'var(--color-text-secondary)' }}>Produk</a>
        {product.category && (
          <>
            {' / '}
            <a
              href={`/products?category=${(product.category as Record<string, string>).slug}`}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {(product.category as Record<string, string>).name}
            </a>
          </>
        )}
        {' / '}
        <span>{product.name}</span>
      </nav>

      {/* Product Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '32px',
      }}>
        <style>{`
          @media (min-width: 768px) {
            .product-detail-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}</style>
        <div className="product-detail-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '32px',
        }}>
          {/* Image Gallery */}
          <ProductGallery
            images={sortedImages.map((img: Record<string, unknown>) => ({
              url: img.url as string,
              alt: `${product.name}`,
              is_primary: img.is_primary as boolean,
            }))}
            productName={product.name}
            discount={discount}
          />

          {/* Info Section */}
          <div>
            {product.category && (
              <p style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}>
                {(product.category as Record<string, string>).name}
              </p>
            )}
            <h1 style={{ fontSize: '1.75rem', marginBottom: '12px', lineHeight: 1.2 }}>
              {product.name}
            </h1>

            {/* Real Star Rating */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'} color="#f59e0b" />
              ))}
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                {avgRating > 0 ? `${avgRating.toFixed(1)} ` : ''}
                ({reviewCount} ulasan · {product.sold_count} terjual)
              </span>
            </div>

            {/* Client-side: Price, Variants, Stock, Description, Add to Cart */}
            <ProductDetailClient
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                compare_price: product.compare_price,
                stock: product.stock,
                weight: product.weight,
                image: sortedImages[0]?.url || null,
                short_description: product.short_description,
              }}
              variants={variants}
            />

            {/* Trust badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '24px',
              padding: '16px',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={20} style={{ margin: '0 auto 4px', color: 'var(--color-text-secondary)' }} />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Original</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Truck size={20} style={{ margin: '0 auto 4px', color: 'var(--color-text-secondary)' }} />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Kirim Cepat</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <RotateCcw size={20} style={{ margin: '0 auto 4px', color: 'var(--color-text-secondary)' }} />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Garansi</p>
              </div>
            </div>

            {/* Full description */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Deskripsi Produk
              </h3>
              <div style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.8,
                whiteSpace: 'pre-line',
              }}>
                {product.description}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* Related Products */}
      {related && related.length > 0 && (
        <section style={{ marginTop: '48px' }}>
          <h2 className="section__title" style={{ marginBottom: '20px' }}>Produk Serupa</h2>
          <div className="product-grid">
            {related.map((p: Record<string, unknown>) => {
              const imgs = (p.images as { url: string; is_primary: boolean }[]) || []
              const primaryImg = imgs.find(i => i.is_primary) || imgs[0]
              return (
                <ProductCard
                  key={p.id as string}
                  id={p.id as string}
                  slug={p.slug as string}
                  name={p.name as string}
                  price={p.price as number}
                  comparePrice={p.compare_price as number | null}
                  image={primaryImg?.url || (p.image_url as string | null)}
                  category={(p.category as Record<string, unknown>)?.name as string | undefined}
                  soldCount={p.sold_count as number}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
