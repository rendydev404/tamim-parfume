'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// Default local frames config
const DEFAULT_FRAME_COUNT = 194
const DEFAULT_FIRST_FRAME = '/sequnece/ezgif-frame-001.jpg'

function defaultFrameSrc(i: number): string {
  return `/sequnece/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`
}

interface HeroConfig {
  mode: 'default' | 'custom'
  frameCount: number
  firstFrame: string
  getFrameSrc: (i: number) => string
}

export default function ImageSequence() {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const frames = useRef<(HTMLImageElement | null)[]>([])
  const currentIdx = useRef(0)
  const raf = useRef(0)
  const [config, setConfig] = useState<HeroConfig | null>(null)

  // ---- Fetch hero config on mount ----
  useEffect(() => {
    let cancelled = false

    async function fetchConfig() {
      try {
        const res = await fetch('/api/admin/hero-sequence?active=true')
        const json = await res.json()

        if (cancelled) return

        if (json.data && json.data.frame_count && json.data.base_url) {
          // Custom frames from Supabase Storage
          const baseUrl = json.data.base_url
          const frameCount = json.data.frame_count

          setConfig({
            mode: 'custom',
            frameCount,
            firstFrame: `${baseUrl}frame-0001.webp`,
            getFrameSrc: (i: number) => `${baseUrl}frame-${String(i + 1).padStart(4, '0')}.webp`,
          })
        } else {
          // Fallback to default local frames
          setConfig({
            mode: 'default',
            frameCount: DEFAULT_FRAME_COUNT,
            firstFrame: DEFAULT_FIRST_FRAME,
            getFrameSrc: defaultFrameSrc,
          })
        }
      } catch {
        // On error, use default
        if (!cancelled) {
          setConfig({
            mode: 'default',
            frameCount: DEFAULT_FRAME_COUNT,
            firstFrame: DEFAULT_FIRST_FRAME,
            getFrameSrc: defaultFrameSrc,
          })
        }
      }
    }

    fetchConfig()
    return () => { cancelled = true }
  }, [])

  // ---- Preload all frames in background (deferred) ----
  const preload = useCallback((cfg: HeroConfig) => {
    frames.current = new Array(cfg.frameCount).fill(null)
    let next = 0
    let active = 0
    const MAX_CONCURRENT = 3

    function kick() {
      while (active < MAX_CONCURRENT && next < cfg.frameCount) {
        const idx = next++
        if (frames.current[idx]) { continue }
        active++
        const img = new Image()
        img.decoding = 'async'
        img.src = cfg.getFrameSrc(idx)
        img.onload = img.onerror = () => {
          if (img.naturalWidth) frames.current[idx] = img
          active--
          kick()
        }
      }
    }

    // Defer preloading to avoid competing with critical resources
    const startPreload = () => {
      if ('requestIdleCallback' in window) {
        (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(kick)
      } else {
        setTimeout(kick, 100)
      }
    }

    // Wait 2s after page load before starting frame preload
    setTimeout(startPreload, 2000)
  }, [])

  // ---- Find closest loaded frame ----
  const closest = useCallback((target: number): HTMLImageElement | null => {
    const f = frames.current
    if (f[target]) return f[target]
    const len = f.length
    for (let d = 1; d < len; d++) {
      if (target - d >= 0 && f[target - d]) return f[target - d]
      if (target + d < len && f[target + d]) return f[target + d]
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

  // ---- Start preloading when config is ready ----
  useEffect(() => {
    if (config) preload(config)
  }, [config, preload])

  // ---- Scroll-driven frame selection ----
  useEffect(() => {
    if (!config) return

    const frameCount = config.frameCount

    const onScroll = () => {
      const c = containerRef.current
      if (!c) return
      const rect = c.getBoundingClientRect()
      const range = rect.height - window.innerHeight
      let p = -rect.top / range
      if (p < 0) p = 0
      if (p > 1) p = 1
      const idx = Math.min(frameCount - 1, Math.floor(p * frameCount))
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
  }, [config, show])

  // Use default first frame while loading config
  const firstFrameSrc = config?.firstFrame || DEFAULT_FIRST_FRAME

  return (
    <>
      <style>{`
        .seq-container {
          height: 400vh;
          position: relative;
          background: #000;
          width: 100vw;
          margin-left: 50%;
          transform: translateX(-50%);
        }
        .seq-sticky {
          position: sticky;
          top: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        .seq-img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .seq-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%);
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .seq-container {
            height: 300vh;
          }
          .seq-sticky {
            height: 80vh;
          }
        }
      `}</style>
      <div ref={containerRef} className="seq-container">
        <div className="seq-sticky">
          {/* First frame is hardcoded as src — browser renders it instantly, no JS needed */}
          <img
            ref={imgRef}
            src={firstFrameSrc}
            alt="TAMIM PARFUME"
            fetchPriority="high"
            className="seq-img"
          />
          <div className="seq-gradient" />
        </div>
      </div>
    </>
  )
}
