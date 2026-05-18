import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Helper: verify admin
async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// PUT: Edit user profile (except password)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { full_name, email, phone } = body

  const updates: Record<string, unknown> = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (phone !== undefined) updates.phone = phone
  if (email !== undefined) updates.email = email

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
  }

  // Update email in auth if changed
  if (email) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { email })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
  }

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'Profil berhasil diperbarui' })
}

// PATCH: Change role or ban status
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-modification
  if (admin.id === id) {
    return NextResponse.json({ error: 'Tidak dapat mengubah akun sendiri' }, { status: 400 })
  }

  const body = await request.json()
  const { action } = body // 'make_admin', 'make_user', 'ban', 'unban'

  if (action === 'make_admin') {
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'User dijadikan admin' })
  }

  if (action === 'make_user') {
    const { error } = await supabase.from('profiles').update({ role: 'user' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'Admin dikembalikan ke user' })
  }

  if (action === 'ban') {
    const { ban_reason, banned_until } = body
    const updates: Record<string, unknown> = {
      is_banned: true,
      ban_reason: ban_reason || 'Melanggar ketentuan',
    }
    if (banned_until) {
      updates.banned_until = banned_until
    } else {
      updates.banned_until = null // Permanent ban
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'User berhasil di-banned' })
  }

  if (action === 'unban') {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: false, banned_until: null, ban_reason: null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'User berhasil di-unban' })
  }

  return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
}

// DELETE: Delete user
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await verifyAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-deletion
  if (admin.id === id) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
  }

  // Check if user is admin
  const { data: targetProfile } = await supabase.from('profiles').select('role').eq('id', id).single()
  if (targetProfile?.role === 'admin') {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun admin lain' }, { status: 400 })
  }

  // Delete from auth (cascades to profiles)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, message: 'User berhasil dihapus' })
}
