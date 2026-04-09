'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Loader2, Save, ArrowLeft, Upload, X, GripVertical, ImagePlus, Plus, Trash2, MoreVertical, Pencil } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface UploadedImage {
  id?: string
  url: string
  path?: string
  is_primary: boolean
  sort_order: number
}

interface VariantRow {
  id?: string
  ml: string
  price: string
  compare_price: string
  stock: string
  weight: string
  is_active: boolean
}

const PRESET_SIZES = [30, 50, 100]

interface Props {
  initialData?: Record<string, unknown>
  isEdit?: boolean
}

export default function ProductForm({ initialData, isEdit }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [images, setImages] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null)
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: (initialData?.name as string) || '',
    slug: (initialData?.slug as string) || '',
    description: (initialData?.description as string) || '',
    short_description: (initialData?.short_description as string) || '',
    price: (initialData?.price as number) || 0,
    compare_price: (initialData?.compare_price as number) || 0,
    stock: (initialData?.stock as number) || 0,
    weight: (initialData?.weight as number) || 200,
    category_id: (initialData?.category_id as string) || '',
    is_active: initialData?.is_active !== false,
    is_featured: (initialData?.is_featured as boolean) || false,
  })

  useEffect(() => {
    loadCategories()
    if (isEdit && initialData?.id) {
      loadExistingImages(initialData.id as string)
      loadExistingVariants(initialData.id as string)
    }
  }, [])

  const loadExistingVariants = async (productId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order')
    if (data && data.length > 0) {
      setVariants(data.map((v: Record<string, unknown>) => ({
        id: v.id as string,
        ml: (v.label as string).replace('ml', ''),
        price: String(v.price),
        compare_price: v.compare_price ? String(v.compare_price) : '',
        stock: String(v.stock),
        weight: String(v.weight),
        is_active: v.is_active as boolean,
      })))
    }
  }

  const addVariant = (ml?: number) => {
    // Auto-fill price from base product price and weight estimate
    const autoWeight = ml ? String(Math.round(150 + (ml * 1.5))) : '200'
    const newVariant: VariantRow = {
      ml: ml ? String(ml) : '',
      price: form.price ? String(form.price) : '',
      compare_price: form.compare_price ? String(form.compare_price) : '',
      stock: form.stock ? String(form.stock) : '0',
      weight: autoWeight,
      is_active: true,
    }
    setVariants(prev => [...prev, newVariant])
    // Auto-open edit for custom (non-preset) variants
    if (!ml) {
      setEditingVariantIndex(variants.length)
    }
  }

  const addPresetVariant = (ml: number) => {
    // Prevent duplicate sizes
    if (variants.some(v => v.ml === String(ml))) {
      toast.error(`Varian ${ml}ml sudah ada`)
      return
    }
    addVariant(ml)
    toast.success(`Varian ${ml}ml ditambahkan`)
  }

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const getVariantWarnings = (v: VariantRow): string[] => {
    const warns: string[] = []
    if (!v.ml || v.ml === '0') warns.push('Ukuran belum diisi')
    if (!v.price || v.price === '0') warns.push('Harga belum diisi')
    if (!v.stock || v.stock === '0') warns.push('Stok 0')
    return warns
  }

  const loadCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('id, name').order('sort_order')
    if (data) setCategories(data)
  }

  const loadExistingImages = async (productId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order')
    if (data) {
      setImages(data.map((img) => ({
        id: img.id,
        url: img.url,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      })))
    }
  }

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: isEdit ? form.slug : slugify(name),
    })
  }

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) {
      toast.error('Hanya file gambar yang diperbolehkan')
      return
    }

    setUploading(true)
    const newImages: UploadedImage[] = []

    for (const file of fileArray) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'products')

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await res.json()

        if (result.success) {
          newImages.push({
            url: result.data.url,
            path: result.data.path,
            is_primary: images.length === 0 && newImages.length === 0,
            sort_order: images.length + newImages.length,
          })
        } else {
          toast.error(`Gagal upload ${file.name}: ${result.error}`)
        }
      } catch {
        toast.error(`Gagal upload ${file.name}`)
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages])
      toast.success(`${newImages.length} foto berhasil diupload`)
    }
    setUploading(false)
  }, [images.length])

  const removeImage = async (index: number) => {
    const img = images[index]
    
    // Try to delete from storage
    if (img.path) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: img.path }),
        })
      } catch {
        // Continue anyway
      }
    }

    // If removing from database (existing image)
    if (img.id) {
      const supabase = createClient()
      await supabase.from('product_images').delete().eq('id', img.id)
    }

    const updated = images.filter((_, i) => i !== index)
    // If removed image was primary, make first one primary
    if (img.is_primary && updated.length > 0) {
      updated[0].is_primary = true
    }
    setImages(updated)
  }

  const setPrimaryImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({
      ...img,
      is_primary: i === index,
    })))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const payload = {
        ...form,
        compare_price: form.compare_price || null,
        category_id: form.category_id || null,
      }

      let productId = initialData?.id as string | undefined

      if (isEdit && productId) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        productId = data.id
      }

      // Save images to product_images table
      if (productId && images.length > 0) {
        // Delete existing images for this product (if editing)
        if (isEdit) {
          await supabase
            .from('product_images')
            .delete()
            .eq('product_id', productId)
        }

        // Insert all current images
        const imageRecords = images.map((img, i) => ({
          product_id: productId,
          url: img.url,
          alt: form.name,
          is_primary: img.is_primary,
          sort_order: i,
        }))

        const { error: imgError } = await supabase
          .from('product_images')
          .insert(imageRecords)

        if (imgError) {
          console.error('Image save error:', imgError)
          toast.error('Produk tersimpan, tapi gagal menyimpan beberapa foto')
        }
      }

      // Save variants
      if (productId) {
        // Delete existing variants
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId)

        // Insert current variants (only those with ml filled)
        const validVariants = variants.filter(v => v.ml.trim() !== '' && v.price.trim() !== '')
        if (validVariants.length > 0) {
          const variantRecords = validVariants.map((v, i) => ({
            product_id: productId,
            label: `${v.ml}ml`,
            price: parseInt(v.price) || 0,
            compare_price: v.compare_price ? parseInt(v.compare_price) : null,
            stock: parseInt(v.stock) || 0,
            weight: parseInt(v.weight) || 200,
            sort_order: i,
            is_active: v.is_active,
          }))

          const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variantRecords)

          if (variantError) {
            console.error('Variant save error:', variantError)
            toast.error('Produk tersimpan, tapi gagal menyimpan varian')
          }
        }
      }

      toast.success(isEdit ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')
      router.push('/admin/products')
      router.refresh()
    } catch (error: unknown) {
      const err = error as { message?: string }
      toast.error(err.message || 'Gagal menyimpan produk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/admin/products" style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '20px',
      }}>
        <ArrowLeft size={16} /> Kembali ke Daftar Produk
      </Link>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>
        {isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
      </h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: '720px' }}>
        {/* Foto Produk */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', fontFamily: 'var(--font-body)' }}>
            Foto Produk
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Upload foto produk (maks 10MB/foto). Foto pertama akan menjadi foto utama. Format: JPG, PNG, WebP.
          </p>

          {/* Image Previews */}
          {images.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {images.map((img, index) => (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: img.is_primary 
                      ? '2px solid var(--color-accent)' 
                      : '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPrimaryImage(index)}
                  title={img.is_primary ? 'Foto utama' : 'Klik untuk jadikan foto utama'}
                >
                  <img
                    src={img.url}
                    alt={`Foto ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Primary badge */}
                  {img.is_primary && (
                    <span style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      background: 'var(--color-accent)',
                      color: 'var(--color-primary)',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      UTAMA
                    </span>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    <X size={14} />
                  </button>
                  {/* Sort order indicator */}
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '32px',
              textAlign: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              background: dragActive ? 'rgba(212,175,55,0.05)' : 'var(--color-bg-secondary)',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              multiple
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={32} style={{ color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Mengupload & mengkonversi ke WebP...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ImagePlus size={24} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                    Klik atau seret foto ke sini
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    JPG, PNG, WebP • Maks 10MB • Otomatis dikonversi ke WebP
                  </p>
                </div>
              </div>
            )}
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Informasi Dasar */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
            Informasi Dasar
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Nama Produk</label>
              <input className="input" required value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Nama parfum" />
            </div>
            <div className="input-group">
              <label className="input-label">Slug URL</label>
              <input className="input" required value={form.slug}
                onChange={(e) => setForm({...form, slug: e.target.value})}
                placeholder="nama-produk-url" />
            </div>
            <div className="input-group">
              <label className="input-label">Deskripsi Singkat</label>
              <input className="input" value={form.short_description}
                onChange={(e) => setForm({...form, short_description: e.target.value})}
                placeholder="Deskripsi singkat 1 baris" />
            </div>
            <div className="input-group">
              <label className="input-label">Deskripsi Lengkap</label>
              <textarea className="input" value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Deskripsi detail produk"
                style={{ minHeight: '120px' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Kategori</label>
              <select className="input" value={form.category_id}
                onChange={(e) => setForm({...form, category_id: e.target.value})}>
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Harga & Stok */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
            Harga & Stok
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">Harga (Rp)</label>
              <input className="input" type="number" required value={form.price}
                onChange={(e) => setForm({...form, price: parseInt(e.target.value) || 0})}
                placeholder="0" />
            </div>
            <div className="input-group">
              <label className="input-label">Harga Coret (Rp)</label>
              <input className="input" type="number" value={form.compare_price || ''}
                onChange={(e) => setForm({...form, compare_price: parseInt(e.target.value) || 0})}
                placeholder="Opsional" />
            </div>
            <div className="input-group">
              <label className="input-label">Stok</label>
              <input className="input" type="number" required value={form.stock}
                onChange={(e) => setForm({...form, stock: parseInt(e.target.value) || 0})}
                placeholder="0" />
            </div>
            <div className="input-group">
              <label className="input-label">Berat (gram)</label>
              <input className="input" type="number" required value={form.weight}
                onChange={(e) => setForm({...form, weight: parseInt(e.target.value) || 0})}
                placeholder="200" />
            </div>
          </div>
        </div>

        {/* Varian Ukuran */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
              Varian Ukuran
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Tambahkan varian ukuran parfum. Harga & stok otomatis diisi dari data produk utama.
            </p>
          </div>

          {/* Preset Quick-Add Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {PRESET_SIZES.map(ml => {
              const exists = variants.some(v => v.ml === String(ml))
              return (
                <button
                  key={ml}
                  type="button"
                  onClick={() => addPresetVariant(ml)}
                  disabled={exists}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: exists ? '1px solid var(--color-border)' : '1.5px dashed var(--color-primary)',
                    background: exists ? 'var(--color-bg-secondary)' : 'transparent',
                    color: exists ? 'var(--color-text-muted)' : 'var(--color-primary)',
                    cursor: exists ? 'default' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    opacity: exists ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {exists ? `✓ ${ml}ml` : `+ ${ml}ml`}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => addVariant()}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              + Ukuran Lain
            </button>
          </div>

          {/* Variant Chips */}
          {variants.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {variants.map((variant, index) => {
                const isEditing = editingVariantIndex === index
                const warnings = getVariantWarnings(variant)
                const hasWarning = warnings.length > 0

                if (isEditing) {
                  // Expanded edit form
                  return (
                    <div key={index} style={{
                      padding: '16px',
                      border: '2px solid var(--color-primary)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-secondary)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>
                          {variant.ml ? `Edit Varian ${variant.ml}ml` : 'Edit Varian Baru'}
                        </span>
                        <button type="button" onClick={() => setEditingVariantIndex(null)}
                          className="btn btn-ghost btn-sm" style={{ fontSize: '12px', gap: '4px' }}>
                          Selesai
                        </button>
                      </div>

                      {hasWarning && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '12px',
                          fontSize: '12px',
                          color: '#b45309',
                        }}>
                          ⚠️ {warnings.join(' · ')}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '10px' }}>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: '11px' }}>Ukuran (ml) *</label>
                          <input className="input" type="number" value={variant.ml}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, ml: e.target.value } : v))}
                            placeholder="50" style={{ fontSize: '13px', fontWeight: 600 }} />
                        </div>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: '11px' }}>Harga (Rp) *</label>
                          <input className="input" type="number" value={variant.price}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, price: e.target.value } : v))}
                            placeholder="0" style={{ fontSize: '13px' }} />
                        </div>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: '11px' }}>Harga Coret</label>
                          <input className="input" type="number" value={variant.compare_price}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, compare_price: e.target.value } : v))}
                            placeholder="Opsional" style={{ fontSize: '13px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: '11px' }}>Stok *</label>
                          <input className="input" type="number" value={variant.stock}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, stock: e.target.value } : v))}
                            placeholder="0" style={{ fontSize: '13px' }} />
                        </div>
                        <div className="input-group">
                          <label className="input-label" style={{ fontSize: '11px' }}>Berat (gram)</label>
                          <input className="input" type="number" value={variant.weight}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, weight: e.target.value } : v))}
                            placeholder="200" style={{ fontSize: '13px' }} />
                        </div>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={variant.is_active}
                            onChange={(e) => setVariants(prev => prev.map((v, i) => i === index ? { ...v, is_active: e.target.checked } : v))} />
                          Aktif (tampil di halaman produk)
                        </label>
                      </div>
                    </div>
                  )
                }

                // Compact chip view
                return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: hasWarning ? '1.5px solid #f59e0b' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: variant.is_active ? 'var(--color-bg-secondary)' : 'var(--color-bg-tertiary, rgba(0,0,0,0.05))',
                    opacity: variant.is_active ? 1 : 0.6,
                    position: 'relative',
                    overflow: 'visible',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-primary)',
                        color: 'var(--color-secondary, #fff)',
                        fontSize: '13px',
                        fontWeight: 700,
                        minWidth: '56px',
                      }}>
                        {variant.ml ? `${variant.ml}ml` : '?'}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          Rp {parseInt(variant.price || '0').toLocaleString('id-ID')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Stok: {variant.stock || 0} · {variant.weight || 200}g
                          {!variant.is_active && ' · Nonaktif'}
                        </span>
                      </div>
                      {hasWarning && (
                        <span style={{ fontSize: '11px', color: '#f59e0b' }}>⚠️</span>
                      )}
                    </div>

                    {/* Three-dot menu */}
                    <div>
                      <button
                        type="button"
                        id={`variant-menu-btn-${index}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuIndex(openMenuIndex === index ? null : index)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'var(--color-text-muted)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {openMenuIndex === index && typeof document !== 'undefined' && createPortal(
                        <>
                          {/* Click-away backdrop */}
                          <div
                            onClick={() => setOpenMenuIndex(null)}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999,
                            }}
                          />
                          {/* Dropdown menu */}
                          <div style={{
                            position: 'fixed',
                            top: (() => {
                              const btn = document.getElementById(`variant-menu-btn-${index}`)
                              if (btn) {
                                const rect = btn.getBoundingClientRect()
                                return rect.bottom + 4
                              }
                              return 0
                            })(),
                            left: (() => {
                              const btn = document.getElementById(`variant-menu-btn-${index}`)
                              if (btn) {
                                const rect = btn.getBoundingClientRect()
                                return rect.right - 130
                              }
                              return 0
                            })(),
                            zIndex: 1000,
                            background: '#fff',
                            border: '1px solid #e5e5e5',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            minWidth: '130px',
                            overflow: 'hidden',
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVariantIndex(index)
                                setOpenMenuIndex(null)
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                color: '#000',
                              }}
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                removeVariant(index)
                                setOpenMenuIndex(null)
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '10px 14px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'inherit',
                                color: '#ef4444',
                              }}
                            >
                              <Trash2 size={14} /> Hapus
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pengaturan */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', fontFamily: 'var(--font-body)' }}>
            Pengaturan
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => setForm({...form, is_active: e.target.checked})} />
              <span style={{ fontSize: '14px' }}>Aktif (tampil di katalog)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_featured}
                onChange={(e) => setForm({...form, is_featured: e.target.checked})} />
              <span style={{ fontSize: '14px' }}>Produk Unggulan (tampil di halaman utama)</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || uploading}>
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Menyimpan...</>
          ) : (
            <><Save size={18} /> {isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}</>
          )}
        </button>
      </form>
    </div>
  )
}
