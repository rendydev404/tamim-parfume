'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, AlertTriangle, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface CancelOrderButtonProps {
  orderId: string
  orderStatus: string
}

export default function CancelOrderButton({ orderId, orderStatus }: CancelOrderButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Only show for pending_payment and paid
  if (orderStatus !== 'pending_payment' && orderStatus !== 'paid') return null

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || 'Dibatalkan oleh pembeli' }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error)
      }

      toast.success('Pesanan berhasil dibatalkan')
      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Gagal membatalkan pesanan')
    } finally {
      setLoading(false)
    }
  }

  const reasons = [
    'Ingin mengubah pesanan',
    'Ingin mengganti metode pembayaran',
    'Berubah pikiran',
    'Menemukan harga lebih murah',
    'Salah pilih produk/varian',
  ]

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          border: '1.5px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          color: 'var(--color-error)',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-error)'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-error)'
        }}
      >
        <XCircle size={16} />
        Batalkan Pesanan
      </button>

      {/* Modal */}
      {showModal && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
            onClick={() => !loading && setShowModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '440px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 201,
            padding: '24px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-error)',
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Batalkan Pesanan</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Tindakan ini tidak bisa dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => !loading && setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick reasons */}
            <p style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Pilih alasan:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-full)',
                    border: reason === r ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: reason === r ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                    fontWeight: reason === r ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Custom reason */}
            <textarea
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Atau tulis alasan pembatalan..."
              style={{ minHeight: '60px', resize: 'vertical', fontSize: '13px', marginBottom: '16px' }}
              maxLength={300}
            />

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Kembali
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px',
                  background: 'var(--color-error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Ya, Batalkan
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
