'use client'

import { useState } from 'react'
import { Tag, Loader2, X, Check } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CouponData {
  coupon_id: string
  code: string
  description: string
  type: string
  value: number
  discount_amount: number
}

interface CouponInputProps {
  subtotal: number
  onApply: (coupon: CouponData) => void
  onRemove: () => void
  appliedCoupon: CouponData | null
}

export default function CouponInput({ subtotal, onApply, onRemove, appliedCoupon }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), subtotal }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Kupon tidak valid')
        return
      }

      onApply(json.data)
      toast.success(`Kupon ${json.data.code} berhasil diterapkan! Hemat ${formatRupiah(json.data.discount_amount)}`)
    } catch {
      toast.error('Gagal memvalidasi kupon')
    } finally {
      setLoading(false)
    }
  }

  if (appliedCoupon) {
    return (
      <div className="coupon-input coupon-input--applied">
        <div className="coupon-input__applied">
          <div className="coupon-input__applied-info">
            <Check size={16} style={{ color: 'var(--color-success)' }} />
            <div>
              <span className="coupon-input__applied-code">{appliedCoupon.code}</span>
              <span className="coupon-input__applied-desc">
                {appliedCoupon.description || `Hemat ${formatRupiah(appliedCoupon.discount_amount)}`}
              </span>
            </div>
          </div>
          <button onClick={onRemove} className="coupon-input__remove" title="Hapus kupon">
            <X size={16} />
          </button>
        </div>
        <div className="coupon-input__discount">
          - {formatRupiah(appliedCoupon.discount_amount)}
        </div>
      </div>
    )
  }

  return (
    <div className="coupon-input">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="coupon-input__toggle">
          <Tag size={16} />
          Punya kode kupon?
        </button>
      ) : (
        <div className="coupon-input__form">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Masukkan kode kupon"
            className="coupon-input__field"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            disabled={loading}
            maxLength={20}
          />
          <button
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="coupon-input__apply"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Terapkan'}
          </button>
        </div>
      )}
    </div>
  )
}
