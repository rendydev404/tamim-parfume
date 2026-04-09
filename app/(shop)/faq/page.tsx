'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Footer from '@/components/layout/Footer'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
  {
    q: 'Apakah semua parfum yang dijual original?',
    a: 'Ya, semua parfum yang kami jual 100% original dan bergaransi. Kami hanya bekerja sama dengan distributor resmi dan supplier terpercaya.',
  },
  {
    q: 'Berapa lama waktu pengiriman?',
    a: 'Waktu pengiriman tergantung pada lokasi dan layanan kurir yang dipilih. Umumnya 2-5 hari kerja untuk Jawa dan 5-10 hari kerja untuk luar Jawa. Pesanan diproses dalam 1-2 hari kerja setelah pembayaran dikonfirmasi.',
  },
  {
    q: 'Apakah bisa COD (Bayar di Tempat)?',
    a: 'Saat ini kami belum menyediakan layanan COD. Pembayaran dapat dilakukan melalui Transfer Bank, Virtual Account, E-Wallet (GoPay, OVO, DANA, ShopeePay), dan QRIS.',
  },
  {
    q: 'Bagaimana cara menggunakan kode kupon?',
    a: 'Saat checkout, klik "Punya kode kupon?" lalu masukkan kode kupon Anda. Diskon akan otomatis dikalkulasi jika kupon valid dan memenuhi syarat minimum pembelian.',
  },
  {
    q: 'Apakah bisa mengembalikan produk yang sudah dibeli?',
    a: 'Ya, dengan syarat dan ketentuan tertentu. Silakan baca halaman Kebijakan Pengembalian kami untuk informasi lengkap. Pengajuan pengembalian harus dilakukan dalam 7 hari setelah barang diterima.',
  },
  {
    q: 'Bagaimana cara melacak pesanan saya?',
    a: 'Setelah pesanan dikirim, Anda akan mendapatkan nomor resi di halaman detail pesanan. Anda dapat mengecek status pengiriman menggunakan nomor resi tersebut di website kurir yang bersangkutan.',
  },
  {
    q: 'Apakah ada minimal pembelian?',
    a: 'Tidak ada minimal pembelian. Anda bisa membeli mulai dari 1 produk. Namun beberapa kupon mungkin memiliki syarat minimal pembelian tertentu.',
  },
  {
    q: 'Bagaimana cara menghubungi customer service?',
    a: 'Anda bisa menghubungi kami melalui fitur chat yang tersedia di website (klik ikon chat di pojok kanan bawah) atau email ke cs@tamimparfume.com. Jam operasional: Senin - Sabtu, 09:00 - 21:00 WIB.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="faq-item" onClick={() => setIsOpen(!isOpen)}>
      <button className="faq-item__question">
        <span>{q}</span>
        <ChevronDown
          size={18}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            color: 'var(--color-text-muted)',
          }}
        />
      </button>
      <div className={`faq-item__answer ${isOpen ? 'faq-item__answer--open' : ''}`}>
        <p>{a}</p>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '32px', paddingBottom: '100px', maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <HelpCircle size={24} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: '1.75rem' }}>Pertanyaan Umum (FAQ)</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  )
}
