import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, kode OTP, dan password baru wajib diisi' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Verify OTP using Supabase's verifyOtp with type 'recovery'
    const { data, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    })

    if (verifyError) {
      console.error('OTP verification error:', verifyError)

      // Provide user-friendly error messages
      if (verifyError.message.includes('expired') || verifyError.message.includes('Token has expired')) {
        return NextResponse.json(
          { error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Kode OTP tidak valid' },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Kode OTP tidak valid' },
        { status: 400 }
      )
    }

    // OTP verified successfully, now update the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Gagal mengubah password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Password berhasil diubah! Silakan login dengan password baru.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
