'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatRupiah, discountPercent } from '@/lib/utils'
import { Droplets } from 'lucide-react'
import WishlistButton from './WishlistButton'

interface ProductCardProps {
  id: string
  slug: string
  name: string
  price: number
  comparePrice?: number | null
  image?: string | null
  category?: string
  soldCount?: number
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  comparePrice,
  image,
  category,
  soldCount,
}: ProductCardProps) {
  const discount = comparePrice ? discountPercent(price, comparePrice) : 0

  return (
    <div className="product-card__wrapper">
      <Link href={`/products/${slug}`} className="product-card">
        <div className="product-card__image-wrapper">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={85}
              style={{ objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Droplets size={32} />
            </div>
          )}
          {discount > 0 && (
            <span className="product-card__discount">-{discount}%</span>
          )}
        </div>
        <div className="product-card__body">
          {category && (
            <p className="product-card__category">{category}</p>
          )}
          <h3 className="product-card__name">{name}</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span className="product-card__price">{formatRupiah(price)}</span>
            {comparePrice && comparePrice > price && (
              <span className="product-card__compare-price">
                {formatRupiah(comparePrice)}
              </span>
            )}
          </div>
          {typeof soldCount === 'number' && soldCount > 0 && (
            <p className="product-card__sold">Terjual {soldCount}+</p>
          )}
        </div>
      </Link>
      <WishlistButton productId={id} size={18} className="product-card__wishlist" />
    </div>
  )
}

