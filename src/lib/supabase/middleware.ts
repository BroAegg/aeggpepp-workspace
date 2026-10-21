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

  // Check if this is a prefetch request from Next.js Link
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1'

  // If it's a prefetch and an auth cookie is present, skip expensive remote getUser() call
  if (isPrefetch && hasAuthCookie) {
    return supabaseResponse
  }

  // Fast-path: Check if JWT is still valid locally without remote network roundtrip
  const jwtExp = getJwtExpFromCookies(allCookies)
  const isTokenValid = jwtExp !== null && (jwtExp * 1000 > Date.now() + 60000)

  if (isTokenValid) {
    // Valid session: Redirect away from login/register if already authenticated
    if (pathname === '/login' || pathname === '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    // Protected route with valid token: serve immediately with 0ms network latency
    return supabaseResponse
  }

  // Fallback: Refresh session if expired or close to expiration (< 60s)
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

function getJwtExpFromCookies(cookies: { name: string; value: string }[]): number | null {
  try {
    const tokenCookies = cookies
      .filter(c => c.name.includes('sb-') && c.name.includes('-auth-token'))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (tokenCookies.length === 0) return null

    let rawValue = tokenCookies.map(c => c.value).join('')
    if (rawValue.startsWith('base64-')) {
      const b64 = rawValue.slice(7).replace(/-/g, '+').replace(/_/g, '/')
      rawValue = atob(b64)
    }

    let accessToken = ''
    if (rawValue.startsWith('{') || rawValue.startsWith('[')) {
      const parsed = JSON.parse(rawValue)
      accessToken = parsed.access_token || (Array.isArray(parsed) ? parsed[0] : '')
    } else if (rawValue.includes('.')) {
      accessToken = rawValue
    }

    if (!accessToken || !accessToken.includes('.')) return null

    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const b64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64Payload))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}
