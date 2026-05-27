'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search, ShoppingBag, User, X, LogOut, LayoutDashboard, Package, Settings, Heart } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { createClient } from '@/lib/supabase/client'
import SearchAutocomplete from './SearchAutocomplete'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
}

function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.trim().substring(0, 2).toUpperCase()
  }
  return email ? email[0].toUpperCase() : 'U'
}

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const totalItems = useCartStore((s) => s.getTotalItems())
  const [mounted, setMounted] = useState(false)
  const [isHiddenOnHome, setIsHiddenOnHome] = useState(false)

  useEffect(() => {
    setIsHiddenOnHome(false)
  }, [pathname])

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        // Fetch profile from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, role')
          .eq('id', data.user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
        } else {
          // Fallback if profile not in DB yet
          setProfile({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
            role: 'user',
          })
        }
      }
      setAuthChecked(true)
    })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfile(null)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const initials = profile ? getInitials(profile.full_name, profile.email) : ''
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || ''

  return (
    <>
      <header 
        className="header"
        style={{
          transform: isHiddenOnHome ? 'translateY(-100%)' : 'translateY(0)',
          opacity: isHiddenOnHome ? 0 : 1,
          transition: 'transform 0.4s ease, opacity 0.4s ease',
          pointerEvents: isHiddenOnHome ? 'none' : 'auto'
        }}
      >
        <div className="header__inner">
          {/* Logo */}
          <Link href="/" className="header__logo">
            TAMIM PARFUME
          </Link>

          {/* Desktop Search */}
          <div className="header__search">
            <SearchAutocomplete />
          </div>

          {/* Actions */}
          <div className="header__actions">
            {/* Mobile Search Toggle */}
            <button
              className="header__action-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              style={{ display: 'none' }}
              aria-label="Search"
              id="mobile-search-toggle"
            >
              <Search size={20} />
            </button>
            <style>{`
              @media (max-width: 767px) {
                #mobile-search-toggle { display: flex !important; }
              }
            `}</style>

            {/* Cart */}
            <Link href="/cart" className="header__action-btn" aria-label="Keranjang">
              <ShoppingBag size={20} />
              {mounted && totalItems > 0 && (
                <span className="header__cart-badge">{totalItems}</span>
              )}
            </Link>

            {/* User Profile / Login */}
            {profile ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Profil"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: 'var(--radius-full)',
                    transition: 'opacity var(--transition-fast)',
                  }}
                >
                  {/* Avatar */}
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--color-border)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      color: 'var(--color-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      border: '2px solid var(--color-border)',
                    }}>
                      {initials}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '8px',
                        width: '240px',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 200,
                        overflow: 'hidden',
                      }}
                    >
                      {/* User Info Header */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        borderBottom: '1px solid var(--color-border-light)',
                      }}>
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'var(--color-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{
                            fontWeight: 600,
                            fontSize: '14px',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                          }}>
                            {displayName}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            margin: 0,
                          }}>
                            {profile.email}
                          </p>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div style={{ padding: '4px 0' }}>
                        {[
                          { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                          { href: '/orders', icon: Package, label: 'Pesanan Saya' },
                          { href: '/wishlist', icon: Heart, label: 'Wishlist' },
                          { href: '/profile', icon: Settings, label: 'Pengaturan Profil' },
                          ...(profile.role === 'admin' ? [{ href: '/admin', icon: LayoutDashboard, label: 'Admin Panel' }] : []),
                        ].map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMenuOpen(false)}
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 16px',
                                fontSize: '14px',
                                color: item.href === '/admin' ? 'var(--color-text)' : 'var(--color-text)',
                                textDecoration: 'none',
                                fontWeight: item.href === '/admin' ? 600 : 400,
                              }}
                            >
                              <span style={{ display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' }}>
                                <Icon size={16} />
                              </span>
                              <span>{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>

                      {/* Logout */}
                      <div style={{ borderTop: '1px solid var(--color-border-light)', padding: '4px 0' }}>
                        <button
                          onClick={handleLogout}
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 16px',
                            fontSize: '14px',
                            color: 'var(--color-error)',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' }}>
                            <LogOut size={16} />
                          </span>
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : authChecked ? (
              <>
                <Link href="/login" className="header__action-btn" aria-label="Login" id="login-icon-mobile">
                  <User size={20} />
                </Link>
                <Link href="/login" className="btn btn-primary btn-sm" style={{ display: 'none' }} id="login-btn-desktop">
                  Masuk
                </Link>
              </>
            ) : null}
            <style>{`
              @media (min-width: 768px) {
                #login-btn-desktop { display: inline-flex !important; }
                #login-icon-mobile { display: none !important; }
              }
            `}</style>
          </div>
        </div>
      </header>

      {/* Mobile Search Expanded */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--header-height)',
            left: 0,
            right: 0,
            background: 'var(--color-bg)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border-light)',
            zIndex: 99,
          }}
        >
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Cari parfum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ flex: 1 }}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setSearchOpen(false)}
            >
              <X size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
