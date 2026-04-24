// src/components/Navbar.js
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-sm p-4 px-8 flex justify-between items-center border-b border-gray-100 z-50">
      
      {/* Left Side: Logo */}
      <div className="text-2xl font-black text-emerald-700 font-serif tracking-tight">
        <Link href="/">Safe.</Link>
      </div>

      {/* Right Side: Dynamic Role Dropdowns & Auth */}
      <div className="flex gap-6 items-center">
        
        {/* Dynamic Patient Dropdown */}
        <div className="relative group">
          <button className="text-sm font-bold text-gray-500 hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
            For Patients
            <span className="text-xs group-hover:rotate-180 transition-transform">▼</span>
          </button>
          {/* Dropdown Menu - Standard Tailwind positioning */}
          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl p-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50">
            <Link href="/login?role=patient" className="block text-gray-900 font-bold hover:bg-emerald-50 hover:text-emerald-700 px-4 py-2.5 rounded-lg text-sm">
              Login
            </Link>
            <Link href="/signup?role=patient" className="block text-gray-900 font-bold hover:bg-emerald-50 hover:text-emerald-700 px-4 py-2.5 rounded-lg text-sm">
              Create Account
            </Link>
          </div>
        </div>

        {/* Dynamic Nurse Dropdown */}
        <div className="relative group">
          <button className="text-sm font-bold text-gray-500 hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
            For Nurses
            <span className="text-xs group-hover:rotate-180 transition-transform">▼</span>
          </button>
          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl p-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50">
            <Link href="/login?role=nurse" className="block text-gray-900 font-bold hover:bg-emerald-50 hover:text-emerald-700 px-4 py-2.5 rounded-lg text-sm">
              Login
            </Link>
            <Link href="/signup?role=nurse" className="block text-gray-900 font-bold hover:bg-emerald-50 hover:text-emerald-700 px-4 py-2.5 rounded-lg text-sm">
              Create Account
            </Link>
          </div>
        </div>
        
        <div className="h-6 w-px bg-gray-200"></div>

        <button className="text-sm font-bold text-gray-500 hover:text-emerald-700 transition-colors">
          EN / NP
        </button>
      </div>

    </nav>
  );
}