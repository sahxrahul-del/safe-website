import { NextResponse } from 'next/server';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // 1. Grab cookies (The "Badge")
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  const role = request.cookies.get('userRole')?.value; 

  // 2. Define Public Routes
  const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/contact'];
  const isPublicPath = publicPaths.some(p => path === p);

  // 🚨 THE TOTAL BYPASS 🚨
  // If they are on Login or Signup, stop the middleware completely.
  // This lets Firebase finish the 'Redirect Result' and set cookies safely.
  if (path === '/login' || path === '/signup') {
    return NextResponse.next();
  }

  // Ignore static assets
  if (path.startsWith('/_next') || path.includes('.') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // --- CASE A: USER IS LOGGED IN ---
  if (isAuthenticated && role) {
    const homeBases = {
      admin: '/admin',
      nurse: '/dashboard/nurse',
      provider: '/dashboard/nurse',
      patient: '/dashboard/patient',
    };

    const myDashboard = homeBases[role] || '/';

    // If they are logged in and try to go to Home ('/'), send them to their dashboard
    if (path === '/') {
      return NextResponse.redirect(new URL(myDashboard, request.url));
    }

    // Lane Enforcement (Nurse vs Patient areas)
    if (path.startsWith('/dashboard/patient') && (role === 'nurse' || role === 'provider')) {
      return NextResponse.redirect(new URL('/dashboard/nurse', request.url));
    }
    if (path.startsWith('/dashboard/nurse') && role === 'patient') {
      return NextResponse.redirect(new URL('/dashboard/patient', request.url));
    }

    return NextResponse.next();
  }

  // --- CASE B: USER IS LOGGED OUT ---
  if (!isAuthenticated) {
    // If trying to access a private route, kick to login
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};