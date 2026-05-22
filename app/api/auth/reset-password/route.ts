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

function verifyResetToken(token: string, email: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return { valid: false, error: 'Token tidak valid' }

    const [payloadBase64, signature] = parts

    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!)
      .update(payloadBase64)
      .digest('base64url')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Token tidak valid' }
    }

    // Decode and parse payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Token sudah kadaluarsa. Silakan ulangi proses dari awal.' }
    }

    // Check email match
    if (payload.email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: 'Token tidak valid untuk email ini' }
    }

    return { valid: true, userId: payload.userId }
  } catch {
    return { valid: false, error: 'Token tidak valid' }
  }
}

export async function POST(request: Request) {
  try {
    const { email, resetToken, newPassword } = await request.json()

    if (!email || !resetToken || !newPassword) {
      return NextResponse.json(
        { error: 'Email, token reset, dan password baru wajib diisi' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    // Verify the signed reset token
    const tokenResult = verifyResetToken(resetToken, email)
    if (!tokenResult.valid || !tokenResult.userId) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token tidak valid' },
        { status: 400 }
      )
    }

    // Token verified successfully, now update the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenResult.userId,
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
