import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Pengembalian',
  description: 'Kebijakan pengembalian dan refund TAMIM PARFUME.',
}

export default function ReturnPolicyPage() {
  return (
    <>
<main className="container" style={{ paddingTop: '32px', paddingBottom: '100px', maxWidth: '720px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '24px' }}>Kebijakan Pengembalian</h1>

        <div className="static-content">
          <h2>Syarat Pengembalian</h2>
          <p>Produk dapat dikembalikan jika memenuhi syarat berikut:</p>
          <ul>
            <li>Produk yang diterima tidak sesuai dengan pesanan.</li>
            <li>Produk rusak atau cacat saat diterima.</li>
            <li>Pengajuan dilakukan dalam <strong>7 hari kalender</strong> setelah barang diterima.</li>
            <li>Produk belum dibuka/digunakan (segel masih utuh).</li>
            <li>Menyertakan bukti foto/video kondisi produk.</li>
          </ul>

          <h2>Produk yang Tidak Dapat Dikembalikan</h2>
          <ul>
            <li>Produk yang sudah dibuka dan digunakan.</li>
            <li>Produk yang tidak dalam kondisi asli (tanpa kemasan, label, dll).</li>
            <li>Pengajuan setelah melewati batas waktu 7 hari.</li>
          </ul>

          <h2>Proses Pengembalian</h2>
          <ol>
            <li><strong>Hubungi kami</strong> melalui chat atau email cs@tamimparfume.com dengan menyertakan nomor pesanan dan bukti foto/video.</li>
            <li><strong>Verifikasi</strong> — Tim kami akan memverifikasi pengajuan dalam 1-2 hari kerja.</li>
            <li><strong>Kirim kembali</strong> — Jika disetujui, kirim produk kembali menggunakan kurir yang ditentukan.</li>
            <li><strong>Refund/Penggantian</strong> — Setelah produk diterima dan dicek, refund atau produk pengganti akan diproses dalam 3-5 hari kerja.</li>
          </ol>

          <h2>Biaya Pengiriman</h2>
          <p>
            Biaya pengiriman pengembalian <strong>ditanggung oleh TAMIM PARFUME</strong> jika kesalahan berada di pihak kami
            (salah kirim, produk cacat). Untuk alasan lain, biaya ditanggung oleh pembeli.
          </p>

          <h2>Metode Refund</h2>
          <p>
            Refund akan dilakukan ke metode pembayaran yang sama yang digunakan saat pembelian.
            Proses refund membutuhkan waktu 3-14 hari kerja tergantung metode pembayaran.
          </p>
        </div>
      </main>
</>
  )
}
