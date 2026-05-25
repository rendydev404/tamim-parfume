'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, Loader2 } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  compare_price: number | null
  image: string | null
}

export default function SearchAutocomplete() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`)
        const json = await res.json()
        setResults(json.data || [])
        setIsOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setIsOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSelect = (slug: string) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/products/${slug}`)
  }

  return (
    <div ref={wrapperRef} className="search-autocomplete">
      <form onSubmit={handleSubmit} className="search-autocomplete__form">
        <Search size={18} className="search-autocomplete__icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari parfum..."
          className="search-autocomplete__input"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {loading && <Loader2 size={16} className="search-autocomplete__spinner" />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }} className="search-autocomplete__clear">
            <X size={16} />
          </button>
        )}
      </form>

      {isOpen && results.length > 0 && (
        <div className="search-autocomplete__dropdown">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.slug)}
              className="search-autocomplete__item"
            >
              <div className="search-autocomplete__item-image">
                {item.image ? (
                  <Image src={item.image} alt={item.name} width={44} height={44} quality={75} style={{ objectFit: 'cover', borderRadius: '8px' }} />
                ) : (
                  <div style={{ width: 44, height: 44, background: 'var(--color-bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                )}
              </div>
              <div className="search-autocomplete__item-info">
                <span className="search-autocomplete__item-name">{item.name}</span>
                <span className="search-autocomplete__item-price">{formatRupiah(item.price)}</span>
              </div>
            </button>
          ))}
          <button
            onClick={() => { setIsOpen(false); router.push(`/search?q=${encodeURIComponent(query)}`) }}
            className="search-autocomplete__viewall"
          >
            Lihat semua hasil untuk &quot;{query}&quot;
          </button>
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="search-autocomplete__dropdown">
          <div className="search-autocomplete__empty">
            Produk tidak ditemukan
          </div>
        </div>
      )}
    </div>
  )
}
