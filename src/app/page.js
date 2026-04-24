import Link from 'next/link';
import NurseCard from "@/components/NurseCard";
export default function Home() {
  const featuredNurses = [
    { id: 1, name: "Angela M.", specialty: "Registered Nurse", rate: "500", rating: "4.9", reviews: 127 },
    { id: 2, name: "Marcus T.", specialty: "CNA • Caregiver", rate: "300", rating: "4.8", reviews: 94 },
    { id: 3, name: "Sita R.", specialty: "Pediatric Care", rate: "600", rating: "5.0", reviews: 210 },
    { id: 4, name: "Bikash T.", specialty: "Post-Op Recovery", rate: "700", rating: "4.7", reviews: 85 },
    { id: 5, name: "Priya S.", specialty: "Elderly Care", rate: "450", rating: "4.9", reviews: 156 },
    { id: 6, name: "David K.", specialty: "Physical Therapy", rate: "800", rating: "4.8", reviews: 112 },
    { id: 7, name: "Anita G.", specialty: "Registered Nurse", rate: "550", rating: "4.9", reviews: 204 },
    { id: 8, name: "Sunil L.", specialty: "CNA • Caregiver", rate: "250", rating: "4.6", reviews: 67 },
    { id: 9, name: "Karma S.", specialty: "Hospice Care", rate: "650", rating: "5.0", reviews: 340 },
    { id: 10, name: "Nina P.", specialty: "Dementia Care", rate: "500", rating: "4.8", reviews: 129 },
    { id: 11, name: "Rohan M.", specialty: "Post-Op Recovery", rate: "700", rating: "4.9", reviews: 178 },
    { id: 12, name: "Maya B.", specialty: "Pediatric Care", rate: "550", rating: "4.7", reviews: 92 },
  ];

  return (
    <main className="min-h-screen bg-[#fdfcf9] dark:bg-gray-900 flex flex-col font-sans overflow-x-hidden transition-colors duration-300">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-[1400px] mx-auto px-6 pt-20 pb-32 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm font-bold border border-emerald-100 dark:border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            200+ Verified Professionals Available Now
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight">
            Find <span className="text-emerald-700 dark:text-emerald-400 font-serif italic font-normal tracking-normal">trusted care.</span><br />
            Instantly verified.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed font-medium">
            Safe connects families, patients, and facilities with licensed nurses, caregivers, and healthcare professionals — all background-checked and credential-verified.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="bg-[#0a271f] dark:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-900 dark:hover:bg-emerald-500 transition-colors shadow-lg">
              Find a Caregiver →
            </button>
            <button className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 px-8 py-4 rounded-xl font-bold hover:border-gray-300 dark:hover:border-gray-500 transition-all shadow-sm">
              Join as Provider
            </button>
          </div>
        </div>
        
        <div className="relative w-full h-[600px] flex justify-center items-center mt-10 lg:mt-0">
           <div className="absolute top-10 right-0 lg:-right-10 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 w-64 animate-bounce hover:pause" style={{ animationDuration: '4s' }}>
             <p className="text-gray-900 dark:text-white font-black mb-1">✓ License Verified</p>
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Angela M. • RN • Maryland</p>
             <span className="bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-2 py-1 rounded-full">✓ Safe Approved</span>
           </div>
           <div className="absolute bottom-32 left-0 lg:-left-20 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 flex items-center gap-4">
             <span className="text-3xl font-black text-gray-900 dark:text-white">4.9</span>
             <div>
               <div className="text-yellow-400 text-sm">★★★★★</div>
               <p className="text-xs text-gray-500 dark:text-gray-400">Avg provider rating</p>
             </div>
           </div>

           <div className="w-[320px] h-[600px] bg-[#0a271f] rounded-[3rem] shadow-2xl relative border-[8px] border-[#1a1a1a] overflow-hidden flex flex-col p-6 z-10">
              <div className="flex justify-between items-center mb-8">
                 <span className="text-white font-serif text-xl">Safe</span>
              </div>
              <h3 className="text-3xl text-white font-bold leading-tight mb-6">Find <span className="font-serif italic font-normal text-emerald-400">trusted</span><br/>care near you.</h3>
              <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-2 border border-white/5">
                <span className="text-gray-400">🔍</span>
                <span className="text-sm text-gray-400">Search by role...</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 flex justify-between items-center border border-white/5 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center text-xl">👩‍⚕️</div>
                  <div>
                    <p className="text-white font-bold text-sm">Angela M.</p>
                    <p className="text-emerald-400 text-[10px]">Registered Nurse</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="bg-[#0a271f] dark:bg-gray-950 py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-emerald-900/50 dark:divide-gray-800">
          {[
            { value: "2k+", label: "Verified Professionals" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "24/7", label: "Care Support" },
            { value: "50+", label: "Care Specialties" }
          ].map((stat, i) => (
            <div key={i} className="text-center pl-8 first:pl-0">
              <p className="text-5xl font-black text-white mb-2">{stat.value}</p>
              <p className="text-emerald-500 font-bold tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED NURSES SECTION */}
      <section className="py-24 bg-[#fdfcf9] dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-3 uppercase tracking-wider text-sm">Top Rated</p>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Featured Professionals</h2>
            </div>
            <Link href="/providers" className="text-gray-900 dark:text-gray-300 font-bold hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 pb-2 border-b-2 border-transparent hover:border-emerald-700 dark:hover:border-emerald-400">
              View All Providers →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredNurses.map((nurse) => (
              <NurseCard key={nurse.id} {...nurse} />
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Link href="/providers" className="inline-block bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 px-8 py-4 rounded-xl font-bold hover:border-emerald-700 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all shadow-sm">
              Explore All {featuredNurses.length}+ Nurses
            </Link>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-24 bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-emerald-700 dark:text-emerald-400 font-bold mb-4 uppercase tracking-wider text-sm">Simple Process</p>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-6">Care in three simple steps.</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-20 text-lg font-medium">No phone calls, no waiting weeks. Browse, match, and book verified care professionals on your schedule.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            {[
              { step: "01", icon: "📋", title: "Post your care need", desc: "Describe what you need, set your schedule, location, and budget." },
              { step: "02", icon: "🔍", title: "Browse profiles", desc: "View detailed profiles with credentials, experience, and verified reviews." },
              { step: "03", icon: "✅", title: "Book securely", desc: "Message, interview, and book directly. Secure payments and real-time updates." }
            ].map((item, i) => (
              <div key={i} className="bg-[#fdfcf9] dark:bg-gray-900 p-10 rounded-[2rem] border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                <div className="text-8xl font-black text-gray-100 dark:text-gray-800 absolute -top-6 -right-6 select-none">{item.step}</div>
                <div className="text-5xl mb-8 relative z-10">{item.icon}</div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 relative z-10">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TRUST & SAFETY SECTION */}
      <section className="py-24 max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
         <div className="bg-[#0a271f] dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-800 relative">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-16 h-16 bg-emerald-800 rounded-2xl flex items-center justify-center text-3xl shadow-inner">👩</div>
               <div>
                 <h3 className="text-2xl font-bold text-white">Angela M., RN</h3>
                 <p className="text-emerald-400 text-sm font-medium mb-1">Registered Nurse • Post-Op Specialist</p>
                 <div className="flex items-center gap-1">
                   <div className="text-yellow-400 text-xs tracking-tighter">★★★★★</div>
                   <span className="text-xs text-gray-300 ml-1">4.9 • 127 reviews</span>
                 </div>
               </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-3 py-1.5 rounded-lg text-xs font-bold">🪪 ID Verified</span>
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-3 py-1.5 rounded-lg text-xs font-bold">🔒 Background Checked</span>
              <span className="bg-emerald-900/50 text-emerald-300 border border-emerald-800/50 px-3 py-1.5 rounded-lg text-xs font-bold">📋 License Verified</span>
            </div>
         </div>
         <div>
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-6 font-serif">
               Every provider.<br/>Every credential.<br/><span className="italic">Verified.</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
               Safe's verification layer checks every professional before they appear on the platform.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {[
                 { icon: "🪪", title: "Identity Verified", desc: "Government ID confirmed" },
                 { icon: "🔒", title: "Background Check", desc: "Full criminal screening" },
                 { icon: "📋", title: "License Verified", desc: "State board confirmed" },
                 { icon: "🛡️", title: "Safe Approved", desc: "Full platform review passed" }
               ].map((item, i) => (
                 <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <span className="text-2xl mb-2">{item.icon}</span>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* 6. WHO IT IS FOR */}
      <section className="py-24 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white">Built for both sides of care.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#fdfcf9] dark:bg-gray-900 rounded-[2rem] p-12 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="text-5xl mb-8">🏡</div>
              <p className="text-emerald-700 dark:text-emerald-400 font-extrabold mb-3 uppercase tracking-wide text-sm">For Families & Patients</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Find <span className="italic">the right</span> care.</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-10 font-medium text-lg leading-relaxed">Whether you need a caregiver for mom, a private nurse after surgery, or companionship — Safe makes finding trusted help simple.</p>
              <button className="text-gray-900 dark:text-white font-bold hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-2 text-lg">Find Care Now →</button>
            </div>

            <div className="bg-[#0a271f] dark:bg-emerald-950 rounded-[2rem] p-12 shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-5xl mb-8">🩺</div>
                <p className="text-emerald-500 font-extrabold mb-3 uppercase tracking-wide text-sm">For Caregivers</p>
                <h3 className="text-3xl font-black text-white mb-6"><span className="italic">Your skills,</span> your schedule.</h3>
                <p className="text-gray-300 mb-10 font-medium text-lg leading-relaxed">Build your profile, showcase your credentials, set your rates, and connect with clients on your terms.</p>
                <button className="bg-white text-[#0a271f] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors inline-block text-lg">Join as a Provider</button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}