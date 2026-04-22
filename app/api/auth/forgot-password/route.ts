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
      // But still return success to prevent email enumeration
      return NextResponse.json({
        message: 'Jika email terdaftar, kode OTP akan dikirim ke email Anda',
      })
    }

    // Generate OTP using Supabase's built-in recovery flow
    // This sends an email with a recovery token/OTP
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?redirect=/profile`,
    })

    if (error) {
      console.error('Reset password error:', error)
      return NextResponse.json(
        { error: 'Gagal mengirim kode OTP' },
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
