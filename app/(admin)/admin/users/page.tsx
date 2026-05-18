import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import AdminUsersClient from './AdminUsersClient'

export const metadata: Metadata = {
  title: 'Kelola Pengguna',
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get current admin user
  const { data: { user } } = await supabase.auth.getUser()

  return <AdminUsersClient users={users || []} currentAdminId={user?.id || ''} />
}
