'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Minus, Plus, Check, Zap } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import type { ProductVariant } from '@/lib/types'
import toast from 'react-hot-toast'

interface Props {
  product: {
    id: string
    name: string
    price: number
    image: string | null
    stock: number
    weight: number
  }
  selectedVariant?: ProductVariant | null
  hasVariants?: boolean
}

export default function AddToCartButton({ product, selectedVariant, hasVariants }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const router = useRouter()

  // Determine effective price/stock/weight based on variant
  const effectivePrice = selectedVariant ? selectedVariant.price : product.price
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock
  const effectiveWeight = selectedVariant ? selectedVariant.weight : product.weight

  const handleAdd = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Pilih ukuran terlebih dahulu')
      return
    }

    const cartId = selectedVariant
      ? `${product.id}_${selectedVariant.id}`
      : product.id

    addItem({
      id: cartId,
      product_id: product.id,
      name: product.name,
      price: effectivePrice,
      image: product.image,
      stock: effectiveStock,
      weight: effectiveWeight,
      variant_id: selectedVariant?.id,
      variant_label: selectedVariant?.label,
    }, quantity)

    setAdded(true)
    const label = selectedVariant ? ` (${selectedVariant.label})` : ''
    toast.success(`${product.name}${label} ditambahkan ke keranjang`)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Pilih ukuran terlebih dahulu')
      return
    }

    // Navigate directly to checkout without adding to cart
    const variantParam = selectedVariant ? `&variant_id=${selectedVariant.id}` : ''
    router.push(`/checkout?buy_now=${product.id}&qty=${quantity}${variantParam}`)
  }

  if (effectiveStock <= 0 && !hasVariants) {
    return (
      <button className="btn btn-primary btn-full btn-lg" disabled>
        Stok Habis
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quantity selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Jumlah:</span>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}
          >
            <Minus size={16} />
          </button>
          <span style={{
            width: '48px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            {quantity}
          </span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
            disabled={quantity >= effectiveStock}
            style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className={`btn btn-lg ${added ? 'btn-accent' : 'btn-primary'}`}
          onClick={handleAdd}
          disabled={added}
          style={{ flex: 1 }}
        >
          {added ? (
            <>
              <Check size={18} />
              Ditambahkan!
            </>
          ) : (
            <>
              <ShoppingBag size={18} />
              Keranjang
            </>
          )}
        </button>
        <button
          className="btn btn-accent btn-lg"
          onClick={handleBuyNow}
          style={{ flex: 1 }}
        >
          <Zap size={18} />
         Checkout
        </button>
      </div>
    </div>
  )
}
