import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/product/ProductCard'
import ProductFilters from '@/components/product/ProductFilters'
import { PRODUCTS_PER_PAGE } from '@/lib/constants'
import { Search } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Katalog Parfum',
  description: 'Jelajahi koleksi parfum premium kami. Filter berdasarkan kategori, harga, dan popularitas.',
}

interface Props {
  searchParams: Promise<{
    search?: string
    category?: string
    sort?: string
    page?: string
    min_price?: string
    max_price?: string
  }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const perPage = PRODUCTS_PER_PAGE
  const offset = (page - 1) * perPage

  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*, category:categories(name, slug), images:product_images(url, is_primary)', { count: 'exact' })
    .eq('is_active', true)

  // Search
  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }

  // Category filter
  if (params.category) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', params.category)
      .single()
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  // Price range
  if (params.min_price) {
    query = query.gte('price', parseInt(params.min_price))
  }
  if (params.max_price) {
    query = query.lte('price', parseInt(params.max_price))
  }

  // Sort
  switch (params.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price', { ascending: false })
      break
    case 'popular':
      query = query.order('sold_count', { ascending: false })
      break
    case 'name_asc':
      query = query.order('name', { ascending: true })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  // Pagination
  query = query.range(offset, offset + perPage - 1)

  // Fetch products and categories concurrently
  const [productsRes, categoriesRes] = await Promise.all([
    query,
    supabase.from('categories').select('*').order('sort_order'),
  ])

  const { data: products, count } = productsRes
  const categories = categoriesRes.data
  const totalPages = Math.ceil((count || 0) / perPage)

  return (
    <div className="container" style={{ paddingTop: '24px', paddingBottom: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
          {params.search
            ? `Hasil pencarian "${params.search}"`
            : params.category
              ? `Kategori: ${params.category.charAt(0).toUpperCase() + params.category.slice(1)}`
              : 'Semua Parfum'}
        </h1>
        <p className="text-muted text-sm">
          {count || 0} produk ditemukan
        </p>
      </div>

      {/* Filters */}
      <ProductFilters
        categories={categories || []}
        currentCategory={params.category}
        currentSort={params.sort}
      />

      {/* Product Grid */}
      {products && products.length > 0 ? (
        <>
          <div className="product-grid">
            {products.map((product: Record<string, unknown>) => {
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '32px',
            }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const searchParamsObj = new URLSearchParams()
                if (params.search) searchParamsObj.set('search', params.search)
                if (params.category) searchParamsObj.set('category', params.category)
                if (params.sort) searchParamsObj.set('sort', params.sort)
                searchParamsObj.set('page', p.toString())

                return (
                  <a
                    key={p}
                    href={`/products?${searchParamsObj.toString()}`}
                    className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                  >
                    {p}
                  </a>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Search size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 className="empty-state__title">Produk tidak ditemukan</h3>
          <p className="empty-state__description">
            Coba ubah filter atau kata kunci pencarian Anda
          </p>
        </div>
      )}
    </div>
  )
}
