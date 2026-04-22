'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, UploadCloud, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Props {
  orderId: string
  deliveredAt: string | null
}

export default function ReturnOrderButton({ orderId, deliveredAt }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [proofs, setProofs] = useState<string[]>([])
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if eligible
  if (!deliveredAt) return null
  const deliveredDate = new Date(deliveredAt)
  const now = new Date()
  const diffHours = (now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60)
  
  // Return limit is 3 days (72 hours)
  if (diffHours > 72) return null

  const remainingHours = Math.floor(72 - diffHours)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (proofs.length + files.length > 3) {
      toast.error('Maksimal 3 file bukti')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const newProofs: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (maks 50MB)`)
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `returns/${orderId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) {
        toast.error(`Gagal upload ${file.name}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)
      
      newProofs.push(publicUrl)
    }

    if (newProofs.length > 0) {
      setProofs((prev) => [...prev, ...newProofs])
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeProof = (index: number) => {
    setProofs(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
      toast.error('Alasan retur wajib dipilih')
      return
    }
    if (proofs.length === 0) {
      toast.error('Bukti foto/video wajib disertakan')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/user/orders/${orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details, proof_images: proofs })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success('Pengajuan retur berhasil dikirim')
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', borderLeft: '3px solid var(--color-warning)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertCircle size={16} style={{ color: 'var(--color-warning)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning-dark)' }}>Garansi Tiba (3 Hari)</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>
          Pesanan telah diterima. Jika ada masalah (rusak, bocor, salah kirim), Anda dapat mengajukan retur dalam {remainingHours} jam ke depan.
        </p>
        <button className="btn btn-secondary btn-sm" onClick={() => setIsOpen(true)}>
          Ajukan Retur Barang
        </button>
      </div>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Pengajuan Retur Barang</h3>
              <button className="modal-close" onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Alasan Retur</label>
                  <select className="input" value={reason} onChange={e => setReason(e.target.value)} required>
                    <option value="">Pilih Alasan</option>
                    <option value="Botol Pecah/Bocor">Botol Pecah/Bocor</option>
                    <option value="Produk Salah/Tidak Sesuai">Produk Salah/Tidak Sesuai</option>
                    <option value="Produk Kurang">Produk Kurang</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Detail Masalah (Opsional)</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    placeholder="Ceritakan detail masalah produk..."
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bukti Foto / Video (Maks 3)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                    {proofs.map((url, i) => {
                      const isVid = /\.(mp4|webm|ogg|mov)$/i.test(url)
                      return (
                        <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                          {isVid ? (
                            <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <img src={url} alt={`Bukti ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                          <button
                            type="button"
                            onClick={() => removeProof(i)}
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer', display: 'flex' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                    {proofs.length < 3 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                          width: '80px', height: '80px', borderRadius: '8px', border: '1px dashed var(--color-border)',
                          background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          cursor: uploading ? 'not-allowed' : 'pointer', color: 'var(--color-text-muted)'
                        }}
                      >
                        {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                        <span style={{ fontSize: '10px', marginTop: '4px' }}>Upload</span>
                      </button>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Wajib melampirkan video unboxing atau foto yang jelas.</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)} disabled={submitting}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
                    {submitting ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : 'Kirim Pengajuan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
