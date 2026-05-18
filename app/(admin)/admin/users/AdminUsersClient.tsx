'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import {
  MoreVertical, Edit2, Trash2, Shield, ShieldOff, Ban, X, Check, UserX
} from 'lucide-react'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  is_banned?: boolean
  banned_until?: string | null
  ban_reason?: string | null
  created_at: string
}

interface Props {
  users: UserProfile[]
  currentAdminId: string
}

export default function AdminUsersClient({ users: initialUsers, currentAdminId }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean }>({ top: 0, left: 0, openUp: false })
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [editModal, setEditModal] = useState<UserProfile | null>(null)
  const [banModal, setBanModal] = useState<UserProfile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleMenu = useCallback((userId: string) => {
    if (actionMenu === userId) {
      setActionMenu(null)
      return
    }
    const btn = btnRefs.current[userId]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const menuHeight = 220 // approximate dropdown height
      const openUp = rect.bottom + menuHeight > window.innerHeight
      setMenuPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.right - 200, // 200 = menu width, align right edge
        openUp,
      })
    }
    setActionMenu(userId)
  }, [actionMenu])

  // Edit form state
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' })

  // Ban form state
  const [banForm, setBanForm] = useState({ reason: '', duration: '24', durationType: 'hours' as 'hours' | 'days' | 'permanent' })

  const openEditModal = (user: UserProfile) => {
    setEditForm({
      full_name: user.full_name || '',
      email: user.email,
      phone: user.phone || '',
    })
    setEditModal(user)
    setActionMenu(null)
  }

  const openBanModal = (user: UserProfile) => {
    setBanForm({ reason: '', duration: '24', durationType: 'hours' })
    setBanModal(user)
    setActionMenu(null)
  }

  const handleEdit = async () => {
    if (!editModal) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Profil berhasil diperbarui')
      setEditModal(null)
      router.refresh()
      // Update local state
      setUsers(prev => prev.map(u => u.id === editModal.id ? {
        ...u,
        full_name: editForm.full_name,
        email: editForm.email,
        phone: editForm.phone,
      } : u))
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil')
    }
    setLoading(false)
  }

  const handleMakeAdmin = async (user: UserProfile) => {
    setActionMenu(null)
    if (!confirm(`Jadikan "${user.full_name || user.email}" sebagai Admin?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'make_admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User dijadikan admin')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'admin' } : u))
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah role')
    }
    setLoading(false)
  }

  const handleMakeUser = async (user: UserProfile) => {
    setActionMenu(null)
    if (!confirm(`Kembalikan "${user.full_name || user.email}" menjadi User biasa?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'make_user' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Admin dikembalikan ke user')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'user' } : u))
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah role')
    }
    setLoading(false)
  }

  const handleBan = async () => {
    if (!banModal) return
    setLoading(true)
    try {
      let banned_until: string | null = null
      if (banForm.durationType === 'hours') {
        banned_until = new Date(Date.now() + parseInt(banForm.duration) * 60 * 60 * 1000).toISOString()
      } else if (banForm.durationType === 'days') {
        banned_until = new Date(Date.now() + parseInt(banForm.duration) * 24 * 60 * 60 * 1000).toISOString()
      }
      // permanent = null

      const res = await fetch(`/api/admin/users/${banModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ban',
          ban_reason: banForm.reason || 'Melanggar ketentuan layanan',
          banned_until,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User berhasil di-banned')
      setBanModal(null)
      setUsers(prev => prev.map(u => u.id === banModal.id ? {
        ...u, is_banned: true, banned_until, ban_reason: banForm.reason || 'Melanggar ketentuan layanan',
      } : u))
    } catch (err: any) {
      toast.error(err.message || 'Gagal melakukan ban')
    }
    setLoading(false)
  }

  const handleUnban = async (user: UserProfile) => {
    setActionMenu(null)
    if (!confirm(`Unban "${user.full_name || user.email}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User berhasil di-unban')
      setUsers(prev => prev.map(u => u.id === user.id ? {
        ...u, is_banned: false, banned_until: null, ban_reason: null,
      } : u))
    } catch (err: any) {
      toast.error(err.message || 'Gagal melakukan unban')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User berhasil dihapus')
      setDeleteConfirm(null)
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id))
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus user')
    }
    setLoading(false)
  }

  const isSelf = (userId: string) => userId === currentAdminId

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
              <th>Status</th>
              <th>Bergabung</th>
              <th style={{ width: '70px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500, fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {user.full_name || '-'}
                    {isSelf(user.id) && (
                      <span style={{
                        fontSize: '10px', background: 'var(--color-primary)', color: '#fff',
                        padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                      }}>Anda</span>
                    )}
                  </div>
                </td>
                <td style={{ fontSize: '13px' }}>{user.email}</td>
                <td style={{ fontSize: '13px' }}>{user.phone || '-'}</td>
                <td>
                  <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-muted'}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.is_banned ? (
                    <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '11px' }}>
                      Banned
                    </span>
                  ) : (
                    <span className="badge" style={{ background: '#d1fae5', color: '#065f46', fontSize: '11px' }}>
                      Aktif
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {formatDate(user.created_at)}
                </td>
                <td>
                  {!isSelf(user.id) && (
                    <button
                      ref={el => { btnRefs.current[user.id] = el }}
                      onClick={() => toggleMenu(user.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '6px', borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  Belum ada pengguna
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================= */}
      {/* ACTION DROPDOWN (portal-style, fixed position) */}
      {/* ========================================= */}
      {actionMenu && (() => {
        const user = users.find(u => u.id === actionMenu)
        if (!user) return null
        return (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 150 }}
              onClick={() => setActionMenu(null)}
            />
            <div style={{
              position: 'fixed',
              top: menuPos.openUp ? undefined : `${menuPos.top}px`,
              bottom: menuPos.openUp ? `${window.innerHeight - menuPos.top + 4}px` : undefined,
              left: `${Math.max(8, menuPos.left)}px`,
              width: '200px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              overflow: 'hidden',
              padding: '4px 0',
            }}>
              {/* Edit */}
              <button onClick={() => openEditModal(user)} style={menuItemStyle}>
                <Edit2 size={14} /> Edit Profil
              </button>

              {/* Make Admin / Make User */}
              {user.role === 'user' ? (
                <button onClick={() => handleMakeAdmin(user)} style={menuItemStyle}>
                  <Shield size={14} style={{ color: '#8b5cf6' }} /> Jadikan Admin
                </button>
              ) : (
                <button onClick={() => handleMakeUser(user)} style={menuItemStyle}>
                  <ShieldOff size={14} style={{ color: '#f59e0b' }} /> Jadikan User
                </button>
              )}

              {/* Ban / Unban */}
              {user.role !== 'admin' && (
                user.is_banned ? (
                  <button onClick={() => handleUnban(user)} style={menuItemStyle}>
                    <Check size={14} style={{ color: '#10b981' }} /> Unban User
                  </button>
                ) : (
                  <button onClick={() => openBanModal(user)} style={{ ...menuItemStyle, color: '#ef4444' }}>
                    <Ban size={14} /> Ban User
                  </button>
                )
              )}

              {/* Delete */}
              {user.role !== 'admin' && (
                <>
                  <div style={{ height: '1px', background: 'var(--color-border-light)', margin: '4px 0' }} />
                  <button onClick={() => { setDeleteConfirm(user); setActionMenu(null) }} style={{ ...menuItemStyle, color: '#ef4444' }}>
                    <Trash2 size={14} /> Hapus User
                  </button>
                </>
              )}
            </div>
          </>
        )
      })()}

      {/* ========================================= */}
      {/* EDIT MODAL */}
      {/* ========================================= */}
      {editModal && (
        <div className="overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Edit Pengguna</h3>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Nama Lengkap</label>
                <input className="input" value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Nama lengkap" />
              </div>
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" type="email" value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email" />
              </div>
              <div className="input-group">
                <label className="input-label">No. Telepon</label>
                <input className="input" value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="08xx-xxxx-xxxx" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Batal</button>
                <button className="btn btn-primary" onClick={handleEdit} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* BAN MODAL */}
      {/* ========================================= */}
      {banModal && (
        <div className="overlay" onClick={() => setBanModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={20} /> Ban User
              </h3>
              <button onClick={() => setBanModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              Ban <strong>{banModal.full_name || banModal.email}</strong>. User tidak dapat mengakses fitur apa pun selama di-ban.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Alasan Ban</label>
                <textarea className="input" rows={3} value={banForm.reason}
                  onChange={e => setBanForm({ ...banForm, reason: e.target.value })}
                  placeholder="Contoh: Melanggar ketentuan layanan"
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label className="input-label">Durasi Ban</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="input" value={banForm.durationType}
                    onChange={e => setBanForm({ ...banForm, durationType: e.target.value as any })}
                    style={{ flex: '0 0 140px' }}
                  >
                    <option value="hours">Jam</option>
                    <option value="days">Hari</option>
                    <option value="permanent">Permanen</option>
                  </select>
                  {banForm.durationType !== 'permanent' && (
                    <input className="input" type="number" min="1" value={banForm.duration}
                      onChange={e => setBanForm({ ...banForm, duration: e.target.value })}
                      style={{ flex: 1 }} />
                  )}
                </div>
                {banForm.durationType !== 'permanent' && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    User akan otomatis di-unban setelah {banForm.duration} {banForm.durationType === 'hours' ? 'jam' : 'hari'}
                  </p>
                )}
                {banForm.durationType === 'permanent' && (
                  <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                    ⚠️ User akan di-ban secara permanen sampai di-unban manual oleh admin
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setBanModal(null)}>Batal</button>
                <button className="btn" onClick={handleBan} disabled={loading}
                  style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                  {loading ? 'Memproses...' : 'Ban User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* DELETE CONFIRM MODAL */}
      {/* ========================================= */}
      {deleteConfirm && (
        <div className="overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal__header">
              <h3 className="modal__title" style={{ color: '#ef4444' }}>Hapus Pengguna</h3>
              <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              Yakin ingin menghapus <strong>{deleteConfirm.full_name || deleteConfirm.email}</strong>? 
              Semua data pesanan, review, dan wishlist user akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Batal</button>
              <button className="btn" onClick={handleDelete} disabled={loading}
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
                {loading ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 14px',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: 'var(--color-text)',
  textAlign: 'left',
}
