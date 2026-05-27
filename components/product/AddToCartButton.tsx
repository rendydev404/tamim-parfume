'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Minus, Plus, Check, Zap, Share2, CreditCard } from 'lucide-react'
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

  // Clamp quantity to effective stock when variant changes
  useEffect(() => {
    if (selectedVariant && quantity > selectedVariant.stock) {
      setQuantity(Math.max(1, selectedVariant.stock))
    }
  }, [selectedVariant, quantity])

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

  if (effectiveStock <= 0 && (!hasVariants || selectedVariant)) {
    return (
      <button className="btn btn-primary btn-full btn-lg" disabled style={{ borderRadius: '0px' }}>
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
          style={{ flex: 1, borderRadius: '0px' }}
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
          style={{ flex: 1, borderRadius: '0px' }}
        >
          <CreditCard size={18} />
         Checkout
        </button>
      </div>

      {/* Share Button */}
      <div style={{ marginTop: '4px' }}>
        <button
          className="btn btn-secondary btn-full"
          onClick={async () => {
            const shareTitle = `${product.name} | TAMIM PARFUME`
            const shareText = `✨ *${product.name}* ✨\nUpgrade Your Confidence! Dapatkan parfum premium berkualitas tinggi tahan lama hanya di TAMIM PARFUME.\n\n`
            const shareUrl = window.location.href

            if (navigator.share) {
              try {
                await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl,
                })
                toast.success('Berhasil membagikan!')
                return
              } catch (err) {
                // Silently fallback if cancelled or failed
              }
            }

            // Fallboard copy fallback
            try {
              await navigator.clipboard.writeText(`${shareText}${shareUrl}`)
              toast.success('Link & deskripsi produk disalin ke clipboard!')
            } catch {
              toast.error('Gagal menyalin link produk')
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
          }}
        >
          <Share2 size={16} /> Bagikan Produk
        </button>
      </div>
    </div>
  )
}
