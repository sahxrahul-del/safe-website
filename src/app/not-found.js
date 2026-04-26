"use client";

import Link from 'next/link';
import { HeartPulse, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-xl mx-auto">
        
        {/* The 404 Graphic */}
        <div className="relative flex items-center justify-center mb-6">
          <h1 className="text-[120px] sm:text-[160px] font-extrabold text-emerald-900/5 select-none tracking-tighter">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-5 rounded-full shadow-2xl border-4 border-emerald-50">
              {/* The animate-pulse class gives it a literal heartbeat */}
              <HeartPulse className="w-12 h-12 text-emerald-600 animate-pulse" />
            </div>
          </div>
        </div>

        {/* The Copy */}
        <h2 className="text-3xl sm:text-4xl font-bold text-[#0a271f] mb-4 tracking-tight">
          Oops! Looks like you're lost.
        </h2>
        <p className="text-lg text-gray-500 mb-10">
          We couldn't find the page you're looking for. The link might be broken, or the page may have been moved. Let's get you back to safety.
        </p>

        {/* The Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/" 
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 bg-[#0a271f] text-white rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </button>
        </div>
        
        <div className="mt-16 text-emerald-600/60 font-serif italic">
          Safe.
        </div>
      </div>
    </div>
  );
}
