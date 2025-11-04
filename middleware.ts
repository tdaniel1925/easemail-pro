import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
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
  
  return NextResponse.next();
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
