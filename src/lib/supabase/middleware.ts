import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icon') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')

  // If it's an API route or public asset, skip auth check entirely for max performance
  if (isPublicRoute && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return supabaseResponse
  }

  // Quick check if any supabase auth cookie exists
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => c.name.includes('sb-') && c.name.includes('-auth-token'))

  // If visiting protected route with zero auth cookies, redirect to login immediately without network call
  if (!isPublicRoute && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  if (!isPublicRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
