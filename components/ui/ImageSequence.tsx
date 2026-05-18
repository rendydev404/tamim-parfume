'use client'

import { useEffect, useRef, useCallback } from 'react'

const FRAME_COUNT = 194
const FIRST_FRAME_SRC = '/sequnece/ezgif-frame-001.jpg'

function frameSrc(i: number): string {
  return `/sequnece/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`
}

export default function ImageSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const frames = useRef<(HTMLImageElement | null)[]>(new Array(FRAME_COUNT).fill(null))
  const currentIdx = useRef(0)
  const raf = useRef(0)

  // ---- Preload all frames in background ----
  const preload = useCallback(() => {
    // Load in batches of 6 concurrently, sequential order
    let next = 0
    let active = 0
    const MAX_CONCURRENT = 6

    function kick() {
      while (active < MAX_CONCURRENT && next < FRAME_COUNT) {
        const idx = next++
        if (frames.current[idx]) { continue }
        active++
        const img = new Image()
        img.decoding = 'async'
        img.src = frameSrc(idx)
        img.onload = img.onerror = () => {
          if (img.naturalWidth) frames.current[idx] = img
          active--
          kick()
        }
      }
    }
    kick()
  }, [])

  // ---- Find closest loaded frame ----
  const closest = useCallback((target: number): HTMLImageElement | null => {
    if (frames.current[target]) return frames.current[target]
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (target - d >= 0 && frames.current[target - d]) return frames.current[target - d]
      if (target + d < FRAME_COUNT && frames.current[target + d]) return frames.current[target + d]
    }
    return null
  }, [])

  // ---- Show a frame ----
  const show = useCallback((idx: number) => {
    const el = imgRef.current
    if (!el) return
    const img = closest(idx)
    if (img && el.src !== img.src) el.src = img.src
  }, [closest])

  // ---- Start preloading on mount ----
  useEffect(() => { preload() }, [preload])

  // ---- Scroll-driven frame selection ----
  useEffect(() => {
    const onScroll = () => {
      const c = containerRef.current
      if (!c) return
      const rect = c.getBoundingClientRect()
      const range = rect.height - window.innerHeight
      let p = -rect.top / range
      if (p < 0) p = 0
      if (p > 1) p = 1
      const idx = Math.min(FRAME_COUNT - 1, Math.floor(p * FRAME_COUNT))
      if (idx !== currentIdx.current) {
        currentIdx.current = idx
        cancelAnimationFrame(raf.current)
        raf.current = requestAnimationFrame(() => show(idx))
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
    }
  }, [show])

  return (
    <div ref={containerRef} style={{ height: '400vh', position: 'relative', background: '#000' }}>
      <div style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
        {/* First frame is hardcoded as src — browser renders it instantly, no JS needed */}
        <img
          ref={imgRef}
          src={FIRST_FRAME_SRC}
          alt="TAMIM PARFUME"
          fetchPriority="high"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
