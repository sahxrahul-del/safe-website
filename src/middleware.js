import { NextResponse } from 'next/server';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // 1. Grab cookies (The "Badge")
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  const role = request.cookies.get('userRole')?.value; 

  // 2. Ignore static assets & API routes (performance)
  if (path.startsWith('/_next') || path.includes('.') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. Define Public Routes
  const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/contact'];
  const isPublicPath = publicPaths.some(p => path === p);

  // 🚨 CRITICAL FIX: AUTH PAGE BYPASS 🚨
  // If they are on Login or Signup, let them stay there WITHOUT checks.
  // This prevents the loop while Firebase is processing the Google Redirect.
  if (path === '/login' || path === '/signup') {
    return NextResponse.next();
  }

  // --- CASE A: USER IS LOGGED IN ---
  if (isAuthenticated && role) {
    
    // Map roles to their specific dashboards
    const homeBases = {
      admin: '/admin',
      nurse: '/dashboard/nurse',
      provider: '/dashboard/nurse', 
      patient: '/dashboard/patient',
      family: '/dashboard/patient'
    };

    const myDashboard = homeBases[role] || '/';

    // 🟢 PREVENT RE-AUTH: If logged in, don't let them see the landing page '/'
    if (path === '/') {
      return NextResponse.redirect(new URL(myDashboard, request.url));
    }

    // 🔴 LANE ENFORCEMENT: Keep Nurses and Patients in their own dashboards
    if (path.startsWith('/dashboard/patient') && (role === 'nurse' || role === 'provider')) {
      return NextResponse.redirect(new URL('/dashboard/nurse', request.url));
    }

    if (path.startsWith('/dashboard/nurse') && (role === 'patient' || role === 'family')) {
      return NextResponse.redirect(new URL('/dashboard/patient', request.url));
    }

    // 🔴 ADMIN PROTECTION
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(myDashboard, request.url));
    }

    return NextResponse.next();
  }

  // --- CASE B: USER IS LOGGED OUT ---
  if (!isAuthenticated) {
    // If they are trying to reach a private page (not in publicPaths), kick them to login
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};