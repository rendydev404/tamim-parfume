import { Store, Award, Heart, Shield } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: 'TAMIM PARFUME — Toko parfum premium terpercaya dengan koleksi terlengkap dan kualitas terjamin.',
}

export default function AboutPage() {
  return (
    <>
<main className="container" style={{ paddingTop: '32px', paddingBottom: '100px', maxWidth: '720px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '12px' }}>Tentang Kami</h1>
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: '32px' }}>
          <strong>TAMIM PARFUME</strong> adalah toko parfum premium terpercaya yang menawarkan koleksi
          parfum terlengkap dari berbagai brand ternama dunia. Kami berkomitmen untuk memberikan
          pengalaman belanja parfum terbaik dengan produk berkualitas dan layanan pelanggan yang prima.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { icon: Store, title: 'Produk Original', desc: 'Semua parfum yang kami jual 100% original dan bergaransi resmi.' },
            { icon: Award, title: 'Kualitas Premium', desc: 'Kami hanya menjual parfum dengan kualitas terbaik dari brand terpercaya.' },
            { icon: Heart, title: 'Customer First', desc: 'Kepuasan pelanggan adalah prioritas utama kami.' },
            { icon: Shield, title: 'Transaksi Aman', desc: 'Pembayaran dijamin aman melalui payment gateway terpercaya.' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                <Icon size={28} style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Hubungi Kami</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            Punya pertanyaan atau butuh bantuan? Jangan ragu untuk menghubungi kami melalui fitur chat
            yang tersedia di website atau kirim email ke <strong>cs@tamimparfume.com</strong>.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '12px', lineHeight: 1.8 }}>
            Jam Operasional: Senin - Sabtu, 09:00 - 21:00 WIB
          </p>
        </div>
      </main>
</>
  )
}
