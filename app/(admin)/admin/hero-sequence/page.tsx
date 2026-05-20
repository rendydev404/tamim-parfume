'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Film, Upload, Trash2, Loader2, CheckCircle2,
  AlertCircle, Image as ImageIcon, FileArchive,
  ToggleLeft, ToggleRight, Play,
} from 'lucide-react'
import toast from 'react-hot-toast'
import JSZip from 'jszip'

interface HeroSequence {
  id: string
  name: string
  session_id: string
  folder: string
  frame_count: number
  base_url: string
  is_active: boolean
  created_at: string
}

export default function AdminHeroSequencePage() {
  const [sequences, setSequences] = useState<HeroSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' })
  const [uploadName, setUploadName] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadSequences() }, [])

  const loadSequences = async () => {
    try {
      const res = await fetch('/api/admin/hero-sequence')
      const json = await res.json()
      setSequences(json.data || [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('File harus berformat .zip')
      return
    }

    const seqName = uploadName.trim() || `Sequence ${new Date().toLocaleDateString('id-ID')}`

    setUploading(true)
    try {
      setProgress({ current: 0, total: 0, phase: 'Membaca file ZIP...' })
      const arrayBuffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      const imageEntries: { name: string; entry: JSZip.JSZipObject }[] = []
      zip.forEach((relativePath, entry) => {
        if (entry.dir) return
        const fileName = relativePath.split('/').pop() || relativePath
        if (relativePath.includes('__MACOSX') || fileName.startsWith('.')) return
        const lower = fileName.toLowerCase()
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) {
          imageEntries.push({ name: relativePath, entry })
        }
      })

      imageEntries.sort((a, b) => {
        const nameA = a.name.split('/').pop() || a.name
        const nameB = b.name.split('/').pop() || b.name
        return nameA.localeCompare(nameB, undefined, { numeric: true })
      })

      if (imageEntries.length === 0) {
        toast.error('Tidak ada file gambar di dalam ZIP')
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
      const total = imageEntries.length
      let successCount = 0
      let errorCount = 0

      setProgress({ current: 0, total, phase: 'Mengupload frame...' })

      const BATCH_SIZE = 3
      for (let i = 0; i < imageEntries.length; i += BATCH_SIZE) {
        const batch = imageEntries.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (item, batchIdx) => {
            const frameIdx = i + batchIdx
            const frameNum = String(frameIdx + 1).padStart(4, '0')
            try {
              const blob = await item.entry.async('blob')
              const formData = new FormData()
              formData.append('file', blob, `frame-${frameNum}.jpg`)
              formData.append('frameNum', frameNum)
              formData.append('sessionId', sessionId)

              const res = await fetch('/api/admin/hero-sequence/upload-frame', {
                method: 'POST',
                body: formData,
              })
              if (!res.ok) throw new Error()
              successCount++
            } catch {
              errorCount++
            }
            setProgress({ current: successCount + errorCount, total, phase: 'Mengupload frame...' })
          })
        )
      }

      if (successCount === 0) {
        toast.error('Semua frame gagal diupload')
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      setProgress({ current: total, total, phase: 'Menyimpan...' })
      const metaRes = await fetch('/api/admin/hero-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, frameCount: successCount, name: seqName }),
      })

      if (!metaRes.ok) {
        toast.error('Gagal menyimpan metadata')
      } else {
        toast.success(`"${seqName}" berhasil diupload! (${successCount} frame)`, { duration: 5000 })
      }

      setUploadName('')
      setShowUpload(false)
      loadSequences()
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Gagal memproses file')
    } finally {
      setUploading(false)
      setProgress({ current: 0, total: 0, phase: '' })
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleToggle = async (seq: HeroSequence) => {
    const newActive = !seq.is_active
    try {
      const res = await fetch(`/api/admin/hero-sequence/${seq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (!res.ok) throw new Error()
      toast.success(newActive ? `"${seq.name}" diaktifkan` : `"${seq.name}" dinonaktifkan`)
      loadSequences()
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  const handleDelete = async (seq: HeroSequence) => {
    if (!window.confirm(`Hapus "${seq.name}"?\n\nSemua frame akan dihapus permanen.`)) return
    try {
      const res = await fetch(`/api/admin/hero-sequence/${seq.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(`"${seq.name}" dihapus`)
      loadSequences()
    } catch {
      toast.error('Gagal menghapus')
    }
  }

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const activeSeq = sequences.find(s => s.is_active)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Film size={22} /> Hero Image Sequence
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {sequences.length} sequence tersimpan · {activeSeq ? `"${activeSeq.name}" aktif` : 'Menggunakan default'}
          </p>
        </div>
        {!uploading && (
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(!showUpload)}
            style={{ gap: '6px' }}
          >
            <Upload size={16} /> Upload Baru
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Upload Form */}
          {showUpload && (
            <div style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileArchive size={16} /> Upload Sequence Baru
              </h3>

              {/* Guide */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                <strong>Cara:</strong> Buka <a href="https://ezgif.com/video-to-jpg" target="_blank" rel="noopener" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>ezgif.com/video-to-jpg</a> → upload video → convert → download ZIP → upload di sini
              </div>

              {/* Name input */}
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label className="input-label">Nama Sequence</label>
                <input
                  className="input"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  placeholder="Contoh: Jardin De Flores, TAMIM Blue, dll"
                  disabled={uploading}
                />
              </div>

              {/* Upload area */}
              {uploading ? (
                <div style={{
                  border: '2px solid #000',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 24px',
                  textAlign: 'center',
                }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: '#000', marginBottom: '12px' }} />
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>{progress.phase}</p>
                  {progress.total > 0 && (
                    <>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                        {progress.current} / {progress.total} frame ({progressPercent}%)
                      </p>
                      <div style={{
                        width: '100%', height: '8px',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: '4px', overflow: 'hidden',
                        maxWidth: '400px', margin: '0 auto',
                      }}>
                        <div style={{
                          width: `${progressPercent}%`, height: '100%',
                          background: '#000',
                          borderRadius: '4px', transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".zip"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                  />
                  <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>Klik untuk pilih file ZIP</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>JPG/PNG/WebP · Maks 500 frame</p>
                </div>
              )}
            </div>
          )}

          {/* Active Status */}
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid',
            borderColor: activeSeq ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
            background: activeSeq ? 'rgba(34, 197, 94, 0.06)' : 'rgba(59, 130, 246, 0.06)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {activeSeq ? (
              <>
                <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontSize: '13px' }}>
                  <strong>{activeSeq.name}</strong> sedang aktif ({activeSeq.frame_count} frame)
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: '13px' }}>Menggunakan <strong>frame default</strong> (/public/sequnece/)</span>
              </>
            )}
          </div>

          {/* Sequence List */}
          {sequences.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-text-muted)' }}>
              <Film size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p style={{ fontWeight: 500, marginBottom: '4px' }}>Belum ada sequence</p>
              <p style={{ fontSize: '13px' }}>Upload sequence pertama dengan tombol di atas</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sequences.map(seq => (
                <div
                  key={seq.id}
                  style={{
                    background: 'var(--color-bg)',
                    border: seq.is_active ? '2px solid var(--color-accent)' : '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    opacity: seq.is_active ? 1 : 0.85,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '120px', height: '80px', flexShrink: 0,
                      borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      background: '#000',
                    }}>
                      <img
                        src={`${seq.base_url}frame-0001.webp`}
                        alt={seq.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{seq.name}</h4>
                        {seq.is_active && (
                          <span className="badge badge-success" style={{ fontSize: '10px' }}>
                            <Play size={10} style={{ marginRight: '2px' }} /> AKTIF
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {seq.frame_count} frame · {new Date(seq.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggle(seq)}
                        title={seq.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        style={{
                          background: 'none',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          width: '36px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: seq.is_active ? 'var(--color-success)' : 'var(--color-text-muted)',
                        }}
                      >
                        {seq.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => handleDelete(seq)}
                        title="Hapus"
                        style={{
                          background: 'none',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          width: '36px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--color-error)',
                        }}
                      >
                        <Trash2 size={16} />
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
