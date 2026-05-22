'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import { ORDER_STATUS } from '@/lib/constants'
import { Loader2, Eye, Search, X, Droplets, Calendar, Printer } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import PrintLabel from '@/components/order/PrintLabel'

export default function AdminOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [printOrder, setPrintOrder] = useState<Record<string, any> | null>(null)

  // Date filter
  const [datePreset, setDatePreset] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(id, product_id, product_name, product_image, variant_label, quantity, price, product:products(name, images:product_images(url, is_primary)))')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Status pesanan diperbarui')
      loadOrders()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status')
    }
  }

  // Format date to YYYY-MM-DD in local timezone (NOT UTC)
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Date preset handler
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset)
    const now = new Date()
    const todayStr = toLocalDateStr(now)

    switch (preset) {
      case 'today': {
        setDateFrom(todayStr)
        setDateTo(todayStr)
        break
      }
      case 'yesterday': {
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yStr = toLocalDateStr(yesterday)
        setDateFrom(yStr)
        setDateTo(yStr)
        break
      }
      case '7days': {
        const d7 = new Date(now)
        d7.setDate(now.getDate() - 6)
        setDateFrom(toLocalDateStr(d7))
        setDateTo(todayStr)
        break
      }
      case '30days': {
        const d30 = new Date(now)
        d30.setDate(now.getDate() - 29)
        setDateFrom(toLocalDateStr(d30))
        setDateTo(todayStr)
        break
      }
      case 'this_month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        setDateFrom(toLocalDateStr(firstDay))
        setDateTo(todayStr)
        break
      }
      case 'last_month': {
        const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        setDateFrom(toLocalDateStr(firstLastMonth))
        setDateTo(toLocalDateStr(lastLastMonth))
        break
      }
      default:
        setDateFrom('')
        setDateTo('')
    }
  }

  const clearDateFilter = () => {
    setDatePreset('all')
    setDateFrom('')
    setDateTo('')
  }

  const filteredOrders = orders.filter((o) => {
    // Status filter
    if (filter !== 'all' && o.status !== filter) return false
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const orderNum = (o.order_number as string || '').toLowerCase()
      const name = (o.recipient_name as string || '').toLowerCase()
      const phone = (o.recipient_phone as string || '').toLowerCase()
      if (!orderNum.includes(q) && !name.includes(q) && !phone.includes(q)) return false
    }
    // Date filter — compare using local date strings
    if (dateFrom || dateTo) {
      const orderDate = new Date(o.created_at as string)
      const orderDateStr = toLocalDateStr(orderDate)
      if (dateFrom && orderDateStr < dateFrom) return false
      if (dateTo && orderDateStr > dateTo) return false
    }
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  const datePresets = [
    { key: 'all', label: 'Semua' },
    { key: 'today', label: 'Hari Ini' },
    { key: 'yesterday', label: 'Kemarin' },
    { key: '7days', label: '7 Hari' },
    { key: '30days', label: '30 Hari' },
    { key: 'this_month', label: 'Bulan Ini' },
    { key: 'last_month', label: 'Bulan Lalu' },
    { key: 'custom', label: 'Kustom' },
  ]

  return (
    <div>
      <style>{`
        .admin-order-row {
          transition: background-color 0.15s ease;
        }
        .admin-order-row:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Kelola Pesanan</h1>
        <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. pesanan, nama, atau telepon..."
            style={{ paddingLeft: '36px', paddingRight: search ? '36px' : '12px', fontSize: '13px' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--color-text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Date filter */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: datePreset === 'custom' ? '12px' : '0', flexWrap: 'wrap' }}>
          <Calendar size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', flexShrink: 0 }}>Tanggal:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {datePresets.map((p) => (
              <button
                key={p.key}
                className={`btn btn-sm ${datePreset === p.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => p.key === 'custom' ? setDatePreset('custom') : applyDatePreset(p.key)}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {datePreset !== 'all' && (
            <button
              onClick={clearDateFilter}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', padding: '4px', fontFamily: 'inherit' }}
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>

        {/* Custom date range */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>Dari:</label>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px', width: 'auto' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', flexShrink: 0 }}>Sampai:</label>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px', width: 'auto' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status filter pills */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '16px',
        overflowX: 'auto', paddingBottom: '4px',
      }}>
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          Semua ({orders.length})
        </button>
        {Object.entries(ORDER_STATUS).map(([key, val]) => {
          const count = orders.filter((o) => o.status === key).length
          return (
            <button
              key={key}
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(key)}
            >
              {val.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Results count */}
      {(datePreset !== 'all' || search) && (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
          Menampilkan {filteredOrders.length} dari {orders.length} pesanan
        </p>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>No. Pesanan</th>
              <th>Produk</th>
              <th>Pemesan</th>
              <th>Total</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const status = ORDER_STATUS[order.status as string] || { label: order.status, color: '#999' }
              return (
                <tr 
                  key={order.id as string}
                  onClick={() => router.push(`/admin/orders/${order.id}`)}
                  style={{ cursor: 'pointer' }}
                  className="admin-order-row"
                >
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {order.seen_by_admin === false && (
                        <span 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            boxShadow: '0 0 8px #3b82f6',
                            display: 'inline-block',
                            flexShrink: 0
                          }}
                          title="Pesanan Baru"
                        />
                      )}
                      <span>#{order.order_number as string}</span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const items = (order as Record<string, any>).items || []
                      const displayItems = items.slice(0, 2)
                      const remaining = items.length - 2
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                          {displayItems.map((item: any) => {
                            const productImages = item.product?.images || []
                            const primaryImg = productImages.find((img: any) => img.is_primary) || productImages[0]
                            const displayImage = item.product_image || primaryImg?.url || null
                            const displayName = item.product_name || item.product?.name || 'Produk'
                            return (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '36px', height: '36px',
                                  borderRadius: '6px',
                                  background: 'var(--color-bg-secondary)',
                                  flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  overflow: 'hidden',
                                  border: '1px solid var(--color-border-light)',
                                }}>
                                  {(() => {
                                    const isVid = (url: string) => url && (/\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video') || url.includes('.mp4'));
                                    let displayImg = displayImage;
                                    
                                    if (displayImg && isVid(displayImg)) {
                                      const nonVidImg = productImages.find((img: any) => !isVid(img.url));
                                      displayImg = nonVidImg?.url || displayImg;
                                    }

                                    return displayImg ? (
                                      <img src={displayImg} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <Droplets size={14} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                                    );
                                  })()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, maxWidth: '150px' }}>
                                    {displayName}
                                  </p>
                                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                                    {item.variant_label ? `${item.variant_label} · ` : ''}{item.quantity}x
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                          {remaining > 0 && (
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>+{remaining} produk lainnya</p>
                          )}
                          {items.length === 0 && (
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>-</p>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{order.recipient_name as string}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{order.recipient_phone as string}</p>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{formatRupiah(order.total as number)}</td>
                  <td>
                    <span className="badge" style={{ background: `${status.color}20`, color: status.color }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    {formatDate(order.created_at as string)}
                  </td>
                  <td>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        className="input"
                        style={{ padding: '6px 28px 6px 8px', fontSize: '12px', minWidth: '130px' }}
                        value={order.status as string}
                        onChange={(e) => updateStatus(order.id as string, e.target.value)}
                      >
                        <option value="pending_payment">Menunggu Bayar</option>
                        <option value="paid">Dibayar</option>
                        <option value="processing">Diproses</option>
                        <option value="shipped">Dikirim</option>
                        <option value="delivered">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                      </select>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <Eye size={14} /> Detail
                      </Link>
                      {!!(order.shipping_tracking) && (
                        <button
                          onClick={() => setPrintOrder(order)}
                          title="Cetak Resi"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--color-text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          <Printer size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredOrders.length === 0 && (
              <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Tidak ada pesanan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print Label Modal */}
      {printOrder && printOrder.shipping_tracking && (
        <PrintLabel
          order={printOrder as any}
          items={(printOrder.items || []) as any}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  )
}
