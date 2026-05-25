'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  Settings,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/client'

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
  { href: '/admin/settings', icon: Settings, label: 'Pengaturan Toko' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const [unreadOrders, setUnreadOrders] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [pendingReturns, setPendingReturns] = useState(0)

  const fetchCounts = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch unread orders (seen_by_admin = false)
      const { count: ordersCount, error: ordersErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seen_by_admin', false)
      
      if (!ordersErr) {
        setUnreadOrders(ordersCount || 0)
      }

      // 2. Fetch unread chats (is_read = false AND sender_id != admin_id)
      const { count: chatsCount, error: chatsErr } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id)

      if (!chatsErr) {
        setUnreadChats(chatsCount || 0)
      }

      // 3. Fetch pending returns (status = 'pending')
      const { count: returnsCount, error: returnsErr } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (!returnsErr) {
        setPendingReturns(returnsCount || 0)
      }
    } catch (e) {
      console.error('Error fetching admin badge counts:', e)
    }
  }

  useEffect(() => {
    // Auto-collapse on medium screens (1024px-1280px) on initial load
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024 && window.innerWidth <= 1280) {
        setCollapsed(true)
      }
    }

    fetchCounts()

    const supabase = createClient()

    const channel = supabase.channel('admin-sidebar-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        fetchCounts()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        fetchCounts()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'returns'
      }, () => {
        fetchCounts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <>
      <Header />
      <style>{`
        .admin-sidebar__label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .admin-sidebar--collapsed {
          width: 68px !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__label,
        .admin-sidebar--collapsed .admin-sidebar__header-text,
        .admin-sidebar--collapsed .admin-sidebar__back-text {
          display: none !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__nav-item {
          justify-content: center !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          gap: 0 !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__bottom {
          padding-left: 0 !important;
          padding-right: 0 !important;
          justify-content: center !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__bottom a {
          justify-content: center !important;
        }
        .admin-sidebar--collapsed .admin-sidebar__header {
          justify-content: center !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        @media (min-width: 1024px) {
          .admin-content--collapsed {
            margin-left: 68px !important;
          }
        }
        .admin-content {
          transition: margin-left 0.25s ease !important;
        }
        /* Mobile sidebar — full overlay */
        @media (max-width: 1023px) {
          .admin-sidebar.admin-sidebar--open {
            width: var(--sidebar-width) !important;
          }
          .admin-sidebar.admin-sidebar--open .admin-sidebar__label {
            display: flex !important;
          }
          .admin-sidebar.admin-sidebar--open .admin-sidebar__header-text,
          .admin-sidebar.admin-sidebar--open .admin-sidebar__back-text {
            display: inline !important;
          }
          .admin-sidebar.admin-sidebar--open .admin-sidebar__nav-item {
            justify-content: flex-start !important;
            padding-left: 24px !important;
            padding-right: 24px !important;
            gap: 12px !important;
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

              let badgeCount = 0
              if (item.href === '/admin/orders') {
                badgeCount = unreadOrders
              } else if (item.href === '/admin/chat') {
                badgeCount = unreadChats
              } else if (item.href === '/admin/returns') {
                badgeCount = pendingReturns
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-sidebar__nav-item ${isActive ? 'admin-sidebar__nav-item--active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  style={{ position: 'relative' }}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Icon size={18} />
                    {collapsed && badgeCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-8px',
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          width: '15px',
                          height: '15px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                        }}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="admin-sidebar__label">
                    <span>{item.label}</span>
                    {!collapsed && badgeCount > 0 && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '10px',
                          marginLeft: '8px',
                          display: 'inline-block',
                          boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)',
                        }}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </span>
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
