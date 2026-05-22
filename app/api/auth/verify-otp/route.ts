import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

function generateResetToken(email: string, userId: string): string {
  const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes
  const payload = JSON.stringify({ email, userId, expiresAt })
  const payloadBase64 = Buffer.from(payload).toString('base64url')
  const signature = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(payloadBase64)
    .digest('base64url')
  return `${payloadBase64}.${signature}`
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email dan kode OTP wajib diisi' },
        { status: 400 }
      )
    }

    // Verify OTP from our own database table
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otp)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('Fetch OTP error:', fetchError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat verifikasi' },
        { status: 500 }
      )
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid' },
        { status: 400 }
      )
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Find the user to get their ID
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const user = users?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan' },
        { status: 400 }
      )
    }

    // OTP is valid - generate a secure signed reset token
    const resetToken = generateResetToken(email, user.id)

    return NextResponse.json({
      message: 'Kode OTP terverifikasi',
      resetToken,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
