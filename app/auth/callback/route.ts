import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  // Di hosting seperti cPanel (Phusion Passenger/Proxy), request.url seringkali bernilai localhost:8080 (internal port).
  // Kita gunakan NEXT_PUBLIC_APP_URL sebagai domain utama jika tersedia untuk menghindari redirect ke localhost.
  const publicOrigin = process.env.NEXT_PUBLIC_APP_URL || origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${publicOrigin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${publicOrigin}/login?error=auth_failed`)
}
