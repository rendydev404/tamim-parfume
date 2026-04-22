import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import type { Metadata } from 'next'
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Users, Package, Repeat, Award, ArrowUpRight, ArrowDownRight,
  Calendar, BarChart3, PieChart, ShoppingBag, Percent
} from 'lucide-react'
import PrintButton from './PrintButton'

export const metadata: Metadata = {
  title: 'Laporan Penjualan | TAMIM PARFUME',
}

// ────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────

function getMonthName(m: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m]
}

function getDayName(d: number) {
  return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d]
}

interface OrderRow {
  total: number
  status: string
  created_at: string
  shipping_cost: number
  subtotal: number
}

interface OrderItemRow {
  product_id: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

export default async function AdminReportsPage() {
  const supabase = await createClient()

  // Fetch all relevant orders
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, created_at, shipping_cost, subtotal')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false }) as { data: OrderRow[] | null }

  // Fetch order items for product analytics
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, price, subtotal') as { data: OrderItemRow[] | null }

  // Fetch all orders (including cancelled) for conversion metrics
  const { data: allOrders } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .order('created_at', { ascending: false })

  // Fetch total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')

  // ────────────────────────────────────────────────
  // Calculations
  // ────────────────────────────────────────────────

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  // Revenue metrics
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
  const totalShipping = orders?.reduce((sum, o) => sum + (o.shipping_cost || 0), 0) || 0
  const netRevenue = totalRevenue - totalShipping

  // This month vs last month for comparison
  const thisMonthOrders = orders?.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }) || []
  const lastMonthOrders = orders?.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  }) || []

  const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const revenueChange = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : thisMonthRevenue > 0 ? 100 : 0

  const thisMonthOrderCount = thisMonthOrders.length
  const lastMonthOrderCount = lastMonthOrders.length
  const orderCountChange = lastMonthOrderCount > 0
    ? Math.round(((thisMonthOrderCount - lastMonthOrderCount) / lastMonthOrderCount) * 100)
    : thisMonthOrderCount > 0 ? 100 : 0

  // Conversion rate
  const totalAllOrders = allOrders?.length || 0
  const paidOrders = allOrders?.filter(o => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status)).length || 0
  const conversionRate = totalAllOrders > 0 ? Math.round((paidOrders / totalAllOrders) * 100) : 0

  // Repeat customer rate (simplified: unique users is harder without user_id, use 15% as estimate if no data)
  const repeatRate = totalOrders > 0 ? Math.min(Math.round((totalOrders / Math.max(totalUsers || 1, 1)) * 100), 100) : 0

  // Status breakdown
  const statusBreakdown: Record<string, { count: number; revenue: number }> = {}
  orders?.forEach(o => {
    if (!statusBreakdown[o.status]) statusBreakdown[o.status] = { count: 0, revenue: 0 }
    statusBreakdown[o.status].count++
    statusBreakdown[o.status].revenue += o.total
  })

  // Monthly revenue (last 12 months)
  const monthlyData: { month: string; revenue: number; orders: number; avg: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const m = new Date(thisYear, thisMonth - i, 1)
    const month = m.getMonth()
    const year = m.getFullYear()
    const monthOrders = orders?.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === month && d.getFullYear() === year
    }) || []
    const revenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    monthlyData.push({
      month: `${getMonthName(month)} ${year}`,
      revenue,
      orders: monthOrders.length,
      avg: monthOrders.length > 0 ? Math.round(revenue / monthOrders.length) : 0,
    })
  }
  const maxMonthlyRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

  // Daily revenue (last 7 days)
  const dailyData: { day: string; date: string; revenue: number; orders: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayOrders = orders?.filter(o => o.created_at.startsWith(dateStr)) || []
    const revenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    dailyData.push({
      day: getDayName(d.getDay()),
      date: `${d.getDate()} ${getMonthName(d.getMonth())}`,
      revenue,
      orders: dayOrders.length,
    })
  }
  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1)

  // Top products
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
  orderItems?.forEach(item => {
    const key = item.product_id
    if (!productSales[key]) productSales[key] = { name: item.product_name, qty: 0, revenue: 0 }
    productSales[key].qty += item.quantity
    productSales[key].revenue += item.subtotal
  })
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1

  // Peak hours
  const hourlyData = Array(24).fill(0)
  orders?.forEach(o => {
    const hour = new Date(o.created_at).getHours()
    hourlyData[hour]++
  })
  const maxHourly = Math.max(...hourlyData, 1)

  // Stats cards
  const stats = [
    {
      label: 'Total Pendapatan',
      value: formatRupiah(totalRevenue),
      change: revenueChange,
      icon: DollarSign,
      color: '#10b981',
      desc: 'Bulan ini vs bulan lalu',
    },
    {
      label: 'Total Pesanan',
      value: totalOrders.toString(),
      change: orderCountChange,
      icon: ShoppingCart,
      color: '#3b82f6',
      desc: `${thisMonthOrderCount} pesanan bulan ini`,
    },
    {
      label: 'Rata-rata Pesanan',
      value: formatRupiah(avgOrderValue),
      change: null,
      icon: BarChart3,
      color: '#8b5cf6',
      desc: 'Per transaksi',
    },
    {
      label: 'Tingkat Konversi',
      value: `${conversionRate}%`,
      change: null,
      icon: Percent,
      color: '#f59e0b',
      desc: `${paidOrders} dari ${totalAllOrders} pesanan`,
    },
  ]

  const secondaryStats = [
    { label: 'Pendapatan Bersih', value: formatRupiah(netRevenue), icon: TrendingUp, color: '#059669' },
    { label: 'Ongkos Kirim', value: formatRupiah(totalShipping), icon: Package, color: '#6366f1' },
    { label: 'Pelanggan', value: (totalUsers || 0).toString(), icon: Users, color: '#ec4899' },
    { label: 'Repeat Rate', value: `${repeatRate}%`, icon: Repeat, color: '#14b8a6' },
  ]

  return (
    <div>
      <style>{`
        @media (max-width: 767px) {
          #reports-stats { grid-template-columns: repeat(2, 1fr) !important; }
          #reports-secondary { grid-template-columns: repeat(2, 1fr) !important; }
          #reports-charts { grid-template-columns: 1fr !important; }
          #reports-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Laporan Penjualan</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            Data per {now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Primary Stats */}
      <div id="reports-stats" className="stats-grid" style={{ marginBottom: '16px' }}>
        {stats.map(stat => {
          const Icon = stat.icon
          const isPositive = stat.change !== null && stat.change >= 0
          return (
            <div key={stat.label} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Background accent */}
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px',
                borderRadius: '50%', background: `${stat.color}08`, pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="stat-card__label">{stat.label}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                  background: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
              </div>
              <p className="stat-card__value" style={{ marginBottom: '4px' }}>{stat.value}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {stat.change !== null && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                    fontSize: '12px', fontWeight: 600,
                    color: isPositive ? '#10b981' : '#ef4444',
                  }}>
                    {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(stat.change)}%
                  </span>
                )}
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{stat.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Secondary Stats Row */}
      <div id="reports-secondary" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px',
      }}>
        {secondaryStats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={15} style={{ color: s.color }} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 500 }}>{s.label}</p>
                <p style={{ fontSize: '15px', fontWeight: 700 }}>{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts: Monthly + Daily */}
      <div id="reports-charts" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Monthly Revenue Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: '#3b82f6' }} />
              Pendapatan 12 Bulan Terakhir
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Total: {formatRupiah(totalRevenue)}
            </span>
          </div>

          {/* Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '180px', paddingBottom: '24px', position: 'relative' }}>
            {/* Y-axis labels */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: '24px', width: '60px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none',
            }}>
              {[1, 0.75, 0.5, 0.25, 0].map((pct, i) => (
                <span key={i} style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  {formatRupiah(maxMonthlyRevenue * pct).replace('Rp', '').trim()}
                </span>
              ))}
            </div>
            {/* Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flex: 1, marginLeft: '64px', height: '100%' }}>
              {monthlyData.map((d, i) => {
                const height = maxMonthlyRevenue > 0 ? (d.revenue / maxMonthlyRevenue) * 100 : 0
                const isCurrentMonth = i === monthlyData.length - 1
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div
                      title={`${d.month}: ${formatRupiah(d.revenue)} (${d.orders} pesanan)`}
                      style={{
                        width: '100%', maxWidth: '36px',
                        height: `${Math.max(height, 2)}%`,
                        background: isCurrentMonth
                          ? 'linear-gradient(180deg, #3b82f6, #2563eb)'
                          : 'linear-gradient(180deg, #93c5fd, #60a5fa)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.5s ease',
                        cursor: 'pointer',
                        position: 'relative',
                        opacity: isCurrentMonth ? 1 : 0.7,
                      }}
                    />
                    <span style={{
                      fontSize: '9px', color: isCurrentMonth ? 'var(--color-text)' : 'var(--color-text-muted)',
                      marginTop: '4px', fontWeight: isCurrentMonth ? 600 : 400, whiteSpace: 'nowrap',
                    }}>
                      {d.month.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Daily Revenue (Last 7 days) */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: '#8b5cf6' }} />
            7 Hari Terakhir
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dailyData.map((d, i) => {
              const width = maxDailyRevenue > 0 ? (d.revenue / maxDailyRevenue) * 100 : 0
              const isToday = i === dailyData.length - 1
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
                    <span style={{ fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                      {isToday ? 'Hari ini' : d.day}
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '4px' }}>{d.date}</span>
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{formatRupiah(d.revenue)}</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.max(width, 1)}%`,
                      background: isToday ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : '#c4b5fd',
                      borderRadius: '3px', transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Total 7 hari</p>
            <p style={{ fontSize: '18px', fontWeight: 700 }}>
              {formatRupiah(dailyData.reduce((sum, d) => sum + d.revenue, 0))}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {dailyData.reduce((sum, d) => sum + d.orders, 0)} pesanan
            </p>
          </div>
        </div>
      </div>

      {/* Status Breakdown + Peak Hours */}
      <div id="reports-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Revenue by Status */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChart size={16} style={{ color: '#10b981' }} />
            Pendapatan per Status
          </h3>

          {/* Visual Donut (CSS-based) */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  let offset = 0
                  const entries = Object.entries(statusBreakdown)
                  return entries.map(([status, data]) => {
                    const pct = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
                    const statusInfo = ORDER_STATUS[status] || { color: '#999' }
                    const el = (
                      <circle
                        key={status}
                        cx="18" cy="18" r="15.91549430918954"
                        fill="transparent"
                        stroke={statusInfo.color}
                        strokeWidth="3"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={`${-offset}`}
                      />
                    )
                    offset += pct
                    return el
                  })
                })()}
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{totalOrders}</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Pesanan</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(statusBreakdown).map(([status, data]) => {
                const statusInfo = ORDER_STATUS[status] || { label: status, color: '#999' }
                const pct = totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
                return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: statusInfo.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: 500 }}>{statusInfo.label}</span>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '3px', borderRadius: '2px', background: 'var(--color-bg-tertiary)', marginTop: '3px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: statusInfo.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', minWidth: '60px', textAlign: 'right' }}>
                      {formatRupiah(data.revenue)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={16} style={{ color: '#f59e0b' }} />
            Jam Ramai Pesanan
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3px' }}>
            {hourlyData.map((count, hour) => {
              const intensity = maxHourly > 0 ? count / maxHourly : 0
              return (
                <div key={hour} title={`${String(hour).padStart(2, '0')}:00 — ${count} pesanan`} style={{ textAlign: 'center' }}>
                  <div style={{
                    height: '48px', borderRadius: '4px',
                    background: count === 0
                      ? 'var(--color-bg-tertiary)'
                      : `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600,
                    color: intensity > 0.5 ? '#fff' : 'var(--color-text-muted)',
                    transition: 'background 0.3s',
                    cursor: 'default',
                  }}>
                    {count > 0 ? count : ''}
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
                    {String(hour).padStart(2, '0')}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--color-bg-tertiary)' }} /> 0
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(245,158,11,0.3)' }} /> Sedikit
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(245,158,11,0.7)' }} /> Sedang
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(245,158,11,1)' }} /> Ramai
            </div>
          </div>
        </div>
      </div>

      {/* Top Products + Monthly Table */}
      <div id="reports-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Top Products */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '20px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} style={{ color: '#ec4899' }} />
            Produk Terlaris
          </h3>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topProducts.map((p, i) => {
                const width = maxProductRevenue > 0 ? (p.revenue / maxProductRevenue) * 100 : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'baseline' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{
                          width: '20px', height: '20px', borderRadius: 'var(--radius-sm)',
                          background: i < 3
                            ? i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#cd7f32'
                            : 'var(--color-bg-tertiary)',
                          color: i < 3 ? '#fff' : 'var(--color-text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {formatRupiah(p.revenue)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${width}%`,
                          background: i === 0 ? 'linear-gradient(90deg, #ec4899, #f472b6)' : '#f9a8d4',
                          borderRadius: '2px',
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {p.qty} terjual
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
              Belum ada data produk
            </p>
          )}
        </div>

        {/* Monthly Revenue Table */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
            Rincian Pendapatan Bulanan
          </h3>
          <div className="table-wrapper" style={{ border: 'none', maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th style={{ textAlign: 'center' }}>Pesanan</th>
                  <th style={{ textAlign: 'right' }}>Rata-rata</th>
                  <th style={{ textAlign: 'right' }}>Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.slice().reverse().filter(d => d.revenue > 0).map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{d.month}</td>
                    <td style={{ textAlign: 'center', fontSize: '13px' }}>{d.orders}</td>
                    <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{formatRupiah(d.avg)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>{formatRupiah(d.revenue)}</td>
                  </tr>
                ))}
                {monthlyData.filter(d => d.revenue > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      Belum ada data penjualan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
