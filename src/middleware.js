import { NextResponse } from 'next/server';

export async function middleware(request) {
  // 1. Setup the Response 
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const path = request.nextUrl.pathname;

  // 2. Grab cookies (Firebase's version of the Session)
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  let role = request.cookies.get('userRole')?.value || 'patient';

  // 3. FORCE REDIRECT FROM HOME/AUTH IF LOGGED IN (Work X Logic)
  if (isAuthenticated) {
    
    // Map Roles to Dashboards
    const homeBases = {
      admin: '/admin',
      nurse: '/dashboard/nurse',
      provider: '/dashboard/nurse', 
      patient: '/dashboard/patient',
      family: '/dashboard/patient'
    };

    const targetUrl = homeBases[role] || '/dashboard/patient';

    // 🟢 THE FIX: If they are at Root ('/') or Login/Signup, KICK them to dashboard
    if (path === '/' || path === '/login' || path === '/signup') {
        const redirectRes = NextResponse.redirect(new URL(targetUrl, request.url));
        // Prevent Caching of the Redirect (Crucial for Vercel)
        redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return redirectRes;
    }

    // 🔴 SECURITY: Protect Routes based on Role
    if (path.startsWith('/dashboard/patient') && ['nurse', 'provider'].includes(role)) {
       return NextResponse.redirect(new URL('/dashboard/nurse', request.url));
    }
    if (path.startsWith('/dashboard/nurse') && ['patient', 'family'].includes(role)) {
       return NextResponse.redirect(new URL('/dashboard/patient', request.url));
    }
    if (path.startsWith('/admin') && role !== 'admin') {
       return NextResponse.redirect(new URL(targetUrl, request.url));
    }

    return response;
  }

  // 4. USER IS NOT LOGGED IN
  // Public Paths (Everyone allowed)
  const publicPaths = [
    '/', 
    '/login', 
    '/signup', 
    '/forgot-password', 
    '/contact',
    '/privacy',
    '/terms'
  ];

  // If path is NOT public and NOT a static file, redirect to Login
  const isPublic = publicPaths.some(p => path === p || path.startsWith(p + '/'));
  const isStatic = path.startsWith('/_next') || path.startsWith('/static') || path.includes('.');

  if (!isPublic && !isStatic) {
     return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
