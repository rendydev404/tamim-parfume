import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatRupiah } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import ProductListActions from './ProductListActions'

export const metadata: Metadata = {
  title: 'Kelola Produk',
}

export default async function AdminProductsPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name), images:product_images(url, is_primary, sort_order)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Kelola Produk</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} /> Tambah Produk
        </Link>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Terjual</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((product) => {
              // Get primary image or first image
              const productImages = (product.images as { url: string; is_primary: boolean; sort_order: number }[]) || []
              const primaryImage = productImages.find(img => img.is_primary) || productImages[0]

              return (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg-secondary)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid var(--color-border-light)',
                      }}>
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={product.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '11px',
                          }}>
                            No img
                          </div>
                        )}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>{product.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {(product.category as Record<string, unknown>)?.name as string || '-'}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{formatRupiah(product.price)}</td>
                  <td style={{ fontSize: '13px' }}>
                    <span style={{ color: product.stock <= 5 ? 'var(--color-error)' : 'var(--color-text)' }}>
                      {product.stock}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{product.sold_count}</td>
                  <td>
                    <span className={`badge ${product.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {product.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <ProductListActions productId={product.id} productName={product.name} />
                  </td>
                </tr>
              )
            })}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
