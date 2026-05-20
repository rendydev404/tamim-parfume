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
  Film,
  Menu,
  X,
  ArrowLeft,
  RefreshCcw,
  ChevronsLeft,
  ChevronsRight,
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
  { href: '/admin/hero-sequence', icon: Film, label: 'Hero Sequence' },
  { href: '/admin/reports', icon: BarChart3, label: 'Laporan' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <Header />
      <style>{`
        .admin-sidebar--collapsed {
          width: 68px !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__label,
        .admin-sidebar--collapsed .admin-sidebar__header-text,
        .admin-sidebar--collapsed .admin-sidebar__back-text {
          display: none;
        }
        .admin-sidebar--collapsed .admin-sidebar__nav-item {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
          gap: 0;
        }
        .admin-sidebar--collapsed .admin-sidebar__bottom {
          padding-left: 0;
          padding-right: 0;
          justify-content: center;
        }
        .admin-sidebar--collapsed .admin-sidebar__bottom a {
          justify-content: center;
        }
        .admin-sidebar--collapsed .admin-sidebar__header {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }
        @media (min-width: 1024px) {
          .admin-content--collapsed {
            margin-left: 68px !important;
          }
        }
        .admin-collapse-btn {
          position: fixed;
          left: calc(var(--sidebar-width) - 14px);
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          background: #1a1a1a;
          border: 2px solid #333;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          border-radius: 50%;
          display: none;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 91;
          padding: 0;
        }
        .admin-collapse-btn--collapsed {
          left: calc(68px - 14px);
        }
        .admin-collapse-btn:hover {
          color: #fff;
          background: #333;
          border-color: #555;
        }
        @media (min-width: 1024px) {
          .admin-collapse-btn {
            display: flex;
          }
        }
      `}</style>
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

        {/* Collapse toggle - floating circle at sidebar edge */}
        <button
          className={`admin-collapse-btn ${collapsed ? 'admin-collapse-btn--collapsed' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>

        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''} ${collapsed ? 'admin-sidebar--collapsed' : ''}`}
          style={{ transition: 'transform 0.25s ease, width 0.25s ease', display: 'flex', flexDirection: 'column' }}
        >
          <div className="admin-sidebar__header" style={{ padding: '0 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="admin-sidebar__header-text" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
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
          <nav style={{ flex: 1 }}>
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
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  <span className="admin-sidebar__label">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>

            <div className="admin-sidebar__bottom" style={{ padding: '8px 24px 16px', display: 'flex' }}>
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
                <span className="admin-sidebar__back-text">Kembali ke Toko</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`admin-content ${collapsed ? 'admin-content--collapsed' : ''}`}>
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
