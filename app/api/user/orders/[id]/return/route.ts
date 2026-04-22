import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { reason, details, proof_images } = body

  if (!reason || !proof_images || proof_images.length === 0) {
    return NextResponse.json({ error: 'Alasan dan bukti foto/video wajib diisi' }, { status: 400 })
  }

  // Check if order belongs to user and is delivered
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, delivered_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'Hanya pesanan yang sudah diterima yang dapat diretur' }, { status: 400 })
  }

  if (!order.delivered_at) {
    return NextResponse.json({ error: 'Tanggal penerimaan tidak valid' }, { status: 400 })
  }

  const deliveredDate = new Date(order.delivered_at)
  const now = new Date()
  const diffHours = (now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60)

  if (diffHours > 72) {
    return NextResponse.json({ error: 'Batas waktu pengajuan retur (3x24 jam) telah habis' }, { status: 400 })
  }

  // Check if return already requested
  const { data: existingReturn } = await supabase
    .from('returns')
    .select('id')
    .eq('order_id', id)
    .maybeSingle()

  if (existingReturn) {
    return NextResponse.json({ error: 'Pengajuan retur sudah pernah dibuat untuk pesanan ini' }, { status: 400 })
  }

  // Insert into returns
  const { error: returnError } = await supabase
    .from('returns')
    .insert({
      order_id: id,
      user_id: user.id,
      reason,
      details,
      proof_images,
      status: 'pending'
    })

  if (returnError) {
    return NextResponse.json({ error: returnError.message }, { status: 500 })
  }

  // Update order status to return_requested
  await supabase
    .from('orders')
    .update({ status: 'return_requested' })
    .eq('id', id)

  return NextResponse.json({ success: true, message: 'Pengajuan retur berhasil dikirim' })
}
