import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth-page" style={{ background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ 
          fontFamily: 'var(--font-heading)', 
          fontSize: '6rem', 
          fontWeight: 700, 
          color: 'var(--color-text)',
          lineHeight: 1,
          marginBottom: '16px',
        }}>
          404
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-text-secondary)', 
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          Halaman yang Anda cari tidak ditemukan
        </p>
        <Link href="/" className="btn btn-primary">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
