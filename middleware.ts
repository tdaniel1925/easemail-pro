import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ensureCsrfToken } from '@/lib/security/csrf';
import { globalRateLimitMiddleware } from '@/lib/middleware/global-rate-limit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Block WordPress bot attacks
  const wordpressPaths = [
    '/wordpress',
    '/wp-admin',
    '/wp-content',
    '/wp-includes',
    '/wp-login',
    '/xmlrpc.php',
  ];
  
  if (wordpressPaths.some(path => pathname.startsWith(path))) {
    console.warn(`🚫 Blocked WordPress bot attack: ${pathname} from ${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return new NextResponse(null, { status: 403 });
  }
  
  // Block common exploit attempts
  const exploitPaths = [
    '/admin/config.php',
    '/phpmyadmin',
    '/.env',
    '/.git',
    '/config.php',
    '/setup-config.php',
  ];
  
  if (exploitPaths.some(path => pathname.includes(path))) {
    console.warn(`🚫 Blocked exploit attempt: ${pathname} from ${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return new NextResponse(null, { status: 403 });
  }

  // PRODUCTION SECURITY: Global Rate Limiting
  // Apply rate limiting to all API routes
  const rateLimitResponse = await globalRateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // HIGH PRIORITY FIX #1: Authentication Middleware
  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/inbox',
    '/calendar',
    '/contacts',
    '/settings',
    '/team',
    '/admin',
    '/api/user',
    '/api/team',
    '/api/emails',
    '/api/contacts',
    '/api/calendar',
    '/api/nylas',
    '/api/sms',
    '/api/ai',
    '/api/billing',
  ];

  // Public routes that don't require auth
  const publicRoutes = [
    '/login',
    '/signup',
    '/verify-email',
    '/reset-password',
    '/change-password',
    '/auth',
    '/api/auth',
    '/api/webhooks',
    '/api/health',
    '/',
    '/pricing',
    '/legal',
  ];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Only check auth for protected routes
  if (isProtectedRoute && !isPublicRoute) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // User is not authenticated, redirect to login
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // HIGH PRIORITY FIX #4: CSRF Protection
    // Ensure CSRF token exists for authenticated users on GET requests
    if (request.method === 'GET') {
      ensureCsrfToken(request, response);
    }

    return response;
  }

  // HIGH PRIORITY FIX #4: CSRF Protection
  // Ensure CSRF token exists for public routes on GET requests
  const response = NextResponse.next();
  if (request.method === 'GET') {
    ensureCsrfToken(request, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
