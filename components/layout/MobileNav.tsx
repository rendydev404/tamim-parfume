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
    const idx = navItems.findIndex((item) => {
      if (item.href === '/') {
        return pathname === '/'
      }
      if (item.href === '/dashboard') {
        return (
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/orders') ||
          pathname.startsWith('/profile')
        )
      }
      if (item.href === '/products') {
        return pathname.startsWith('/products') || pathname.startsWith('/search')
      }
      return pathname.startsWith(item.href)
    })
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
      {/* White bar with CSS mask cutout */}
      <div
        className="magic-nav__bar"
        style={{ '--indicator-x': `${indicatorPercent}%` } as React.CSSProperties}
      />

      {/* Floating indicator circle */}
      <div
        className="magic-nav__indicator"
        style={{ left: `${indicatorPercent}%` }}
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
