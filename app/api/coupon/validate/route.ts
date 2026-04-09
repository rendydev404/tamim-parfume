import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 })
  }

  const { code, subtotal } = await request.json()

  if (!code) {
    return NextResponse.json({ error: 'Masukkan kode kupon' }, { status: 400 })
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !coupon) {
    return NextResponse.json({ error: 'Kupon tidak ditemukan atau tidak aktif' }, { status: 404 })
  }

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kupon sudah kadaluarsa' }, { status: 400 })
  }

  // Check start date
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
    return NextResponse.json({ error: 'Kupon belum aktif' }, { status: 400 })
  }

  // Check usage limit
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return NextResponse.json({ error: 'Kupon sudah habis digunakan' }, { status: 400 })
  }

  // Check minimum purchase
  if (subtotal < coupon.min_purchase) {
    return NextResponse.json({
      error: `Minimum pembelian Rp${coupon.min_purchase.toLocaleString('id-ID')} untuk kupon ini`
    }, { status: 400 })
  }

  // Calculate discount
  let discount = 0
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal * coupon.value) / 100)
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount
    }
  } else {
    discount = coupon.value
  }

  // Don't exceed subtotal
  discount = Math.min(discount, subtotal)

  return NextResponse.json({
    data: {
      coupon_id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      discount_amount: discount,
    }
  })
}
