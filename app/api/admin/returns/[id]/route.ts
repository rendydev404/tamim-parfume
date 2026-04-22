import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { status, admin_notes } = body

  if (!status) {
    return NextResponse.json({ error: 'Status wajib diisi' }, { status: 400 })
  }

  // Get current return data
  const { data: returnData, error: returnError } = await supabase
    .from('returns')
    .select('order_id, status')
    .eq('id', id)
    .single()

  if (returnError || !returnData) {
    return NextResponse.json({ error: 'Data retur tidak ditemukan' }, { status: 404 })
  }

  const oldStatus = returnData.status

  if (oldStatus === status) {
    return NextResponse.json({ error: 'Status sudah sama' }, { status: 400 })
  }

  // Update return record
  const { error: updateError } = await supabase
    .from('returns')
    .update({ 
      status, 
      admin_notes: admin_notes !== undefined ? admin_notes : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Sync order status
  let newOrderStatus = null
  if (status === 'approved') newOrderStatus = 'return_approved'
  else if (status === 'rejected') newOrderStatus = 'return_rejected'
  else if (status === 'completed') newOrderStatus = 'refunded'
  else if (status === 'returning') newOrderStatus = 'returned'

  if (newOrderStatus) {
    await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', returnData.order_id)
  }

  return NextResponse.json({
    success: true,
    message: `Status retur berhasil diubah menjadi ${status}`,
  })
}
