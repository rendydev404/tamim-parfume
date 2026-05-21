'use client'

import { useState } from 'react'
import type { ProductVariant } from '@/lib/types'
import { formatRupiah, discountPercent } from '@/lib/utils'
import VariantSelector from '@/components/product/VariantSelector'
import AddToCartButton from '@/components/product/AddToCartButton'

interface Props {
  product: {
    id: string
    name: string
    price: number
    compare_price: number | null
    stock: number
    weight: number
    image: string | null
    short_description: string | null
  }
  variants: ProductVariant[]
}

export default function ProductDetailClient({ product, variants }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  const hasVariants = variants.length > 0

  // Use variant values if selected, otherwise use product defaults
  const displayPrice = selectedVariant ? selectedVariant.price : product.price
  const displayComparePrice = selectedVariant
    ? selectedVariant.compare_price
    : product.compare_price
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock
  const discount = displayComparePrice
    ? discountPercent(displayPrice, displayComparePrice)
    : 0

  return (
    <>
      {/* Price */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700 }}>
            {formatRupiah(displayPrice)}
          </span>
          {displayComparePrice && displayComparePrice > displayPrice && (
            <span style={{
              fontSize: '16px',
              color: 'var(--color-text-muted)',
              textDecoration: 'line-through',
            }}>
              {formatRupiah(displayComparePrice)}
            </span>
          )}
          {discount > 0 && (
            <span className="badge badge-error" style={{ fontSize: '12px' }}>
              -{discount}%
            </span>
          )}
        </div>
      </div>

      {/* Variant Selector */}
      {hasVariants && (
        <div style={{ marginBottom: '20px' }}>
          <VariantSelector
            variants={variants}
            selectedVariant={selectedVariant}
            onSelect={setSelectedVariant}
          />
        </div>
      )}

      {/* Stock */}
      {(!hasVariants || selectedVariant) && (
        <div style={{ marginBottom: '20px' }}>
          {displayStock > 0 ? (
            <span className="badge badge-success">Stok: {displayStock}</span>
          ) : (
            <span className="badge badge-error">Stok Habis</span>
          )}
        </div>
      )}

      {/* Short description */}
      {product.short_description && (
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
          marginBottom: '24px',
        }}>
          {product.short_description}
        </p>
      )}

      {/* Add to Cart */}
      <AddToCartButton
        product={{
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          stock: product.stock,
          weight: product.weight,
        }}
        selectedVariant={selectedVariant}
        hasVariants={hasVariants}
      />
    </>
  )
}
