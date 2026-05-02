"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Next.js Hydration Safe check: use CSS to hide instead of returning null
  const isAppPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/cases') || pathname.includes('/admin');

  return (
    <footer className={`${isAppPage ? 'hidden' : 'block'} bg-[#0a271f] text-emerald-100 py-16 border-t border-[#0f3a2d] font-sans`}>
      <div className="w-full px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
          
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
               <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white p-1 flex items-center justify-center text-emerald-600">
                   {/* ShieldCheck SVG */}
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                   </svg>
               </div>
               <span className="text-2xl font-extrabold text-white tracking-tight font-serif">
                 Safe 
               </span>
            </div>
            <p className="text-sm text-emerald-200/80 leading-relaxed font-medium">
              Connecting verified healthcare professionals with families in need. The safest way to find reliable in-home care in your community.
            </p>
            
            <div className="flex space-x-4 pt-4">
              {/* Facebook SVG */}
              <Link href="#" className="bg-[#0f3a2d] p-2 rounded-lg hover:bg-emerald-600 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </Link>
              {/* LinkedIn SVG */}
              <Link href="#" className="bg-[#0f3a2d] p-2 rounded-lg hover:bg-emerald-600 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </Link>
              {/* Instagram SVG */}
              <Link href="#" className="bg-[#0f3a2d] p-2 rounded-lg hover:bg-emerald-600 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </Link>
            </div>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Platform</h3>
            <ul className="space-y-3 text-sm font-bold">
              <li><Link href="/" className="hover:text-white transition">Home</Link></li>
              <li><Link href="/dashboard/post-case" className="hover:text-white transition">Post a Request</Link></li>
              <li><Link href="/find-providers" className="hover:text-white transition">Browse Providers</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Support</h3>
            <ul className="space-y-3 text-sm font-bold">
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-white font-bold mb-6 text-lg">Contact</h3>
            <ul className="space-y-4 text-sm font-bold">
              <li className="flex items-start">
                {/* MapPin SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-emerald-500 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Kathmandu, Nepal</span>
              </li>
              <li className="flex items-center">
                {/* Phone SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-emerald-500 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>+977 9700000000</span>
              </li>
              <li className="flex items-center">
                {/* Mail SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-emerald-500 shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span>support@usesafe.app</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-[#0f3a2d] flex flex-col md:flex-row justify-between items-center text-xs text-emerald-200/60 font-black tracking-widest uppercase">
          <p>&copy; {new Date().getFullYear()} Safe All rights reserved.</p>
         
        </div>
      </div>
    </footer>
  );
}
