'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  MessageCircle,
  Tag,
  Megaphone,
  Menu,
  X,
  ArrowLeft,
  RefreshCcw,
} from 'lucide-react'
import Header from '@/components/layout/Header'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Produk' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Pesanan' },
  { href: '/admin/returns', icon: RefreshCcw, label: 'Kelola Retur' },
  { href: '/admin/users', icon: Users, label: 'Pengguna' },
  { href: '/admin/chat', icon: MessageCircle, label: 'Chat Pelanggan' },
  { href: '/admin/coupons', icon: Tag, label: 'Kupon' },
  { href: '/admin/promos', icon: Megaphone, label: 'Promo' },
  { href: '/admin/reports', icon: BarChart3, label: 'Laporan' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <Header />
      <div className="admin-layout">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 89,
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
          <div style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
              Admin Panel
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'block',
              }}
              className="lg-hidden"
            >
              <X size={20} />
            </button>
            <style>{`
              @media (min-width: 1024px) {
                .lg-hidden { display: none !important; }
              }
            `}</style>
          </div>
          <nav>
            {navItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-sidebar__nav-item ${isActive ? 'admin-sidebar__nav-item--active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div style={{ padding: '16px 24px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Toko</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <div className="admin-content">
          {/* Mobile menu toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSidebarOpen(true)}
            style={{ marginBottom: '16px', gap: '6px', display: 'none' }}
            id="admin-menu-toggle"
          >
            <Menu size={16} />
            Menu
          </button>
          <style>{`
            @media (max-width: 1023px) {
              #admin-menu-toggle { display: inline-flex !important; }
            }
          `}</style>
          {children}
        </div>
      </div>
    </>
  )
}
