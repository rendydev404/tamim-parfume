import AdminChat from '@/components/admin/AdminChat'
import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Chat Pelanggan',
}

export default function AdminChatPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Chat Pelanggan</h1>
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}><LoaderFallback /></div>}>
        <AdminChat />
      </Suspense>
    </div>
  )
}

function LoaderFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <p style={{ fontSize: '14px' }}>Memuat Chat Pelanggan...</p>
    </div>
  )
}
