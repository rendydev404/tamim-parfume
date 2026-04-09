'use client'

import { useState, useEffect } from 'react'
import { X, Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Promo {
  id: string
  title: string
  message: string
  link_url: string | null
  link_text: string
  bg_color: string
  text_color: string
  accent_color: string
}

export default function PromoBanner() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    const dismissed = JSON.parse(sessionStorage.getItem('dismissed_promos') || '[]')
    setDismissedIds(dismissed)

    fetch('/api/admin/promos')
      .then(res => res.json())
      .then(json => {
        setPromos((json.data || []) as Promo[])
      })
      .catch(() => {})
  }, [])

  const dismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    sessionStorage.setItem('dismissed_promos', JSON.stringify(newDismissed))
  }

  const activePromos = promos.filter(p => !dismissedIds.includes(p.id))

  return (
    <>
      {activePromos.map(promo => (
        <div
          key={promo.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '10px 48px 10px 16px',
            background: promo.bg_color,
            color: promo.text_color,
            fontSize: '13px',
            position: 'relative',
          }}
        >
          <Tag size={14} style={{ color: promo.accent_color, flexShrink: 0 }} />
          <span dangerouslySetInnerHTML={{ __html: promo.message }} />
          {promo.link_url && (
            <Link
              href={promo.link_url}
              style={{
                color: promo.accent_color,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {promo.link_text} <ArrowRight size={12} />
            </Link>
          )}
          <button
            onClick={() => dismiss(promo.id)}
            aria-label="Tutup"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: promo.text_color,
              opacity: 0.5,
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </>
  )
}
