"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import NurseCard from "@/components/NurseCard";
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react'; 

export default function Home() {
  const router = useRouter();
  const [featuredNurses, setFeaturedNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNativeApp, setIsNativeApp] = useState(null); 

  useEffect(() => {
    // VERCEL-SAFE NATIVE CHECK
    const checkIsNative = typeof window !== 'undefined' && 
                          window.Capacitor !== undefined && 
                          window.Capacitor.isNativePlatform?.();
                          
    setIsNativeApp(!!checkIsNative);

    if (checkIsNative) {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 3000);
      return () => clearTimeout(timer);
    } 
    else {
      const fetchFeaturedNurses = async () => {
        try {
          const q = query(
            collection(db, "users"), 
            where("role", "==", "nurse"),
            where("isFeatured", "==", true),
            limit(8) 
          );
          
          const querySnapshot = await getDocs(q);
          const nursesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setFeaturedNurses(nursesData);
        } catch (error) {
          console.error("Error fetching featured nurses:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchFeaturedNurses();
    }
  }, [router]);

  // Animation sequences for staggered children
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  if (isNativeApp === null) return null;

  // ==========================================
  // MOBILE APP VIEW (3-SECOND SPLASH SCREEN)
  // ==========================================
  if (isNativeApp) {
    return (
      <main className="min-h-[100dvh] bg-[#0a271f] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <div className="bg-emerald-900/50 p-8 rounded-3xl border border-emerald-700/50 backdrop-blur-sm mb-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] transform transition-all hover:scale-105">
            <ShieldCheck className="w-20 h-20 text-emerald-400 animate-pulse" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white font-serif tracking-tight mb-3">
            Safe Home<span className="text-emerald-500">.</span>
          </h1>
          <div className="flex items-center gap-3 mt-6">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-emerald-200/60 font-bold tracking-[0.2em] uppercase text-xs mt-6 animate-pulse">
            Secure Care Network
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // WEB BROWSER VIEW (FULL HOMEPAGE)
  // ==========================================
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col font-sans overflow-x-hidden transition-colors duration-300">
      
      {/* 1. HERO SECTION */}
      {/* RESPONSIVE FIX: Reduced top padding on mobile (pt-12 vs pt-20), centered text on mobile (text-center lg:text-left) */}
      <section className="max-w-[1400px] mx-auto px-6 pt-12 lg:pt-20 pb-20 lg:pb-32 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="space-y-6 lg:space-y-8 z-10 text-center lg:text-left flex flex-col items-center lg:items-start"
        >
          <motion.div variants={fadeUpItem} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/80 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            200+ Verified Professionals Globally
          </motion.div>
          
          {/* RESPONSIVE FIX: Scaled down font size on mobile (text-5xl vs text-7xl) */}
          <motion.h1 variants={fadeUpItem} className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Find <span className="text-emerald-700 font-serif italic font-normal tracking-normal">trusted care.</span><br />
            Instantly verified.
          </motion.h1>
          
          <motion.p variants={fadeUpItem} className="text-base sm:text-lg text-gray-600 max-w-lg leading-relaxed font-medium">
            Safe connects families, patients, and facilities with licensed nurses, caregivers, and healthcare professionals — all background-checked and credential-verified.
          </motion.p>
          
          {/* RESPONSIVE FIX: Buttons stack full-width on mobile (w-full sm:w-auto) */}
          <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
            <Link href="/signup?role=patient" className="w-full sm:w-auto bg-[#0a271f] text-white px-8 py-4 rounded-xl font-bold hover:bg-black flex items-center justify-center transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Find a Caregiver →
            </Link>
            <Link href="/signup?role=nurse" className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold hover:border-emerald-600 flex items-center justify-center transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1">
              Join as Provider
            </Link>
          </motion.div>
        </motion.div>
        
        {/* RESPONSIVE FIX: Scaled down phone mock height for mobile (h-[500px] vs h-[600px]) */}
        <div className="relative w-full h-[500px] lg:h-[600px] flex justify-center items-center mt-10 lg:mt-0">
           
           {/* Floating verification badge - Hidden on very small screens, adjusted positioning */}
           <motion.div 
             initial={{ opacity: 0, x: 50 }}
             animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
             transition={{ opacity: { delay: 0.8, duration: 0.6 }, x: { delay: 0.8, duration: 0.6, type: "spring" }, y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1.4 } }}
             className="hidden sm:block absolute top-5 lg:top-10 right-0 lg:-right-10 bg-white p-4 lg:p-5 rounded-2xl shadow-xl border border-gray-100 z-20 w-56 lg:w-64"
           >
             <p className="text-gray-900 font-black mb-1 text-sm lg:text-base">✓ License Verified</p>
             <p className="text-xs text-gray-500 mb-2">Sunita S. • RN • LA</p>
             <span className="bg-emerald-50 text-emerald-700 text-[10px] lg:text-xs font-bold px-2 py-1 rounded-full">✓ Safe Approved</span>
           </motion.div>
           
           {/* Rating Badge - Adjusted positioning for mobile */}
           <motion.div 
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 1, duration: 0.6, type: "spring" }}
             className="absolute bottom-10 lg:bottom-32 left-4 lg:-left-20 bg-white p-4 lg:p-5 rounded-2xl shadow-xl border border-gray-100 z-20 flex items-center gap-3 lg:gap-4"
           >
             <span className="text-2xl lg:text-3xl font-black text-gray-900">4.9</span>
             <div>
               <div className="text-yellow-400 text-xs lg:text-sm">★★★★★</div>
               <p className="text-[10px] lg:text-xs text-gray-500">Avg provider rating</p>
             </div>
           </motion.div>

           {/* Mock Mobile Screen */}
           <motion.div 
             initial={{ opacity: 0, y: 100 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
             className="w-[280px] lg:w-[320px] h-[500px] lg:h-[600px] bg-[#0a271f] rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl relative border-[6px] lg:border-[8px] border-[#1a1a1a] overflow-hidden flex flex-col p-5 lg:p-6 z-10"
           >
              <div className="flex justify-between items-center mb-6 lg:mb-8">
                 <span className="text-white font-serif text-lg lg:text-xl">Safe</span>
              </div>
              <h3 className="text-2xl lg:text-3xl text-white font-bold leading-tight mb-6">Find <span className="font-serif italic font-normal text-emerald-400">trusted</span><br/>care near you.</h3>
              <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-2 border border-white/5">
                <span className="text-gray-400 text-sm">📍</span>
                <span className="text-xs lg:text-sm text-gray-400">Search by city or zip...</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center text-xl">👩‍⚕️</div>
                  <div>
                    <p className="text-white font-bold text-xs lg:text-sm">Sunita S.</p>
                    <p className="text-emerald-400 text-[10px]">Registered Nurse</p>
                  </div>
                </div>
              </div>
           </motion.div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      {/* RESPONSIVE FIX: Grid shifts to 2 columns on mobile (grid-cols-2), removes border-right on mobile to prevent weird lines */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="bg-[#0a271f] py-12 lg:py-16"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 lg:gap-8 md:divide-x divide-emerald-900/50">
          {[
            { value: "500+", label: "Verified Professionals" },
            { value: "100%", label: "Satisfaction Rate" },
            { value: "24/7", label: "Care Support" },
            { value: "15+", label: "Care Specialties" }
          ].map((stat, i) => (
            <div key={i} className="text-center md:pl-8 first:pl-0 border-r border-emerald-900/50 md:border-r-0 even:border-r-0">
              <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-1 lg:mb-2">{stat.value}</p>
              <p className="text-emerald-500 font-bold tracking-wide text-xs sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 3. FEATURED NURSES SECTION */}
      {/* RESPONSIVE FIX: Adjust padding (py-16 vs py-24), center headers on mobile */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="py-16 lg:py-24 bg-[#fdfcf9] border-t border-gray-100 transition-colors duration-300"
      >
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-10 lg:mb-12 gap-4 text-center md:text-left">
            <div>
              <p className="text-emerald-700 font-bold mb-2 lg:mb-3 uppercase tracking-wider text-xs lg:text-sm">Top Rated</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">Featured Professionals</h2>
            </div>
            <Link href="/find-providers" className="text-gray-900 font-bold hover:text-emerald-700 transition-colors flex items-center gap-2 pb-1 lg:pb-2 border-b-2 border-transparent hover:border-emerald-700 text-sm lg:text-base">
              View All Providers →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredNurses.map((nurse) => (
              <NurseCard 
                key={nurse.id} 
                id={nurse.id}
                name={nurse.full_name || nurse.name} 
                specialty={nurse.specialty || nurse.role} 
                rate={nurse.hourlyRate} 
                rating={nurse.rating} 
                reviews={nurse.reviewCount} 
                location={nurse.location?.city ? `${nurse.location.city}, ${nurse.location.zipCode}` : 'Local Area'}
                photo={nurse.avatar_url || nurse.photoURL}
              />
            ))}
          </div>
          
          <div className="mt-12 lg:mt-16 text-center">
            <Link href="/find-providers" className="inline-block w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold hover:border-emerald-700 hover:text-emerald-700 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1">
              Explore All Providers
            </Link>
          </div>
        </div>
      </motion.section>

      {/* 4. HOW IT WORKS */}
      {/* RESPONSIVE FIX: Stack grid to 1 column on mobile (grid-cols-1 md:grid-cols-3) */}
      <section className="py-16 lg:py-24 bg-white transition-colors duration-300">
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto px-6 text-center"
        >
          <motion.p variants={fadeUpItem} className="text-emerald-700 font-bold mb-3 lg:mb-4 uppercase tracking-wider text-xs lg:text-sm">Simple Process</motion.p>
          <motion.h2 variants={fadeUpItem} className="text-3xl lg:text-4xl font-black text-gray-900 mb-4 lg:mb-6">Care in three simple steps.</motion.h2>
          <motion.p variants={fadeUpItem} className="text-gray-600 max-w-2xl mx-auto mb-12 lg:mb-20 text-base lg:text-lg font-medium">No phone calls, no waiting weeks. Browse, match, and book verified care professionals on your schedule.</motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 text-left">
            {[
              { step: "01", icon: "📋", title: "Post your care need", desc: "Describe what you need, set your schedule, location, and budget." },
              { step: "02", icon: "🔍", title: "Browse profiles", desc: "View detailed profiles with credentials, experience, and verified reviews." },
              { step: "03", icon: "✅", title: "Book securely", desc: "Message, interview, and book directly. Secure direct requests." }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeUpItem} className="bg-[#fdfcf9] p-8 lg:p-10 rounded-[2rem] border border-gray-100 relative overflow-hidden group hover:border-emerald-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-7xl lg:text-8xl font-black text-gray-100 absolute -top-4 -right-4 lg:-top-6 lg:-right-6 select-none transition-transform duration-300 group-hover:scale-110">{item.step}</div>
                <div className="text-4xl lg:text-5xl mb-6 lg:mb-8 relative z-10 transition-transform duration-300 group-hover:-translate-y-2">{item.icon}</div>
                <h3 className="text-xl lg:text-2xl font-black text-gray-900 mb-3 lg:mb-4 relative z-10">{item.title}</h3>
                <p className="text-sm lg:text-base text-gray-600 font-medium leading-relaxed relative z-10">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* 5. TRUST & SAFETY SECTION */}
      {/* RESPONSIVE FIX: Text scaling, stack elements vertically, fix badge wrap */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="py-16 lg:py-24 max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
      >
         <div className="bg-[#0a271f] rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border border-[#0f3a2d] relative hover:shadow-emerald-900/50 transition-shadow duration-500 order-2 lg:order-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
               <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">👩🏽</div>
               <div>
                 <h3 className="text-xl lg:text-2xl font-bold text-white">Sunita S., RN</h3>
                 <p className="text-emerald-400 text-xs lg:text-sm font-medium mb-1">Registered Nurse • Post-Op Specialist</p>
                 <div className="flex items-center gap-1">
                   <div className="text-yellow-400 text-xs tracking-tighter">★★★★★</div>
                   <span className="text-xs text-gray-300 ml-1">4.9 • 127 reviews</span>
                 </div>
               </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4 lg:mb-8">
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold">🪪 ID Verified</span>
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold">🔒 Checked</span>
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold">📋 NMC License</span>
            </div>
         </div>
         <div className="order-1 lg:order-2 text-center lg:text-left">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-4 lg:mb-6 font-serif">
               Every provider.<br/>Every credential.<br/><span className="italic">Verified.</span>
            </h2>
            <p className="text-base lg:text-lg text-gray-600 mb-8 lg:mb-10">
               Safe Home's verification layer checks every professional before they appear on the platform, ensuring peace of mind for your family.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 text-left">
               {[
                 { icon: "🪪", title: "Identity Verified", desc: "Government ID confirmed" },
                 { icon: "🔒", title: "Background Check", desc: "Full criminal screening" },
                 { icon: "📋", title: "License Verified", desc: "NMC confirmed" },
                 { icon: "🛡️", title: "Safe Approved", desc: "Platform review passed" }
               ].map((item, i) => (
                 <motion.div 
                   whileHover={{ y: -5, borderColor: '#34d399' }}
                   key={i} 
                   className="bg-white p-4 lg:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center transition-all cursor-default"
                 >
                    <span className="text-2xl mb-1 lg:mb-2">{item.icon}</span>
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">{item.title}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">{item.desc}</p>
                 </motion.div>
               ))}
            </div>
         </div>
      </motion.section>

      {/* 6. WHO IT IS FOR */}
      {/* RESPONSIVE FIX: Stack cards, adjust text sizes */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="py-16 lg:py-24 bg-white border-t border-gray-100 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900">Built for both sides of care.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <motion.div 
              whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              className="bg-[#fdfcf9] rounded-[2rem] p-8 lg:p-12 border border-gray-200 shadow-sm transition-all flex flex-col"
            >
              <div className="text-4xl lg:text-5xl mb-6 lg:mb-8">🏡</div>
              <p className="text-emerald-700 font-extrabold mb-2 lg:mb-3 uppercase tracking-wide text-xs lg:text-sm">For Families & Patients</p>
              <h3 className="text-2xl lg:text-3xl font-black text-gray-900 mb-4 lg:mb-6">Find <span className="italic">the right</span> care.</h3>
              <p className="text-gray-600 mb-8 lg:mb-10 font-medium text-base lg:text-lg leading-relaxed flex-1">Whether you need a caregiver for mom, a private nurse after surgery, or companionship — Safe Home makes finding trusted help simple.</p>
              <Link href="/signup?role=patient" className="text-gray-900 font-bold hover:text-emerald-700 flex items-center gap-2 text-base lg:text-lg">
                Find Care Now →
              </Link>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
              className="bg-[#0a271f] rounded-[2rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden transition-all flex flex-col"
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="text-4xl lg:text-5xl mb-6 lg:mb-8">🩺</div>
                <p className="text-emerald-500 font-extrabold mb-2 lg:mb-3 uppercase tracking-wide text-xs lg:text-sm">For Caregivers</p>
                <h3 className="text-2xl lg:text-3xl font-black text-white mb-4 lg:mb-6"><span className="italic">Your skills,</span> your schedule.</h3>
                <p className="text-gray-300 mb-8 lg:mb-10 font-medium text-base lg:text-lg leading-relaxed flex-1">Build your profile, showcase your credentials, set your rates, and connect with clients on your terms.</p>
                <Link href="/signup?role=nurse" className="bg-white text-[#0a271f] px-6 lg:px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors text-center text-base lg:text-lg shadow-lg w-full sm:w-auto">
                  Join as a Provider
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

    </main>
  );
}