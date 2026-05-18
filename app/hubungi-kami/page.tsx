import type { Metadata } from 'next'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Hubungi Kami',
  description: 'Hubungi tim TAMIM PARFUME untuk pertanyaan, kendala, atau banding akun.',
}

export default function HubungiKamiPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--color-bg-secondary, #f8f8f8)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'var(--color-bg, #fff)',
        borderRadius: '20px',
        padding: '40px 32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #242424ff, #040404ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 14px rgba(5, 37, 220, 0.3)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
            Hubungi Kami
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #666)', lineHeight: 1.5 }}>
            Isi formulir di bawah ini dan pesan Anda akan dikirim langsung ke WhatsApp kami
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  )
}
