import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kelola Pengguna',
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Kelola Pengguna</h1>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Telepon</th>
              <th>Role</th>
              <th>Bergabung</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500, fontSize: '13px' }}>
                  {user.full_name || '-'}
                </td>
                <td style={{ fontSize: '13px' }}>{user.email}</td>
                <td style={{ fontSize: '13px' }}>{user.phone || '-'}</td>
                <td>
                  <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-muted'}`}>
                    {user.role}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {formatDate(user.created_at)}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Belum ada pengguna
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
