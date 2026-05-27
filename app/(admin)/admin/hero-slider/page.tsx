'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sliders, Plus, Trash2, Loader2, GripVertical,
  Eye, EyeOff, Pencil, X, Upload, Image as ImageIcon,
  ChevronUp, ChevronDown, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface HeroSlide {
  id: string
  product_id: string | null
  custom_image_url: string | null
  title: string
  subtitle: string | null
  description: string | null
  cta_text: string
  cta_link: string | null
  bg_color_from: string
  bg_color_to: string
  accent_color: string
  text_color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface SlideFormData {
  title: string
  subtitle: string
  description: string
  cta_text: string
  cta_link: string
  bg_color_from: string
  bg_color_to: string
  accent_color: string
  text_color: string
  custom_image_url: string
}

const defaultForm: SlideFormData = {
  title: '',
  subtitle: '',
  description: '',
  cta_text: 'Beli Sekarang',
  cta_link: '',
  bg_color_from: '#1a0a2e',
  bg_color_to: '#0d0015',
  accent_color: '#d4af37',
  text_color: '#ffffff',
  custom_image_url: '',
}

export default function AdminHeroSliderPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [form, setForm] = useState<SlideFormData>(defaultForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadSlides() }, [])

  const loadSlides = async () => {
    try {
      const res = await fetch('/api/admin/hero-slider')
      const json = await res.json()
      setSlides(json.data || [])
    } catch {
      toast.error('Gagal memuat data slides')
    } finally {
      setLoading(false)
    }
  }

  // Open form for new slide
  const openNewForm = () => {
    setEditingSlide(null)
    setForm(defaultForm)
    setShowForm(true)
  }

  // Open form for editing
  const openEditForm = (slide: HeroSlide) => {
    setEditingSlide(slide)
    setForm({
      title: slide.title,
      subtitle: slide.subtitle || '',
      description: slide.description || '',
      cta_text: slide.cta_text || 'Beli Sekarang',
      cta_link: slide.cta_link || '',
      bg_color_from: slide.bg_color_from,
      bg_color_to: slide.bg_color_to,
      accent_color: slide.accent_color || '#d4af37',
      text_color: slide.text_color || '#ffffff',
      custom_image_url: slide.custom_image_url || '',
    })
    setShowForm(true)
  }

  // Close form
  const closeForm = () => {
    setShowForm(false)
    setEditingSlide(null)
    setForm(defaultForm)
  }

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 10MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/hero-slider/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      setForm(prev => ({ ...prev, custom_image_url: json.url }))
      toast.success('Gambar berhasil diupload')
    } catch {
      toast.error('Gagal mengupload gambar')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Save slide (create or update)
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Judul slide wajib diisi')
      return
    }

    if (!form.custom_image_url.trim()) {
      toast.error('Gambar produk wajib diupload')
      return
    }

    setSaving(true)
    try {
      if (editingSlide) {
        // Update
        const res = await fetch(`/api/admin/hero-slider/${editingSlide.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Slide berhasil diperbarui')
      } else {
        // Create
        const res = await fetch('/api/admin/hero-slider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success('Slide baru berhasil ditambahkan')
      }

      closeForm()
      loadSlides()
    } catch {
      toast.error('Gagal menyimpan slide')
    } finally {
      setSaving(false)
    }
  }

  // Toggle active
  const handleToggle = async (slide: HeroSlide) => {
    try {
      const res = await fetch(`/api/admin/hero-slider/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !slide.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(slide.is_active ? 'Slide dinonaktifkan' : 'Slide diaktifkan')
      loadSlides()
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  // Delete slide
  const handleDelete = async (slide: HeroSlide) => {
    if (!window.confirm(`Hapus slide "${slide.title}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return

    try {
      const res = await fetch(`/api/admin/hero-slider/${slide.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Slide berhasil dihapus')
      loadSlides()
    } catch {
      toast.error('Gagal menghapus slide')
    }
  }

  // Move slide up/down
  const handleMove = async (slide: HeroSlide, direction: 'up' | 'down') => {
    const idx = slides.findIndex(s => s.id === slide.id)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === slides.length - 1)) return

    const newSlides = [...slides]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1

    // Swap sort_order
    const tempOrder = newSlides[idx].sort_order
    newSlides[idx].sort_order = newSlides[swapIdx].sort_order
    newSlides[swapIdx].sort_order = tempOrder

    // Swap positions in array
    ;[newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]]
    setSlides(newSlides)

    try {
      await fetch('/api/admin/hero-slider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newSlides.map((s, i) => ({ id: s.id, sort_order: i })),
        }),
      })
    } catch {
      toast.error('Gagal mengubah urutan')
      loadSlides()
    }
  }

  const activeCount = slides.filter(s => s.is_active).length

  return (
    <div>
      <style>{`
        .hs-color-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hs-color-input {
          width: 48px;
          height: 40px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          padding: 2px;
          background: transparent;
        }
        .hs-color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .hs-color-input::-webkit-color-swatch {
          border: none;
          border-radius: 4px;
        }
        .hs-preview {
          border-radius: var(--radius-lg);
          overflow: hidden;
          position: relative;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hs-preview__img {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.4);
          position: relative;
          z-index: 2;
        }
        .hs-preview__text {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          text-align: right;
        }
        .hs-slide-card {
          display: flex;
          gap: 16px;
          align-items: stretch;
          padding: 16px;
          background: var(--color-bg);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }
        .hs-slide-card:hover {
          border-color: var(--color-border);
        }
        .hs-slide-thumb {
          width: 120px;
          height: 90px;
          border-radius: var(--radius-md);
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
        }
        .hs-slide-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hs-slide-colors {
          display: flex;
          gap: 4px;
          margin-top: 4px;
        }
        .hs-slide-color-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid rgba(128,128,128,0.3);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={22} /> Hero Slider
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {slides.length} slide · {activeCount} aktif
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openNewForm}
          style={{ gap: '6px' }}
        >
          <Plus size={16} /> Tambah Slide
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Slide Form Modal/Panel */}
          {showForm && (
            <div style={{
              background: 'var(--color-bg)',
              border: '2px solid var(--color-accent)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                  {editingSlide ? `Edit: ${editingSlide.title}` : 'Tambah Slide Baru'}
                </h3>
                <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Live Preview */}
              <div className="hs-preview" style={{
                background: `linear-gradient(135deg, ${form.bg_color_from} 0%, ${form.bg_color_to} 100%)`,
                marginBottom: '20px',
              }}>
                {form.custom_image_url ? (
                  <img src={form.custom_image_url} alt="Preview" className="hs-preview__img" />
                ) : (
                  <div style={{
                    width: '120px', height: '120px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 2,
                  }}>
                    <ImageIcon size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                )}
                <div className="hs-preview__text">
                  <p style={{ color: form.text_color, fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-playfair), serif' }}>
                    {form.title || 'Nama Produk'}
                  </p>
                  {form.subtitle && (
                    <p style={{ color: form.text_color, fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                      {form.subtitle}
                    </p>
                  )}
                  {form.cta_text && (
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      background: form.accent_color,
                      color: form.bg_color_from,
                      fontSize: '11px',
                      fontWeight: 600,
                      marginTop: '8px',
                    }}>
                      {form.cta_text}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Image Upload */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Gambar Produk *</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        flex: 1,
                        opacity: uploading ? 0.5 : 1,
                      }}
                      onClick={() => !uploading && fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      {uploading ? (
                        <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} />
                      ) : (
                        <>
                          <Upload size={20} style={{ color: 'var(--color-text-muted)', margin: '0 auto 4px' }} />
                          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {form.custom_image_url ? 'Ganti gambar' : 'Upload gambar produk'}
                          </p>
                        </>
                      )}
                    </div>
                    {form.custom_image_url && (
                      <img
                        src={form.custom_image_url}
                        alt="Preview"
                        style={{
                          width: '64px', height: '64px',
                          objectFit: 'cover', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="input-group">
                  <label className="input-label">Judul Slide *</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Jardin De Flores"
                  />
                </div>

                {/* Subtitle */}
                <div className="input-group">
                  <label className="input-label">Subtitle</label>
                  <input
                    className="input"
                    value={form.subtitle}
                    onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Contoh: Eau De Parfum 50ml"
                  />
                </div>

                {/* Description */}
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Deskripsi</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deskripsi singkat produk..."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* CTA Text */}
                <div className="input-group">
                  <label className="input-label">Teks Tombol</label>
                  <input
                    className="input"
                    value={form.cta_text}
                    onChange={e => setForm(prev => ({ ...prev, cta_text: e.target.value }))}
                    placeholder="Beli Sekarang"
                  />
                </div>

                {/* CTA Link */}
                <div className="input-group">
                  <label className="input-label">Link Tombol</label>
                  <input
                    className="input"
                    value={form.cta_link}
                    onChange={e => setForm(prev => ({ ...prev, cta_link: e.target.value }))}
                    placeholder="/products/nama-produk"
                  />
                </div>

                {/* Colors */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label" style={{ marginBottom: '12px', display: 'block' }}>Warna</label>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Background Awal</p>
                      <div className="hs-color-row">
                        <input
                          type="color"
                          className="hs-color-input"
                          value={form.bg_color_from}
                          onChange={e => setForm(prev => ({ ...prev, bg_color_from: e.target.value }))}
                        />
                        <input
                          className="input"
                          value={form.bg_color_from}
                          onChange={e => setForm(prev => ({ ...prev, bg_color_from: e.target.value }))}
                          style={{ width: '100px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Background Akhir</p>
                      <div className="hs-color-row">
                        <input
                          type="color"
                          className="hs-color-input"
                          value={form.bg_color_to}
                          onChange={e => setForm(prev => ({ ...prev, bg_color_to: e.target.value }))}
                        />
                        <input
                          className="input"
                          value={form.bg_color_to}
                          onChange={e => setForm(prev => ({ ...prev, bg_color_to: e.target.value }))}
                          style={{ width: '100px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Warna Aksen</p>
                      <div className="hs-color-row">
                        <input
                          type="color"
                          className="hs-color-input"
                          value={form.accent_color}
                          onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                        />
                        <input
                          className="input"
                          value={form.accent_color}
                          onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                          style={{ width: '100px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Warna Teks</p>
                      <div className="hs-color-row">
                        <input
                          type="color"
                          className="hs-color-input"
                          value={form.text_color}
                          onChange={e => setForm(prev => ({ ...prev, text_color: e.target.value }))}
                        />
                        <input
                          className="input"
                          value={form.text_color}
                          onChange={e => setForm(prev => ({ ...prev, text_color: e.target.value }))}
                          style={{ width: '100px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={closeForm} disabled={saving}>
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || uploading}
                  style={{ gap: '6px' }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingSlide ? 'Simpan Perubahan' : 'Tambah Slide'}
                </button>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: activeCount > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            background: activeCount > 0 ? 'rgba(34, 197, 94, 0.06)' : 'rgba(59, 130, 246, 0.06)',
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '13px',
          }}>
            {activeCount > 0 ? (
              <>
                <Eye size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span><strong>{activeCount}</strong> slide aktif ditampilkan di homepage</span>
              </>
            ) : (
              <>
                <EyeOff size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span>Tidak ada slide aktif. Hero section akan menampilkan fallback.</span>
              </>
            )}
          </div>

          {/* Slides List */}
          {slides.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
              <Sliders size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p style={{ fontWeight: 500, marginBottom: '4px' }}>Belum ada slide</p>
              <p style={{ fontSize: '13px' }}>Tambah slide pertama dengan tombol di atas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="hs-slide-card"
                  style={{
                    borderColor: slide.is_active ? 'var(--color-accent)' : undefined,
                    borderWidth: slide.is_active ? '2px' : undefined,
                    opacity: slide.is_active ? 1 : 0.7,
                  }}
                >
                  {/* Thumbnail with gradient preview */}
                  <div className="hs-slide-thumb">
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(135deg, ${slide.bg_color_from}, ${slide.bg_color_to})`,
                      zIndex: 0,
                    }} />
                    {(slide.custom_image_url) && (
                      <img
                        src={slide.custom_image_url}
                        alt={slide.title}
                        style={{ position: 'relative', zIndex: 1 }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{slide.title}</h4>
                      {slide.is_active && (
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>
                          AKTIF
                        </span>
                      )}
                    </div>
                    {slide.subtitle && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                        {slide.subtitle}
                      </p>
                    )}
                    <div className="hs-slide-colors">
                      <div className="hs-slide-color-dot" style={{ background: slide.bg_color_from }} title="BG from" />
                      <div className="hs-slide-color-dot" style={{ background: slide.bg_color_to }} title="BG to" />
                      <div className="hs-slide-color-dot" style={{ background: slide.accent_color }} title="Accent" />
                      <div className="hs-slide-color-dot" style={{ background: slide.text_color }} title="Text" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0, justifyContent: 'center' }}>
                    {/* Move Up/Down */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMove(slide, 'up')}
                        disabled={idx === 0}
                        title="Geser ke atas"
                        style={{
                          background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          opacity: idx === 0 ? 0.3 : 1,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(slide, 'down')}
                        disabled={idx === slides.length - 1}
                        title="Geser ke bawah"
                        style={{
                          background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: idx === slides.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: idx === slides.length - 1 ? 0.3 : 1,
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Edit / Toggle / Delete */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => openEditForm(slide)}
                        title="Edit"
                        style={{
                          background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--color-text-muted)',
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleToggle(slide)}
                        title={slide.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        style={{
                          background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: slide.is_active ? '#22c55e' : 'var(--color-text-muted)',
                        }}
                      >
                        {slide.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(slide)}
                        title="Hapus"
                        style={{
                          background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)', width: '30px', height: '30px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--color-error)',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
