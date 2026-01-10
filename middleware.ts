import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Next.js Middleware - Protected Routes
 *
 * Checks authentication status for protected routes
 * Redirects unauthenticated users to login page
 *
 * Protected routes: /dashboard, /donors, /projects, /crm, /settings
 * Public routes: /, /login, /signup, /forgot-password, /auth/callback
 */

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') ||
                      pathname.startsWith('/signup') ||
                      pathname.startsWith('/forgot-password')
  const isProtectedRoute = pathname.startsWith('/dashboard') ||
                           pathname.startsWith('/donors') ||
                           pathname.startsWith('/projects') ||
                           pathname.startsWith('/crm') ||
                           pathname.startsWith('/settings')

  console.log(`[Middleware] ${pathname} - User:`, session?.user?.email || 'none')

  // Not logged in + trying to access protected route = redirect to login
  if (!session && isProtectedRoute) {
    console.log(`[Middleware] Redirecting to login from ${pathname}`)
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in + on auth page = redirect to dashboard
  if (session && isAuthRoute) {
    console.log(`[Middleware] User already authenticated, redirecting to dashboard`)
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
