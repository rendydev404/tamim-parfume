'use client'

import { useState } from 'react'
import { Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Change this to your WhatsApp number (with country code, no +)
const WHATSAPP_NUMBER = '6285885497377'

export default function ContactForm() {
  const [form, setForm] = useState({
    nama: '',
    telepon: '',
    pesan: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build WhatsApp message
    const message = [
      `*Pesan dari Form Hubungi Kami*`,
      ``,
      `📛 *Nama:* ${form.nama}`,
      `📱 *No. Telepon:* ${form.telepon}`,
      ``,
      `💬 *Pesan:*`,
      form.pesan,
    ].join('\n')

    const encodedMessage = encodeURIComponent(message)
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Nama */}
      <div className="input-group">
        <label className="input-label" htmlFor="contact-nama">Nama</label>
        <input
          id="contact-nama"
          className="input"
          required
          value={form.nama}
          onChange={e => setForm({ ...form, nama: e.target.value })}
          placeholder="Nama lengkap Anda"
          style={{ fontSize: '15px', padding: '14px 16px' }}
        />
      </div>

      {/* No Telepon */}
      <div className="input-group">
        <label className="input-label" htmlFor="contact-telepon">No. Telepon</label>
        <input
          id="contact-telepon"
          className="input"
          required
          type="tel"
          value={form.telepon}
          onChange={e => setForm({ ...form, telepon: e.target.value })}
          placeholder="08xx-xxxx-xxxx"
          style={{ fontSize: '15px', padding: '14px 16px' }}
        />
      </div>

      {/* Pesan */}
      <div className="input-group">
        <label className="input-label" htmlFor="contact-pesan">Pesan</label>
        <textarea
          id="contact-pesan"
          className="input"
          required
          rows={4}
          value={form.pesan}
          onChange={e => setForm({ ...form, pesan: e.target.value })}
          placeholder="Tulis pesan Anda di sini..."
          style={{ fontSize: '15px', padding: '14px 16px', resize: 'vertical' }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '14px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #141414ff, #212121ff)',
          color: '#fff', fontWeight: 600, fontSize: '15px',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 14px rgba(17, 39, 202, 0.3)',
        }}
      >
        <Send size={18} />
        Kirim via WhatsApp
      </button>

      {/* Back link */}
      <Link
        href="/"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--color-text-muted, #888)',
          textDecoration: 'none', marginTop: '4px',
        }}
      >
        <ArrowLeft size={14} />
        Kembali ke Beranda
      </Link>
    </form>
  )
}
