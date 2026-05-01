"use client";

import { HeartPulse } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a271f] overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]"></div>

      <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-700">
        
        {/* Logo Icon with Pulse Animation */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
          <div className="bg-emerald-900/50 p-4 rounded-full border border-emerald-700/50 backdrop-blur-sm relative z-10">
            <HeartPulse className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl md:text-5xl font-black text-white font-serif tracking-tight mb-2">
          Safe <span className="text-emerald-500">.</span>
        </h1>

        {/* Tagline */}
        <p className="text-emerald-200/80 font-medium tracking-widest uppercase text-xs mb-10">
          Trusted Care Platform
        </p>

        {/* Minimalist Loading Bar */}
        <div className="w-48 h-1 bg-emerald-950 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full w-1/2 animate-[shimmer_1.5s_infinite_ease-in-out] origin-left"></div>
        </div>
        
      </div>

      {/* Custom Keyframes for the loading bar */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      
    </div>
  );
}
