'use client'

import { useState } from 'react'
import { Droplets, ChevronLeft, ChevronRight } from 'lucide-react'

interface GalleryImage {
  url: string
  alt?: string
  is_primary?: boolean
}

interface Props {
  images: GalleryImage[]
  productName: string
  discount?: number
}

export default function ProductGallery({ images, productName, discount }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div style={{
        aspectRatio: '1',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Droplets size={64} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
      </div>
    )
  }

  const goTo = (index: number) => {
    if (index < 0) setActiveIndex(images.length - 1)
    else if (index >= images.length) setActiveIndex(0)
    else setActiveIndex(index)
  }

  return (
    <div>
      {/* Main Image */}
      <div style={{
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--color-bg-secondary)',
      }}>
        <img
          src={images[activeIndex].url}
          alt={images[activeIndex].alt || `${productName} - Foto ${activeIndex + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* Discount badge */}
        {discount && discount > 0 && (
          <span
            className="badge badge-error"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              fontSize: '14px',
              padding: '6px 12px',
            }}
          >
            -{discount}%
          </span>
        )}

        {/* Arrow navigation (only if more than 1 image) */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>

            {/* Image counter */}
            <span style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
            }}>
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: i === activeIndex
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-border)',
                flexShrink: 0,
                padding: 0,
                cursor: 'pointer',
                opacity: i === activeIndex ? 1 : 0.6,
                transition: 'all 0.15s',
                background: 'none',
              }}
            >
              <img
                src={img.url}
                alt={`${productName} thumbnail ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
