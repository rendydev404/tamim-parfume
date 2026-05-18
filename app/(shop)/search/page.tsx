import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import { Search } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Hasil pencarian "${q}"` : 'Cari Produk',
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() || ''

  const supabase = await createClient()

  let products: any[] = []

  if (query.length >= 2) {
    const { data } = await supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`)
      .order('sold_count', { ascending: false })
      .limit(50)

    products = data || []
  }

  return (
    <>
<main className="container" style={{ paddingTop: '24px', paddingBottom: '100px', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {query ? `Hasil pencarian "${query}"` : 'Cari Produk'}
        </h1>

        {query && (
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
            {products.length} produk ditemukan
          </p>
        )}

        {!query && (
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <Search size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
            <h3 className="empty-state__title">Ketik kata kunci di kolom pencarian</h3>
            <p className="empty-state__description">Cari berdasarkan nama parfum, brand, atau kategori</p>
          </div>
        )}

        {query && products.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <Search size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
            <h3 className="empty-state__title">Produk tidak ditemukan</h3>
            <p className="empty-state__description">Coba kata kunci lain atau jelajahi katalog kami</p>
            <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Lihat Semua Produk
            </Link>
          </div>
        )}

        {products.length > 0 && (
          <div className="products-grid">
            {products.map((product: any) => {
              const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'))
              const nonVidImg = product.images?.find((i: any) => !isVid(i.url))?.url
              const primaryImage = nonVidImg || product.images?.find((i: any) => i.is_primary)?.url || product.images?.[0]?.url
              return (
                <ProductCard
                  key={product.id}
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
        )}
      </main>
</>
  )
}
