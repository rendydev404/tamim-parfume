import AdminChat from '@/components/admin/AdminChat'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chat Pelanggan',
}

export default function AdminChatPage() {
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Chat Pelanggan</h1>
      <AdminChat />
    </div>
  )
}
