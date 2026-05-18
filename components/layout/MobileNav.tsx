'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useEffect, useState } from 'react'

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

  return (
    <nav 
      className="mobile-nav"
      style={{
        transform: isHiddenOnHome ? 'translateY(100%)' : 'translateY(0)',
        opacity: isHiddenOnHome ? 0 : 1,
        transition: 'transform 0.4s ease, opacity 0.4s ease',
        pointerEvents: isHiddenOnHome ? 'none' : 'auto'
      }}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={22} />
              {item.href === '/cart' && mounted && totalItems > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    background: 'var(--color-primary)',
                    color: 'var(--color-secondary)',
                    fontSize: '9px',
                    fontWeight: 700,
                    lineHeight: '16px',
                    textAlign: 'center',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {totalItems}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
