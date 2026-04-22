'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Loader2, Search, X, CheckCircle, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadReturns()
  }, [])

  const loadReturns = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('returns')
      .select('*, order:orders(order_number, recipient_name, recipient_phone, total, items:order_items(product_name, quantity))')
      .order('created_at', { ascending: false })
    
    setReturns(data || [])
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes || adminNotes })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success('Status retur diperbarui')
      setSelectedReturn(null)
      setAdminNotes('')
      loadReturns()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui status')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredReturns = returns.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const orderNum = (r.order?.order_number || '').toLowerCase()
      const name = (r.order?.recipient_name || '').toLowerCase()
      if (!orderNum.includes(q) && !name.includes(q)) return false
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="badge badge-warning">Menunggu Konfirmasi</span>
      case 'approved': return <span className="badge badge-success">Disetujui (Menunggu Resi)</span>
      case 'returning': return <span className="badge badge-primary">Barang Dikirim Balik</span>
      case 'completed': return <span className="badge badge-secondary">Selesai (Refund/Tukar)</span>
      case 'rejected': return <span className="badge badge-error">Ditolak</span>
      default: return <span className="badge badge-muted">{status}</span>
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Kelola Retur</h1>
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no pesanan, nama..."
            style={{ paddingLeft: '36px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>
          Semua ({returns.length})
        </button>
        <button className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('pending')}>
          Menunggu ({returns.filter(r => r.status === 'pending').length})
        </button>
        <button className={`btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('approved')}>
          Disetujui ({returns.filter(r => r.status === 'approved').length})
        </button>
        <button className={`btn btn-sm ${filter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('rejected')}>
          Ditolak ({returns.filter(r => r.status === 'rejected').length})
        </button>
        <button className={`btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('completed')}>
          Selesai ({returns.filter(r => r.status === 'completed').length})
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>No. Pesanan</th>
              <th>Pemesan</th>
              <th>Alasan</th>
              <th>Status</th>
              <th>Tanggal Ajuan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/admin/orders/${r.order_id}`} style={{ color: 'var(--color-primary)' }}>
                    #{r.order?.order_number}
                  </Link>
                </td>
                <td>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '13px' }}>{r.order?.recipient_name}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.order?.recipient_phone}</p>
                </td>
                <td style={{ fontSize: '13px' }}>{r.reason}</td>
                <td>{getStatusBadge(r.status)}</td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{formatDate(r.created_at)}</td>
                <td>
                  <Link href={`/admin/orders/${r.order_id}`} className="btn btn-secondary btn-sm">
                    <Eye size={14} /> Review di Detail Pesanan
                  </Link>
                </td>
              </tr>
            ))}
            {filteredReturns.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Tidak ada data retur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
