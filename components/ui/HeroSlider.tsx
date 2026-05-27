'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface HeroSlide {
  id: string
  product_id: string | null
  custom_image_url: string | null
  title: string
  subtitle: string | null
  description: string | null
  cta_text: string
  cta_link: string | null
  bg_color_from: string
  bg_color_to: string
  accent_color: string
  text_color: string
  sort_order: number
  is_active: boolean
  // Joined product image (from server)
  product_image?: string | null
}

interface HeroSliderProps {
  slides: HeroSlide[]
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const AUTOPLAY_DELAY = 5000
  const TRANSITION_DURATION = 700

  // Get image URL for a slide
  const getSlideImage = useCallback((slide: HeroSlide): string => {
    if (slide.custom_image_url) return slide.custom_image_url
    if (slide.product_image) return slide.product_image
    return '/og-image.png' // fallback
  }, [])

  // Navigate to slide
  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === activeIndex) return
    setIsTransitioning(true)
    setActiveIndex(index)
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION)
  }, [isTransitioning, activeIndex])

  const goNext = useCallback(() => {
    const next = (activeIndex + 1) % slides.length
    goToSlide(next)
  }, [activeIndex, slides.length, goToSlide])

  const goPrev = useCallback(() => {
    const prev = (activeIndex - 1 + slides.length) % slides.length
    goToSlide(prev)
  }, [activeIndex, slides.length, goToSlide])

  // Autoplay
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return

    autoplayRef.current = setInterval(() => {
      goNext()
    }, AUTOPLAY_DELAY)

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current)
    }
  }, [slides.length, isPaused, goNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchDelta(0)
    setIsPaused(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    setTouchDelta(e.touches[0].clientX - touchStart)
  }

  const handleTouchEnd = () => {
    if (touchStart === null) return
    if (touchDelta < -50) goNext()
    else if (touchDelta > 50) goPrev()
    setTouchStart(null)
    setTouchDelta(0)
    setIsPaused(false)
  }

  if (!slides || slides.length === 0) {
    return (
      <section className="hero-slider-empty">
        <div className="hero-slider-empty__content">
          <h1 style={{ fontSize: '1.25rem', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
            TAMIM PARFUME
          </h1>
          <p style={{ fontSize: '10px', letterSpacing: '0.3em', opacity: 0.5, textTransform: 'uppercase', marginTop: '8px' }}>
            Premium Fragrance Collection
          </p>
        </div>
      </section>
    )
  }

  const currentSlide = slides[activeIndex]

  return (
    <>
      <style>{`
        .hero-slider {
          position: relative;
          width: 100vw;
          margin-left: 50%;
          transform: translateX(-50%);
          height: 100vh;
          min-height: 600px;
          max-height: 900px;
          overflow: hidden;
          user-select: none;
        }

        /* Background layers for crossfade */
        .hero-slider__bg {
          position: absolute;
          inset: 0;
          transition: opacity 0.8s ease-in-out;
          z-index: 0;
        }
        .hero-slider__bg::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.15);
        }

        /* Main content layout */
        .hero-slider__content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
          gap: 40px;
        }

        /* Product image area - LEFT side */
        .hero-slider__image-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          height: 100%;
          min-width: 0;
        }

        .hero-slider__image-track {
          display: block;
          position: relative;
          width: 100%;
          height: 100%;
        }

        .hero-slider__slide-item {
          position: absolute;
          transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
          cursor: pointer;
          overflow: visible;
          background: transparent;
        }

        .hero-slider__slide-item img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.45));
          transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* Active slide - elegant -8deg tilt animation */
        .hero-slider__slide-item--active {
          z-index: 10;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1) rotate(-8deg);
          width: 420px;
          height: 420px;
          filter: brightness(1) blur(0);
          opacity: 1;
        }

        /* Previous slide - Samping atas kiri (Top-left, pulled closer, blurred) */
        .hero-slider__slide-item--prev {
          z-index: 5;
          left: 22%;
          top: 22%;
          transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          width: 420px;
          height: 420px;
          filter: brightness(0.45) blur(8px);
          opacity: 0.45;
        }

        /* Next slide - Samping kiri bawah (Bottom-left, pulled closer, blurred) */
        .hero-slider__slide-item--next {
          z-index: 5;
          left: 22%;
          top: 78%;
          transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          width: 420px;
          height: 420px;
          filter: brightness(0.45) blur(8px);
          opacity: 0.45;
        }

        /* Hidden slides */
        .hero-slider__slide-item--hidden {
          z-index: 1;
          left: 22%;
          top: 50%;
          transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          width: 420px;
          height: 420px;
          opacity: 0;
          pointer-events: none;
        }

        /* Text area - RIGHT side */
        .hero-slider__text-area {
          flex: 0 0 420px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-right: 20px;
        }

        .hero-slider__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          margin-bottom: 20px;
          width: fit-content;
        }

        .hero-slider__title {
          font-family: inherit;
          font-size: 3rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }

        .hero-slider__title-enter {
          animation: heroTextSlideUp 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }

        .hero-slider__subtitle {
          font-size: 1.1rem;
          opacity: 0.7;
          margin-bottom: 16px;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        .hero-slider__subtitle-enter {
          animation: heroTextSlideUp 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s forwards;
          opacity: 0;
        }

        .hero-slider__description {
          font-size: 0.95rem;
          line-height: 1.7;
          opacity: 0.55;
          margin-bottom: 28px;
          max-width: 380px;
        }

        .hero-slider__description-enter {
          animation: heroTextSlideUp 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s forwards;
          opacity: 0;
        }

        .hero-slider__cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 36px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          width: fit-content;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .hero-slider__cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          filter: brightness(1.1);
        }

        .hero-slider__cta-enter {
          animation: heroTextSlideUp 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.3s forwards;
          opacity: 0;
        }

        @keyframes heroTextSlideUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Navigation arrows */
        .hero-slider__nav {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hero-slider__nav-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .hero-slider__nav-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          transform: scale(1.1);
        }

        /* Dot indicators */
        .hero-slider__dots {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .hero-slider__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          cursor: pointer;
          transition: all 0.4s ease;
          padding: 0;
        }

        .hero-slider__dot--active {
          width: 28px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.9);
        }

        /* Progress bar on active dot */
        .hero-slider__dot--active::after {
          content: '';
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 10px;
          background: #fff;
          animation: dotProgress ${AUTOPLAY_DELAY}ms linear;
        }

        @keyframes dotProgress {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); transform-origin: left; }
        }

        /* Floating particles effect */
        .hero-slider__particles {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .hero-slider__particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          animation: particleFloat 8s ease-in-out infinite;
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          50% { transform: translateY(-120px) translateX(30px); }
        }

        /* Empty state */
        .hero-slider-empty {
          width: 100vw;
          margin-left: 50%;
          transform: translateX(-50%);
          height: 70vh;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          color: #fff;
        }

        .hero-slider-empty__content {
          text-align: center;
          opacity: 0.8;
        }

        /* =================== RESPONSIVE =================== */
        @media (max-width: 1024px) {
          .hero-slider {
            height: auto;
            min-height: unset;
            max-height: unset;
          }

          .hero-slider__content {
            flex-direction: column;
            padding: 100px 24px 100px;
            gap: 24px;
            text-align: center;
          }

          .hero-slider__text-area {
            flex: unset;
            width: 100%;
            padding-right: 0;
            align-items: center;
            order: 1;
          }

          .hero-slider__image-area {
            flex: unset;
            width: 100%;
            height: 360px;
            order: 2;
          }

          .hero-slider__title {
            font-size: 2rem;
          }

          .hero-slider__description {
            max-width: 100%;
          }

          .hero-slider__badge {
            margin-left: auto;
            margin-right: auto;
          }

          .hero-slider__slide-item--active {
            width: 280px;
            height: 280px;
            transform: translate(-50%, -50%) scale(1) rotate(-8deg);
          }

          .hero-slider__slide-item--prev {
            width: 280px;
            height: 280px;
            left: 22%;
            top: 22%;
            transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          }

          .hero-slider__slide-item--next {
            width: 280px;
            height: 280px;
            left: 22%;
            top: 78%;
            transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          }

          .hero-slider__slide-item--hidden {
            width: 280px;
            height: 280px;
            left: 22%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          }

          .hero-slider__nav {
            bottom: 16px;
          }
        }

        @media (max-width: 640px) {
          .hero-slider__content {
            padding: 80px 16px 80px;
          }

          .hero-slider__title {
            font-size: 1.6rem;
          }

          .hero-slider__subtitle {
            font-size: 0.95rem;
          }

          .hero-slider__image-area {
            height: 300px;
          }

          .hero-slider__slide-item--active {
            width: 220px;
            height: 220px;
            transform: translate(-50%, -50%) scale(1) rotate(-8deg);
          }

          .hero-slider__slide-item--prev {
            width: 220px;
            height: 220px;
            left: 22%;
            top: 22%;
            transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          }

          .hero-slider__slide-item--next {
            width: 220px;
            height: 220px;
            left: 22%;
            top: 78%;
            transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
          }

          .hero-slider__slide-item--hidden {
            width: 220px;
            height: 220px;
            left: 22%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          }

          .hero-slider__cta {
            padding: 12px 28px;
            font-size: 13px;
          }

          .hero-slider__nav-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>

      <section
        ref={containerRef}
        className="hero-slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background gradient layers - one per slide for crossfade */}
        {slides.map((slide, i) => (
          <div
            key={`bg-${slide.id}`}
            className="hero-slider__bg"
            style={{
              background: `linear-gradient(135deg, ${slide.bg_color_from} 0%, ${slide.bg_color_to} 100%)`,
              opacity: i === activeIndex ? 1 : 0,
            }}
          />
        ))}

        {/* Floating particles */}
        <div className="hero-slider__particles">
          {[...Array(12)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="hero-slider__particle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 6}s`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
              }}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="hero-slider__content">
          {/* Product Images Carousel */}
          <div className="hero-slider__image-area">
            <div className="hero-slider__image-track">
              {slides.map((slide, i) => {
                let posClass = 'hero-slider__slide-item--hidden'

                if (i === activeIndex) {
                  posClass = 'hero-slider__slide-item--active'
                } else if (i === (activeIndex - 1 + slides.length) % slides.length) {
                  posClass = 'hero-slider__slide-item--prev'
                } else if (i === (activeIndex + 1) % slides.length) {
                  posClass = 'hero-slider__slide-item--next'
                }

                return (
                  <div
                    key={`slide-${slide.id}`}
                    className={`hero-slider__slide-item ${posClass}`}
                    style={{
                      '--accent-glow': `${slide.accent_color}33`,
                    } as React.CSSProperties}
                    onClick={() => {
                      if (i === (activeIndex + 1) % slides.length) goNext()
                      else if (i === (activeIndex - 1 + slides.length) % slides.length) goPrev()
                    }}
                  >
                    <img
                      src={getSlideImage(slide)}
                      alt={slide.title}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      draggable={false}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Text Content */}
          <div className="hero-slider__text-area" style={{ color: currentSlide.text_color }}>
            <h1
              key={`title-${activeIndex}`}
              className="hero-slider__title hero-slider__title-enter"
              style={{ color: currentSlide.text_color }}
            >
              {currentSlide.title}
            </h1>

            {currentSlide.subtitle && (
              <p
                key={`sub-${activeIndex}`}
                className="hero-slider__subtitle hero-slider__subtitle-enter"
                style={{ color: currentSlide.text_color }}
              >
                {currentSlide.subtitle}
              </p>
            )}

            {currentSlide.description && (
              <p
                key={`desc-${activeIndex}`}
                className="hero-slider__description hero-slider__description-enter"
                style={{ color: currentSlide.text_color }}
              >
                {currentSlide.description}
              </p>
            )}

            {currentSlide.cta_link && (
              <Link
                key={`cta-${activeIndex}`}
                href={currentSlide.cta_link}
                className="hero-slider__cta hero-slider__cta-enter"
                style={{
                  background: currentSlide.accent_color,
                  color: currentSlide.bg_color_from,
                }}
              >
                {currentSlide.cta_text || 'Beli Sekarang'}
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="hero-slider__nav">
          <button
            className="hero-slider__nav-btn"
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="hero-slider__dots">
            {slides.map((_, i) => (
              <button
                key={`dot-${i}`}
                className={`hero-slider__dot ${i === activeIndex ? 'hero-slider__dot--active' : ''}`}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="hero-slider__nav-btn"
            onClick={goNext}
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </>
  )
}
