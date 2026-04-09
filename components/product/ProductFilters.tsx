'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SORT_OPTIONS } from '@/lib/constants'
import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

interface Props {
  categories: { id: string; name: string; slug: string }[]
  currentCategory?: string
  currentSort?: string
}

export default function ProductFilters({ categories, currentCategory, currentSort }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset pagination on filter change
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Mobile Filter Toggle & Sort */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowFilters(!showFilters)}
          style={{ gap: '6px' }}
        >
          <SlidersHorizontal size={14} />
          Filter
        </button>

        <select
          className="input"
          style={{ flex: 1, padding: '8px 36px 8px 12px', fontSize: '13px' }}
          value={currentSort || 'newest'}
          onChange={(e) => updateFilter('sort', e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category pills */}
      {(showFilters || true) && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          <button
            className={`btn btn-sm ${!currentCategory ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => updateFilter('category', '')}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              className={`btn btn-sm ${currentCategory === cat.slug ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => updateFilter('category', cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
