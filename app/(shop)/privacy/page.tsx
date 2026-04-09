import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import Footer from '@/components/layout/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: 'Baca kebijakan privasi TAMIM PARFUME mengenai pengumpulan, penggunaan, dan perlindungan data Anda.',
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: '32px', paddingBottom: '100px', maxWidth: '720px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '24px' }}>Kebijakan Privasi</h1>

        <div className="static-content">
          <p>Terakhir diperbarui: Maret 2026</p>

          <h2>1. Informasi yang Kami Kumpulkan</h2>
          <p>Kami mengumpulkan informasi yang Anda berikan secara langsung saat:</p>
          <ul>
            <li>Membuat akun (nama, email, nomor telepon)</li>
            <li>Melakukan pemesanan (alamat pengiriman, detail pembayaran)</li>
            <li>Menghubungi layanan pelanggan</li>
            <li>Memberikan ulasan produk</li>
          </ul>

          <h2>2. Penggunaan Informasi</h2>
          <p>Informasi yang dikumpulkan digunakan untuk:</p>
          <ul>
            <li>Memproses dan mengirimkan pesanan Anda</li>
            <li>Mengelola akun Anda</li>
            <li>Mengirim notifikasi terkait pesanan</li>
            <li>Meningkatkan layanan dan pengalaman belanja</li>
            <li>Mencegah penipuan dan aktivitas ilegal</li>
          </ul>

          <h2>3. Perlindungan Data</h2>
          <p>
            Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data pribadi Anda dari
            akses tidak sah, perubahan, pengungkapan, atau penghancuran. Data pembayaran diproses melalui
            payment gateway bersertifikasi dan tidak disimpan di server kami.
          </p>

          <h2>4. Berbagi Informasi</h2>
          <p>Kami tidak menjual data pribadi Anda. Informasi hanya dibagikan kepada:</p>
          <ul>
            <li>Penyedia layanan pengiriman (untuk memproses pengiriman)</li>
            <li>Payment gateway (untuk memproses pembayaran)</li>
            <li>Pihak berwenang (jika diwajibkan oleh hukum)</li>
          </ul>

          <h2>5. Cookie</h2>
          <p>
            Kami menggunakan cookie untuk menyimpan preferensi Anda dan meningkatkan pengalaman browsing.
            Anda dapat menonaktifkan cookie melalui pengaturan browser Anda.
          </p>

          <h2>6. Hak Anda</h2>
          <p>Anda memiliki hak untuk:</p>
          <ul>
            <li>Mengakses dan memperbarui data pribadi Anda</li>
            <li>Menghapus akun Anda</li>
            <li>Meminta salinan data Anda</li>
            <li>Menolak penggunaan data untuk pemasaran</li>
          </ul>

          <h2>7. Kontak</h2>
          <p>
            Untuk pertanyaan tentang kebijakan privasi ini, hubungi kami di <strong>cs@tamimparfume.com</strong>.
          </p>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  )
}
