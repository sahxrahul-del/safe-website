"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Home, LayoutDashboard, UserCircle, Plus, Search, 
  HeartPulse, Clock, FileText, ChevronRight, Loader2, MapPin, Activity, Star, ShieldCheck
} from 'lucide-react';

export default function PatientSaaSDashboard() {
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState('dashboard');
  
  // Firebase State
  const [requests, setRequests] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // PLACEHOLDERS FOR FUTURE DATA
  const savedProvidersCount = 3; 
  const totalCareHours = 0;      

  // REAL-TIME FIREBASE CONNECTION
  useEffect(() => {
    // 1. Fetch Care Requests
    const reqQuery = query(collection(db, "care_requests"), orderBy("createdAt", "desc"));
    const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Providers (Nurses)
    const provQuery = query(collection(db, "providers"));
    const unsubProvs = onSnapshot(provQuery, (snapshot) => {
      setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubReqs();
      unsubProvs();
    };
  }, []);

  const activeCount = requests.filter(r => r.status === 'searching').length;

  // ==========================================
  // VIEW 1: THE DASHBOARD 
  // ==========================================
  const renderDashboard = () => (
    <div className="animate-in fade-in duration-300 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 font-serif">Dashboard Overview</h2>
        <p className="text-sm text-gray-500 font-medium">Monitor your active requests and upcoming care.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center"><Activity className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Cases</p>
            <p className="text-2xl font-black text-gray-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center"><Clock className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Care Hours</p>
            <p className="text-2xl font-black text-gray-900">{totalCareHours}<span className="text-sm text-gray-500 font-medium">hrs</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center"><FileText className="w-6 h-6 text-amber-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saved Providers</p>
            <p className="text-2xl font-black text-gray-900">{savedProvidersCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900">Recent Care Requests</h3>
          <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View All</button>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
              <p className="text-sm font-medium">Fetching secure data...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-gray-300" />
              </div>
              <h3 className="text-base font-black text-gray-900 mb-1">No requests yet</h3>
              <p className="text-sm text-gray-500 mb-4">You haven't posted any care needs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div 
                  key={req.id} 
                  onClick={() => alert(`Later, this will route to /dashboard/patient/case/${req.id}`)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition bg-white cursor-pointer"
                >
                  <div className="flex gap-4 items-center mb-4 sm:mb-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <HeartPulse className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 leading-tight mb-1">{req.roleNeeded}</h4>
                      <p className="text-xs font-bold text-gray-400 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" /> {req.location} • {req.careType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:gap-8 w-full sm:w-auto border-t sm:border-0 border-gray-50 pt-4 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700">
                        {req.status === 'searching' ? 'Finding Matches' : req.status}
                      </span>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center transition shrink-0">
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // VIEW 2: FIND PROVIDERS (Now fully dynamic!)
  // ==========================================
  const renderFind = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-4xl font-serif text-gray-900 leading-tight">
          Find <span className="text-emerald-600 italic">trusted</span><br/>care near you
        </h2>
      </div>

      <div className="flex relative mb-8 shadow-sm">
        <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by role, location..." className="w-full py-4 pl-12 pr-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
      </div>

      {/* DYNAMIC FEATURED NURSES */}
      <div className="mb-10">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center">
          <Star className="w-5 h-5 mr-2 text-amber-500 fill-amber-500" /> Featured by Admin
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {providers
            .filter(nurse => nurse.rating >= 4.8) // Temporarily using rating for "Featured"
            .map(featuredNurse => (
            <div key={featuredNurse.id} className="min-w-[300px] bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:border-emerald-200 transition cursor-pointer" onClick={() => router.push(`/nurses/${featuredNurse.id}`)}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-[#0a271f] text-white flex items-center justify-center font-black text-lg">
                  {featuredNurse.firstName.charAt(0)}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">Rs. {featuredNurse.hourlyRate}<span className="text-xs text-gray-500">/hr</span></p>
                </div>
              </div>
              <h4 className="text-lg font-black text-gray-900">{featuredNurse.firstName} {featuredNurse.lastName}</h4>
              <p className="text-xs text-gray-500 font-medium mb-3">{featuredNurse.role}</p>
              <div className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                <ShieldCheck className="w-4 h-4 mr-1" /> Verified Professional
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALL OTHER PROVIDERS */}
      {loading ? (
        <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : providers.length === 0 ? (
        <div className="py-20 text-center text-gray-500 font-bold">No providers found in your area.</div>
      ) : (
        <div className="space-y-6">
          {providers.map((nurse) => (
            <div key={nurse.id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl border-4 border-white shadow-sm shrink-0">
                    {nurse.firstName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900">{nurse.firstName} {nurse.lastName}</h4>
                    <p className="text-sm text-gray-500 font-medium">{nurse.role} · {nurse.experience} yrs exp.</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
                      <span className="text-sm font-bold text-gray-900">{nurse.rating}</span>
                      <span className="text-sm text-gray-400 ml-1">({nurse.reviews} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black text-gray-900">Rs. {nurse.hourlyRate}<span className="text-sm text-gray-500 font-medium">/hr</span></p>
                  <p className="text-xs text-gray-400 font-bold flex items-center sm:justify-end mt-1"><MapPin className="w-3 h-3 mr-1"/> {nurse.location}</p>
                </div>

              </div>
              
              {nurse.verified && (
                <div className="flex flex-wrap gap-4 mb-6 bg-[#fdfcf9] p-4 rounded-2xl border border-gray-50">
                  <div className="flex items-center text-sm font-bold text-gray-700"><ShieldCheck className="w-5 h-5 text-emerald-500 mr-2"/> Identity Verified</div>
                  <div className="flex items-center text-sm font-bold text-gray-700"><ShieldCheck className="w-5 h-5 text-emerald-500 mr-2"/> License Verified</div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-50">
                <div className="flex flex-wrap gap-2">
                  {nurse.specialties?.map((spec, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg border border-gray-100">{spec}</span>
                  ))}
                </div>
                <button 
                  onClick={() => router.push(`/nurses/${nurse.id}`)} 
                  className="w-full sm:w-auto px-8 py-3 bg-[#0a271f] text-white font-bold rounded-xl hover:bg-black transition shadow-md"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ==========================================
  // VIEW 3: PROFILE
  // ==========================================
  const renderProfile = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <h2 className="text-2xl font-black text-gray-900 font-serif mb-8">My Profile</h2>
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-md">
          <UserCircle className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-1">Sarah Ellison</h3>
        <p className="text-emerald-600 font-bold text-sm mb-8">Patient Account</p>
        
        <div className="space-y-4 max-w-md">
          <div className="bg-[#fdfcf9] p-4 rounded-xl border border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
            <p className="font-bold text-gray-900">sarah.ellison@example.com</p>
          </div>
          <div className="bg-[#fdfcf9] p-4 rounded-xl border border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Primary Location</p>
            <p className="font-bold text-gray-900">Baltimore, MD</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f4f7f6] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="flex-1 overflow-y-auto py-8 px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Patient Menu</p>
          <nav className="space-y-1">
            <button onClick={() => setActiveRoute('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeRoute === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
            </button>
            <button onClick={() => setActiveRoute('find')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeRoute === 'find' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Search className="w-5 h-5 mr-3" /> Find Providers
            </button>
            <button onClick={() => setActiveRoute('profile')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeRoute === 'profile' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <UserCircle className="w-5 h-5 mr-3" /> My Profile
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <button onClick={() => router.push('/dashboard/post-case')} className="w-full bg-[#0a271f] hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm flex justify-center items-center transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" /> New Care Request
          </button>
        </div>
      </aside>

      {/* DYNAMIC CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-8 pt-10">
        {activeRoute === 'dashboard' && renderDashboard()}
        {activeRoute === 'find' && renderFind()}
        {activeRoute === 'profile' && renderProfile()}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveRoute('dashboard')} className={`p-3 rounded-full ${activeRoute === 'dashboard' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400'}`}><LayoutDashboard className="w-6 h-6" /></button>
        <button onClick={() => setActiveRoute('find')} className={`p-3 rounded-full ${activeRoute === 'find' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400'}`}><Search className="w-6 h-6" /></button>
        <button onClick={() => setActiveRoute('profile')} className={`p-3 rounded-full ${activeRoute === 'profile' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400'}`}><UserCircle className="w-6 h-6" /></button>
      </div>
      
    </div>
  );
}