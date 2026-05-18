import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat dan ketentuan penggunaan TAMIM PARFUME.',
}

export default function TermsPage() {
  return (
    <>
<main className="container" style={{ paddingTop: '32px', paddingBottom: '100px', maxWidth: '720px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '24px' }}>Syarat & Ketentuan</h1>

        <div className="static-content">
          <p>Terakhir diperbarui: Maret 2026</p>

          <h2>1. Umum</h2>
          <p>
            Dengan mengakses dan menggunakan website TAMIM PARFUME, Anda menyetujui untuk terikat dengan
            syarat dan ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan layanan kami.
          </p>

          <h2>2. Akun Pengguna</h2>
          <ul>
            <li>Anda bertanggung jawab untuk menjaga kerahasiaan akun Anda.</li>
            <li>Informasi yang Anda berikan harus akurat dan terbaru.</li>
            <li>Kami berhak menangguhkan akun yang melanggar ketentuan ini.</li>
          </ul>

          <h2>3. Produk & Harga</h2>
          <ul>
            <li>Semua produk yang ditampilkan tergantung pada ketersediaan stok.</li>
            <li>Harga dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
            <li>Kami berusaha menampilkan warna dan detail produk seakurat mungkin, namun tampilan dapat bervariasi tergantung perangkat.</li>
          </ul>

          <h2>4. Pemesanan & Pembayaran</h2>
          <ul>
            <li>Pemesanan dianggap sah setelah pembayaran dikonfirmasi.</li>
            <li>Batas waktu pembayaran adalah 24 jam setelah pemesanan.</li>
            <li>Pesanan yang belum dibayar dalam batas waktu akan dibatalkan otomatis.</li>
          </ul>

          <h2>5. Pengiriman</h2>
          <ul>
            <li>Pengiriman dilakukan melalui jasa ekspedisi yang tersedia.</li>
            <li>Estimasi waktu pengiriman tergantung pada lokasi dan ekspedisi yang dipilih.</li>
            <li>Kami tidak bertanggung jawab atas keterlambatan yang disebabkan oleh pihak ekspedisi.</li>
          </ul>

          <h2>6. Pembatalan & Pengembalian</h2>
          <p>
            Silakan lihat halaman <a href="/return-policy" style={{ color: 'var(--color-primary)' }}>Kebijakan Pengembalian</a> untuk informasi lengkap.
          </p>

          <h2>7. Hak Kekayaan Intelektual</h2>
          <p>
            Seluruh konten di website ini termasuk logo, teks, gambar, dan desain adalah milik TAMIM PARFUME
            dan dilindungi oleh hukum hak cipta.
          </p>

          <h2>8. Perubahan Ketentuan</h2>
          <p>
            Kami berhak mengubah syarat dan ketentuan ini kapan saja. Perubahan akan berlaku efektif setelah
            dipublikasikan di halaman ini.
          </p>
        </div>
      </main>
</>
  )
}
