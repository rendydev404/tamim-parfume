'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Loader2, X, ToggleLeft, ToggleRight,
  Megaphone, Eye, Calendar, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Promo {
  id: string
  title: string
  message: string
  link_url: string | null
  link_text: string
  bg_color: string
  text_color: string
  accent_color: string
  is_active: boolean
  start_date: string | null
  end_date: string | null
  priority: number
  created_at: string
}

const initialForm = {
  title: '',
  message: '',
  link_url: '',
  link_text: 'Belanja',
  bg_color: '#1a1a1a',
  text_color: '#ffffff',
  accent_color: '#d4a574',
  is_active: true,
  start_date: '',
  end_date: '',
  priority: '0',
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)


  useEffect(() => { loadPromos() }, [])

  const loadPromos = async () => {
    try {
      const res = await fetch('/api/admin/promos')
      const json = await res.json()
      setPromos(json.data || [])
    } catch { toast.error('Gagal memuat promo') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.message) {
      toast.error('Judul dan pesan wajib diisi')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        message: form.message,
        display_type: 'banner',
        link_url: form.link_url || null,
        link_text: form.link_text || 'Belanja',
        bg_color: form.bg_color,
        text_color: form.text_color,
        accent_color: form.accent_color,
        is_active: form.is_active,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        priority: Number(form.priority) || 0,
      }

      const url = editingId ? `/api/admin/promos/${editingId}` : '/api/admin/promos'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success(editingId ? 'Promo diperbarui!' : 'Promo dibuat!')
      resetForm()
      loadPromos()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan promo')
    } finally { setSaving(false) }
  }

  const handleEdit = (promo: Promo) => {
    setEditingId(promo.id)
    setForm({
      title: promo.title,
      message: promo.message,
      link_url: promo.link_url || '',
      link_text: promo.link_text || 'Belanja',
      bg_color: promo.bg_color,
      text_color: promo.text_color,
      accent_color: promo.accent_color,
      is_active: promo.is_active,
      start_date: promo.start_date ? promo.start_date.slice(0, 10) : '',
      end_date: promo.end_date ? promo.end_date.slice(0, 10) : '',
      priority: String(promo.priority),
    })
    setShowForm(true)
  }

  const handleToggle = async (promo: Promo) => {
    try {
      const res = await fetch(`/api/admin/promos/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !promo.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(promo.is_active ? 'Promo dinonaktifkan' : 'Promo diaktifkan')
      loadPromos()
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus promo ini?')) return
    try {
      const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Promo dihapus')
      loadPromos()
    } catch { toast.error('Gagal menghapus') }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(initialForm)
    setPreviewMode(false)
  }

  const isScheduled = (promo: Promo) => {
    const now = new Date()
    if (promo.start_date && new Date(promo.start_date) > now) return 'scheduled'
    if (promo.end_date && new Date(promo.end_date) <= now) return 'expired'
    return promo.is_active ? 'active' : 'inactive'
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={22} /> Kelola Promo
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{promos.length} promo terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true) }} style={{ gap: '6px' }}>
          <Plus size={16} /> Buat Promo
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} onClick={resetForm} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: '580px', maxHeight: '90vh', overflow: 'auto',
            background: 'var(--color-bg)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)',
            zIndex: 201, padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>{editingId ? 'Edit Promo' : 'Buat Promo Baru'}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', background: previewMode ? 'var(--color-bg-secondary)' : 'transparent',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  <Eye size={14} /> Preview
                </button>
                <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview */}
            {previewMode && (
              <div style={{ marginBottom: '20px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  padding: '10px 16px', background: form.bg_color, color: form.text_color, fontSize: '13px',
                }}>
                  <span dangerouslySetInnerHTML={{ __html: form.message || 'Pesan promo...' }} />
                  {form.link_url && (
                    <span style={{ color: form.accent_color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {form.link_text} <ArrowRight size={12} />
                    </span>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title + Message */}
              <div className="input-group">
                <label className="input-label">Judul *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Promo Akhir Tahun" required />
              </div>
              <div className="input-group">
                <label className="input-label">Pesan * <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>(HTML diperbolehkan, misal: &lt;strong&gt;KODE&lt;/strong&gt;)</span></label>
                <textarea className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder='Contoh: Gunakan kode <strong>SALE50</strong> diskon 50%!'
                  style={{ minHeight: '70px' }} required />
              </div>

              {/* Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Link URL</label>
                  <input className="input" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/products" />
                </div>
                <div className="input-group">
                  <label className="input-label">Teks Tombol</label>
                  <input className="input" value={form.link_text} onChange={(e) => setForm({ ...form, link_text: e.target.value })} placeholder="Belanja" />
                </div>
              </div>

              {/* Colors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Background</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0 }} />
                    <input className="input" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })} style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Teks</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0 }} />
                    <input className="input" value={form.text_color} onChange={(e) => setForm({ ...form, text_color: e.target.value })} style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Aksen</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      style={{ width: '36px', height: '36px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: 0 }} />
                    <input className="input" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} style={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Mulai</label>
                  <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Berakhir</label>
                  <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Prioritas</label>
                  <input className="input" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="0" min="0" />
                </div>
              </div>

              {/* Active */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: form.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
                <span style={{ fontSize: '14px' }}>{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingId ? 'Simpan Perubahan' : 'Buat Promo'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Promo List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : promos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <Megaphone size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Belum ada promo</p>
          <p style={{ fontSize: '14px' }}>Buat promo pertama untuk menarik pelanggan!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {promos.map((promo) => {
            const status = isScheduled(promo)
            return (
              <div key={promo.id} style={{
                background: 'var(--color-bg)', border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                opacity: status === 'inactive' || status === 'expired' ? 0.6 : 1,
              }}>
                {/* Mini preview */}
                <div style={{
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px',
                  fontSize: '12px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '6px 12px', background: promo.bg_color, color: promo.text_color,
                  }}>
                    <span dangerouslySetInnerHTML={{ __html: promo.message }} style={{ fontSize: '11px' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{promo.title}</span>
                      {status === 'active' && <span className="badge badge-success">Aktif</span>}
                      {status === 'inactive' && <span className="badge badge-muted">Nonaktif</span>}
                      {status === 'scheduled' && <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>Terjadwal</span>}
                      {status === 'expired' && <span className="badge badge-error">Berakhir</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {(promo.start_date || promo.end_date) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />
                          {promo.start_date ? new Date(promo.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'}
                          {' — '}
                          {promo.end_date ? new Date(promo.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'}
                        </span>
                      )}
                      <span>Prioritas: {promo.priority}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleToggle(promo)} title={promo.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: promo.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {promo.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleEdit(promo)} title="Edit"
                      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(promo.id)} title="Hapus"
                      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-error)' }}>
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
