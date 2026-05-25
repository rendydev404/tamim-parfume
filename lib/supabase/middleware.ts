import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }

    // Check admin role from profiles table
    // Use a direct query - RLS policy profiles_select_own allows users to read their own profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If query failed or role is not admin, redirect to home
    if (error || !profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Protect user dashboard routes
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/checkout')
  ) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
