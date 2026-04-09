import { createClient } from '@/lib/supabase/server'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import Link from 'next/link'
import {
  Package, ShoppingCart, Users, TrendingUp, ArrowRight,
  Clock, AlertTriangle, CheckCircle, Truck, CreditCard,
  Eye, PackageOpen
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`
  return formatDate(dateStr)
}

const activityStyle = (status: string) => {
  switch (status) {
    case 'pending_payment': return { bg: '#fef3c7', color: '#92400e', Icon: Clock }
    case 'paid': return { bg: '#dbeafe', color: '#1e40af', Icon: CreditCard }
    case 'processing': return { bg: '#ede9fe', color: '#5b21b6', Icon: PackageOpen }
    case 'shipped': return { bg: '#cffafe', color: '#155e75', Icon: Truck }
    case 'delivered': return { bg: '#d1fae5', color: '#065f46', Icon: CheckCircle }
    case 'cancelled': return { bg: '#fee2e2', color: '#991b1b', Icon: AlertTriangle }
    default: return { bg: '#f3f4f6', color: '#6b7280', Icon: Eye }
  }
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalProducts },
    { count: totalOrders },
    { count: totalUsers },
    { data: recentOrders },
    { data: revenueData },
    { data: allOrders },
    { data: lowStockProducts },
    { count: pendingPaymentCount },
    { count: paidCount },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('orders').select('total, status').in('status', ['paid', 'processing', 'shipped', 'delivered']),
    supabase.from('orders').select('status'),
    supabase.from('products').select('id, name, stock, price').lte('stock', 5).order('stock', { ascending: true }).limit(5),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
  ])

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0

  const statusCounts: Record<string, number> = {}
  allOrders?.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })
  const totalOrdersCount = allOrders?.length || 0

  const stats = [
    { label: 'Total Pendapatan', value: formatRupiah(totalRevenue), icon: TrendingUp, color: '#10b981', desc: 'Dari pesanan terbayar' },
    { label: 'Total Pesanan', value: totalOrders?.toString() || '0', icon: ShoppingCart, color: '#3b82f6', desc: 'Semua pesanan' },
    { label: 'Total Produk', value: totalProducts?.toString() || '0', icon: Package, color: '#8b5cf6', desc: 'Aktif di katalog' },
    { label: 'Total Pengguna', value: totalUsers?.toString() || '0', icon: Users, color: '#f59e0b', desc: 'Pengguna terdaftar' },
  ]

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <style>{`
        @media (max-width: 767px) {
          #dashboard-actions, #dashboard-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{getGreeting()}, Admin 👋</h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{todayStr}</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-card__label">{stat.label}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                  background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="stat-card__value">{stat.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{stat.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Action Required Cards — use inline grid to guarantee 2 columns */}
      <div id="dashboard-actions" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <Link href="/admin/orders" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
            borderLeft: '4px solid #f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
                {pendingPaymentCount || 0}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Menunggu Pembayaran
              </p>
            </div>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </Link>
        <Link href="/admin/orders" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
            borderLeft: '4px solid #3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>
                {paidCount || 0}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Perlu Diproses
              </p>
            </div>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: '#dbeafe',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <PackageOpen size={20} style={{ color: '#3b82f6' }} />
            </div>
          </div>
        </Link>
      </div>

      {/* Order Status Overview */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
          Ringkasan Status Pesanan
        </h3>
        {totalOrdersCount > 0 ? (
          <>
            {/* Visual bar */}
            <div style={{
              display: 'flex', width: '100%', height: '12px', borderRadius: '6px',
              overflow: 'hidden', background: 'var(--color-bg-secondary)', marginBottom: '16px',
            }}>
              {Object.entries(ORDER_STATUS).map(([key, info]) => {
                const count = statusCounts[key] || 0
                if (count === 0) return null
                const pct = (count / totalOrdersCount) * 100
                return (
                  <div
                    key={key}
                    style={{
                      height: '100%', width: `${pct}%`, background: info.color,
                      minWidth: '4px',
                    }}
                    title={`${info.label}: ${count}`}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {Object.entries(ORDER_STATUS).map(([key, info]) => {
                const count = statusCounts[key] || 0
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                    {info.label} ({count})
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>
            Belum ada data pesanan
          </p>
        )}
      </div>

      {/* Two-column: Low Stock + Activity */}
      <div id="dashboard-bottom" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '24px',
      }}>
        {/* Low Stock Products */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
              Stok Rendah
            </h3>
            <Link href="/admin/products" style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>
          {lowStockProducts && lowStockProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products/${product.id}/edit`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{formatRupiah(product.price)}</p>
                  </div>
                  <span style={{
                    display: 'inline-flex', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    background: product.stock === 0 ? '#fee2e2' : '#fef3c7',
                    color: product.stock === 0 ? '#991b1b' : '#92400e',
                    whiteSpace: 'nowrap',
                  }}>
                    {product.stock === 0 ? 'Habis' : `Sisa ${product.stock}`}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
              Semua produk stoknya aman 👍
            </p>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
            Aktivitas Terbaru
          </h3>
          {recentOrders && recentOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentOrders.slice(0, 5).map((order, idx) => {
                const statusInfo = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }
                const style = activityStyle(order.status)
                const ActivityIcon = style.Icon
                return (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex', gap: '12px', padding: '10px 0',
                      borderBottom: idx < Math.min(recentOrders.length, 5) - 1 ? '1px solid var(--color-border-light)' : 'none',
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: style.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <ActivityIcon size={14} style={{ color: style.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', lineHeight: 1.4 }}>
                        <strong>{order.recipient_name || 'Pelanggan'}</strong>
                        {' — '}
                        <span style={{ color: statusInfo.color, fontWeight: 600 }}>{statusInfo.label}</span>
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        #{order.order_number} · {formatRupiah(order.total)}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {timeAgo(order.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
              Belum ada aktivitas
            </p>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div>
        <div className="section__header">
          <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
            Pesanan Terbaru
          </h2>
          <Link href="/admin/orders" className="section__link">
            Semua <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Pemesan</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th style={{ width: '70px' }}></th>
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order) => {
                const status = ORDER_STATUS[order.status] || { label: order.status, color: '#999' }
                return (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 600, fontSize: '13px' }}>
                        #{order.order_number}
                      </Link>
                    </td>
                    <td style={{ fontSize: '13px' }}>{order.recipient_name}</td>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>{formatRupiah(order.total)}</td>
                    <td>
                      <span className="badge" style={{ background: `${status.color}20`, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500,
                        }}
                      >
                        <Eye size={14} /> Detail
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!recentOrders || recentOrders.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Belum ada pesanan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
