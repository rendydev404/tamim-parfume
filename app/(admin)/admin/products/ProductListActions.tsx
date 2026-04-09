'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Edit, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  productId: string
  productName: string
}

export default function ProductListActions({ productId, productName }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()

      // Delete product images from DB first
      await supabase.from('product_images').delete().eq('product_id', productId)

      // Delete the product
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) throw error

      toast.success('Produk berhasil dihapus')
      setShowConfirm(false)
      router.refresh()
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err.message || 'Gagal menghapus produk')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Link
          href={`/admin/products/${productId}/edit`}
          className="btn btn-ghost btn-sm"
          style={{ gap: '4px' }}
        >
          <Edit size={14} /> Edit
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="btn btn-ghost btn-sm"
          style={{ gap: '4px', color: 'var(--color-error)' }}
        >
          <Trash2 size={14} /> Hapus
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => !deleting && setShowConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '8px',
                fontFamily: 'var(--font-body)',
              }}>
                Hapus Produk?
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}>
                Apakah kamu yakin ingin menghapus <strong>{productName}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn btn-secondary btn-sm"
                  disabled={deleting}
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-danger btn-sm"
                  disabled={deleting}
                  style={{ gap: '6px' }}
                >
                  {deleting ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Menghapus...</>
                  ) : (
                    <><Trash2 size={14} /> Hapus</>
                  )}
                </button>
              </div>
            </div>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </>
  )
}
