import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Laporan Penjualan',
}

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
  const totalOrders = orders?.length || 0
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  // Group by status
  const statusBreakdown: Record<string, { count: number; revenue: number }> = {}
  orders?.forEach((o) => {
    if (!statusBreakdown[o.status]) {
      statusBreakdown[o.status] = { count: 0, revenue: 0 }
    }
    statusBreakdown[o.status].count++
    statusBreakdown[o.status].revenue += o.total
  })

  // Simple monthly revenue (last 6 months)
  const monthlyRevenue: Record<string, number> = {}
  orders?.forEach((o) => {
    const month = new Date(o.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + o.total
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Laporan Penjualan</h1>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <span className="stat-card__label">Total Pendapatan</span>
          <p className="stat-card__value">{formatRupiah(totalRevenue)}</p>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Total Pesanan</span>
          <p className="stat-card__value">{totalOrders}</p>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Rata-rata Pesanan</span>
          <p className="stat-card__value">{formatRupiah(avgOrderValue)}</p>
        </div>
      </div>

      {/* Revenue by Status */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
          Pendapatan per Status
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(statusBreakdown).map(([status, data]) => {
            const statusInfo = ORDER_STATUS[status] || { label: status, color: '#999' }
            const percentage = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0

            return (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500 }}>{statusInfo.label} ({data.count})</span>
                  <span style={{ fontWeight: 600 }}>{formatRupiah(data.revenue)}</span>
                </div>
                <div style={{
                  height: '6px',
                  borderRadius: '3px',
                  background: 'var(--color-bg-tertiary)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: statusInfo.color,
                    borderRadius: '3px',
                    transition: 'width var(--transition-slow)',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
          Pendapatan Bulanan
        </h3>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Bulan</th>
                <th style={{ textAlign: 'right' }}>Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyRevenue).map(([month, revenue]) => (
                <tr key={month}>
                  <td style={{ fontSize: '14px', fontWeight: 500 }}>{month}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '14px' }}>
                    {formatRupiah(revenue)}
                  </td>
                </tr>
              ))}
              {Object.keys(monthlyRevenue).length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    Belum ada data penjualan
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
