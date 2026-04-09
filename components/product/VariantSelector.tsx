'use client'

import { useState } from 'react'
import type { ProductVariant } from '@/lib/types'
import { formatRupiah, discountPercent } from '@/lib/utils'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onSelect: (variant: ProductVariant) => void
}

export default function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  if (!variants || variants.length === 0) return null

  const activeVariants = variants
    .filter(v => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  if (activeVariants.length === 0) return null

  return (
    <div className="variant-selector">
      <p className="variant-selector__label">Pilih Ukuran</p>
      <div className="variant-selector__grid">
        {activeVariants.map((variant) => {
          const isSelected = selectedVariant?.id === variant.id
          const outOfStock = variant.stock <= 0
          const discount = variant.compare_price ? discountPercent(variant.price, variant.compare_price) : 0

          return (
            <button
              key={variant.id}
              onClick={() => !outOfStock && onSelect(variant)}
              disabled={outOfStock}
              className={`variant-selector__item ${isSelected ? 'variant-selector__item--active' : ''} ${outOfStock ? 'variant-selector__item--disabled' : ''}`}
            >
              <span className="variant-selector__item-label">{variant.label}</span>
              <span className="variant-selector__item-price">{formatRupiah(variant.price)}</span>
              {discount > 0 && (
                <span className="variant-selector__item-discount">-{discount}%</span>
              )}
              {outOfStock && (
                <span className="variant-selector__item-oos">Habis</span>
              )}
              {variant.stock > 0 && variant.stock <= 5 && (
                <span className="variant-selector__item-low">Sisa {variant.stock}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
