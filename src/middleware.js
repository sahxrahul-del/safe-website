import { NextResponse } from 'next/server';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // 1. Grab cookies (The "Badge")
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
  const role = request.cookies.get('userRole')?.value; 

  // 2. Define Public Routes
  const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/contact'];
  const isPublicPath = publicPaths.some(p => path === p);
  
  // Ignore static assets (images, css, etc.)
  if (path.startsWith('/_next') || path.includes('.') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // --- CASE A: USER IS LOGGED IN ---
  if (isAuthenticated && role) {
    
    // Map roles to their specific dashboards
    const homeBases = {
      admin: '/admin',
      nurse: '/dashboard/nurse',
      provider: '/dashboard/nurse', // alias
      patient: '/dashboard/patient',
      family: '/dashboard/patient'   // alias
    };

    const myDashboard = homeBases[role] || '/';

    // 🟢 BLOCK AUTH PAGES: If logged in, don't show Login/Signup/Home
    if (path === '/login' || path === '/signup' || path === '/') {
      return NextResponse.redirect(new URL(myDashboard, request.url));
    }

    // 🔴 LANE ENFORCEMENT: Nurse trying to enter Patient area
    if (path.startsWith('/dashboard/patient') && (role === 'nurse' || role === 'provider')) {
      return NextResponse.redirect(new URL('/dashboard/nurse', request.url));
    }

    // 🔴 LANE ENFORCEMENT: Patient trying to enter Nurse area
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
    // If trying to access ANY private route, kick to login
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // This regex ensures it runs on all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};