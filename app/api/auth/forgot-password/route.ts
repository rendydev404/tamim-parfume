import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateOTP, sendOTPEmail } from '@/lib/email'

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

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email wajib diisi' },
        { status: 400 }
      )
    }

    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan pada server' },
        { status: 500 }
      )
    }

    const userExists = users.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!userExists) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        message: 'Jika email terdaftar, kode OTP akan dikirim ke email Anda',
      })
    }

    // Rate limit: check if OTP was sent recently (within last 30 seconds)
    const { data: recentOtp } = await supabaseAdmin
      .from('password_reset_otps')
      .select('created_at')
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentOtp) {
      const lastSent = new Date(recentOtp.created_at).getTime()
      const now = Date.now()
      const diffSeconds = (now - lastSent) / 1000
      if (diffSeconds < 30) {
        return NextResponse.json(
          { error: `Silakan tunggu ${Math.ceil(30 - diffSeconds)} detik sebelum mengirim ulang.` },
          { status: 429 }
        )
      }
    }

    // Generate OTP code
    const otpCode = generateOTP(4)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Invalidate all previous OTPs for this email
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('used', false)

    // Store new OTP in database
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_otps')
      .insert({
        email: email.toLowerCase(),
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('Insert OTP error:', insertError)
      return NextResponse.json(
        { error: 'Gagal menyimpan kode OTP' },
        { status: 500 }
      )
    }

    // Send OTP email via Nodemailer
    try {
      await sendOTPEmail(email, otpCode)
    } catch (emailError) {
      console.error('Send email error:', emailError)
      
      // Hapus OTP yang baru disimpan agar tidak memicu limit 429 pada pengiriman berikutnya
      try {
        await supabaseAdmin
          .from('password_reset_otps')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('otp_code', otpCode)
      } catch (dbCleanupError) {
        console.error('Database cleanup error:', dbCleanupError)
      }

      return NextResponse.json(
        { error: 'Gagal mengirim email. Periksa konfigurasi SMTP.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Kode OTP telah dikirim ke email Anda',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
