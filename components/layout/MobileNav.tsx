
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useEffect, useState, useMemo } from 'react'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/products', icon: Search, label: 'Katalog' },
  { href: '/cart', icon: ShoppingBag, label: 'Keranjang' },
  { href: '/dashboard', icon: User, label: 'Akun' },
]

export default function MobileNav() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.getTotalItems())
  const [mounted, setMounted] = useState(false)
  const [isHiddenOnHome, setIsHiddenOnHome] = useState(false)

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex((item) =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    )
    return idx >= 0 ? idx : 0
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/') {
      setIsHiddenOnHome(false)
      return
    }
    const handleScroll = () => {
      if (window.scrollY < 50) {
        setIsHiddenOnHome(false)
      } else if (window.scrollY < window.innerHeight * 3.8) {
        setIsHiddenOnHome(true)
      } else {
        setIsHiddenOnHome(false)
      }
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [pathname])

  useEffect(() => {
    setMounted(true)
  }, [])

  const itemCount = navItems.length
  // Each item takes 1/itemCount of the width, indicator center is at the middle of active item
  const indicatorPercent = ((activeIndex + 0.5) / itemCount) * 100

  return (
    <nav
      className="magic-nav"
      style={{
        transform: isHiddenOnHome ? 'translateY(100%)' : 'translateY(0)',
        opacity: isHiddenOnHome ? 0 : 1,
        transition: 'transform 0.4s ease, opacity 0.4s ease',
        pointerEvents: isHiddenOnHome ? 'none' : 'auto',
      }}
    >
      {/* SVG curve background */}
      <div className="magic-nav__bg">
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          className="magic-nav__svg"
        >
          <defs>
            <filter id="navShadow" x="-10%" y="-30%" width="120%" height="160%">
              <feDropShadow dx="0" dy="-3" stdDeviation="4" floodColor="rgba(0,0,0,0.08)" />
            </filter>
          </defs>
          <path
            d={generateCurvePath(indicatorPercent, 400, 80)}
            fill="rgba(255, 255, 255, 0.97)"
            filter="url(#navShadow)"
            className="magic-nav__curve-path"
          />
        </svg>
      </div>

      {/* Floating indicator circle */}
      <div
        className="magic-nav__indicator"
        style={{
          left: `${indicatorPercent}%`,
        }}
      >
        <div className="magic-nav__indicator-circle">
          {(() => {
            const ActiveIcon = navItems[activeIndex].icon
            return <ActiveIcon size={22} strokeWidth={2.2} />
          })()}
          {navItems[activeIndex].href === '/cart' && mounted && totalItems > 0 && (
            <span className="magic-nav__cart-badge">{totalItems}</span>
          )}
        </div>
      </div>

      {/* Nav items */}
      <div className="magic-nav__items">
        {navItems.map((item, index) => {
          const isActive = index === activeIndex
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`magic-nav__item ${isActive ? 'magic-nav__item--active' : ''}`}
            >
              <div
                className="magic-nav__icon-wrap"
                style={{ opacity: isActive ? 0 : 1 }}
              >
                <Icon size={22} />
                {item.href === '/cart' && mounted && totalItems > 0 && !isActive && (
                  <span className="magic-nav__cart-badge magic-nav__cart-badge--inline">
                    {totalItems}
                  </span>
                )}
              </div>
              <span
                className={`magic-nav__label ${isActive ? 'magic-nav__label--active' : ''}`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Generates an SVG path with a smooth concave curve (cutout) at the given horizontal position.
 */
function generateCurvePath(
  centerPercent: number,
  width: number,
  height: number
): string {
  const cx = (centerPercent / 100) * width
  const curveWidth = 70 // total width of the concave dip
  const curveDepth = 32 // how deep the curve dips upward
  const topY = 16 // top edge of the nav bar

  const left = cx - curveWidth / 2
  const right = cx + curveWidth / 2

  // Build path: start top-left, go to curve start, curve down (concave), continue to top-right, then down and close
  return [
    `M 0 ${topY}`,
    `L ${left} ${topY}`,
    `C ${left + 14} ${topY}, ${cx - 22} ${topY - curveDepth}, ${cx} ${topY - curveDepth}`,
    `C ${cx + 22} ${topY - curveDepth}, ${right - 14} ${topY}, ${right} ${topY}`,
    `L ${width} ${topY}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    `Z`,
  ].join(' ')
}
