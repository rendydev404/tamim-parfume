'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2, X, ToggleLeft, ToggleRight, Tag, Percent, DollarSign, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Coupon {
  id: string
  code: string
  description: string | null
  type: 'percentage' | 'fixed'
  value: number
  min_purchase: number
  max_discount: number | null
  usage_limit: number | null
  used_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

const initialForm = {
  code: '',
  description: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  min_purchase: '',
  max_discount: '',
  usage_limit: '',
  is_active: true,
  expires_at: '',
}

function formatRupiah(n: number) {
  return 'Rp' + n.toLocaleString('id-ID')
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => { loadCoupons() }, [])

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons')
      const json = await res.json()
      setCoupons(json.data || [])
    } catch { toast.error('Gagal memuat kupon') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.value) {
      toast.error('Kode dan nilai kupon wajib diisi')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code,
        description: form.description || null,
        type: form.type,
        value: Number(form.value),
        min_purchase: Number(form.min_purchase) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
      }

      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      toast.success(editingId ? 'Kupon diperbarui!' : 'Kupon dibuat!')
      resetForm()
      loadCoupons()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kupon')
    } finally { setSaving(false) }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      type: coupon.type,
      value: String(coupon.value),
      min_purchase: String(coupon.min_purchase),
      max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  const handleToggle = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(coupon.is_active ? 'Kupon dinonaktifkan' : 'Kupon diaktifkan')
      loadCoupons()
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kupon ini? Tindakan ini tidak dapat dibatalkan.')) return
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Kupon dihapus')
      loadCoupons()
    } catch { toast.error('Gagal menghapus kupon') }
  }

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success('Kode disalin!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(initialForm)
  }

  const isExpired = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}><Tag size={22} /> Kelola Kupon</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {coupons.length} kupon terdaftar
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowForm(true) }}
          style={{ gap: '6px' }}
        >
          <Plus size={16} />
          Buat Kupon
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
            onClick={resetForm}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflow: 'auto',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 201,
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>
                {editingId ? 'Edit Kupon' : 'Buat Kupon Baru'}
              </h2>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Code */}
              <div className="input-group">
                <label className="input-label">Kode Kupon *</label>
                <input
                  className="input"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: WELCOME10"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                  required
                />
              </div>

              {/* Description */}
              <div className="input-group">
                <label className="input-label">Deskripsi</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Contoh: Diskon 10% untuk pelanggan baru"
                />
              </div>

              {/* Type + Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Tipe Diskon *</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'percentage' | 'fixed' })}
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Nilai Diskon *</label>
                  <input
                    className="input"
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percentage' ? 'Contoh: 10' : 'Contoh: 20000'}
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* Min Purchase + Max Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Min. Belanja (Rp)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.min_purchase}
                    onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {form.type === 'percentage' && (
                  <div className="input-group">
                    <label className="input-label">Maks. Diskon (Rp)</label>
                    <input
                      className="input"
                      type="number"
                      value={form.max_discount}
                      onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                      placeholder="Opsional"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Usage Limit + Expiry */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Batas Pemakaian</label>
                  <input
                    className="input"
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Kadaluarsa</label>
                  <input
                    className="input"
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: form.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                >
                  {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span style={{ fontSize: '14px' }}>{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
              </div>

              {/* Submit */}
              <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingId ? 'Simpan Perubahan' : 'Buat Kupon'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Coupons List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <Tag size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Belum ada kupon</p>
          <p style={{ fontSize: '14px' }}>Buat kupon pertama untuk menarik pelanggan!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {coupons.map((coupon) => {
            const expired = isExpired(coupon.expires_at)
            return (
              <div
                key={coupon.id}
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  opacity: !coupon.is_active || expired ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Left: Code + Info */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color: 'var(--color-text)',
                      }}>
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.code, coupon.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', display: 'flex' }}
                        title="Salin kode"
                      >
                        {copiedId === coupon.id ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                      </button>
                      {/* Status badges */}
                      {coupon.is_active && !expired && (
                        <span className="badge badge-success">Aktif</span>
                      )}
                      {!coupon.is_active && (
                        <span className="badge badge-muted">Nonaktif</span>
                      )}
                      {expired && (
                        <span className="badge badge-error">Kadaluarsa</span>
                      )}
                    </div>
                    {coupon.description && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        {coupon.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {coupon.type === 'percentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                        {coupon.type === 'percentage' ? `${coupon.value}%` : formatRupiah(coupon.value)}
                      </span>
                      {coupon.min_purchase > 0 && (
                        <span>Min. {formatRupiah(coupon.min_purchase)}</span>
                      )}
                      {coupon.max_discount && (
                        <span>Maks. {formatRupiah(coupon.max_discount)}</span>
                      )}
                      <span>
                        Terpakai: {coupon.used_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
                      </span>
                      {coupon.expires_at && (
                        <span>
                          Exp: {new Date(coupon.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggle(coupon)}
                      title={coupon.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: coupon.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}
                    >
                      {coupon.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      title="Edit"
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      title="Hapus"
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--color-error)',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
