"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, onSnapshot 
} from 'firebase/firestore';
import { 
  LayoutDashboard, UserCircle, Plus, Search, Bell, 
  MapPin, Loader2, HeartPulse, Clock, FileText, ChevronRight, 
  Activity, Star, ShieldCheck, Briefcase, MessageSquare
,CheckCircle} from 'lucide-react';

export default function PatientSaaSDashboard() {
  const router = useRouter();
  
  // Real State
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Database Feeds
  const [myRequests, setMyRequests] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  // ==========================================
  // 1. SYSTEM INITIALIZATION & SECURITY
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUserAuth(currentUser);

      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        
        // Security check: Must be a patient
        const safeRole = data.role?.toLowerCase() || '';
        if (safeRole !== 'patient' && safeRole !== 'family') {
          router.push('/dashboard/nurse');
          return;
        }
        
        setUserData(data);

        // 1. Listen to Care Requests (Only mine)
        const reqQuery = query(collection(db, "care_requests"));
        const unsubReqs = onSnapshot(reqQuery, (snapshot) => {
          const allReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          // In a real production app, you filter this by patientId. 
          // For now, we show all so your seed data works!
          setMyRequests(allReqs); 
        });

        // 2. Listen to REAL Nurses (From the 'users' collection)
        let realNurses = [];
        let fakeNurses = [];

        const updateProviderList = () => {
          setAvailableProviders([...realNurses, ...fakeNurses]);
          setPageLoading(false);
        };

        const unsubUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
          const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          realNurses = allUsers.filter(u => u.role?.toLowerCase() === 'nurse' || u.role?.toLowerCase() === 'provider');
          updateProviderList();
        });

        // 3. Listen to MEGA-SEEDER Nurses (From the 'providers' collection)
        const unsubProviders = onSnapshot(query(collection(db, "providers")), (snapshot) => {
          fakeNurses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          updateProviderList();
        });

        return () => {
          unsubReqs();
          unsubUsers();
          unsubProviders();
        };

      } else {
        router.push('/setup-profile');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);


  // ==========================================
  // 3. UI CALCULATIONS
  // ==========================================
  if (pageLoading || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500 font-bold">Securely loading Patient Dashboard...</p>
      </div>
    );
  }

  const displayName = userData.name || userData.full_name || "Patient";
  const displayPhoto = userData.photoURL || userData.avatar_url || null;
  const displayLocation = userData.location || userData.district || 'Location not set';

  // Real Dynamic Stats
  const activeCount = myRequests.filter(r => r.status === 'searching').length;
  const matchedCount = myRequests.filter(r => r.status === 'matched').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;

  // ==========================================
  // RENDER: DASHBOARD TAB
  // ==========================================
  const renderDashboard = () => (
    <div className="animate-in fade-in duration-300 max-w-5xl space-y-8">
      
      {/* KPI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center"><Activity className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Searching Cases</p>
            <p className="text-2xl font-black text-gray-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center"><HeartPulse className="w-6 h-6 text-emerald-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Care</p>
            <p className="text-2xl font-black text-gray-900">{matchedCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-purple-600" /></div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-black text-gray-900">{completedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Recent Care Requests</h3>
          <button onClick={() => setActiveTab('my-cases')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View All</button>
        </div>
        
        <div className="p-6">
          {myRequests.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="w-6 h-6 text-gray-300" /></div>
              <h3 className="text-base font-black text-gray-900 mb-1">No requests yet</h3>
              <p className="text-sm text-gray-500 mb-4">You haven't posted any care needs.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition bg-white">
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
                  <div className="flex items-center justify-between sm:justify-end sm:gap-8 border-t sm:border-0 border-gray-50 pt-4 sm:pt-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.status === 'searching' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {req.status === 'searching' ? 'Finding Matches' : req.status}
                    </span>
                    <button onClick={() => setActiveTab('my-cases')} className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-emerald-50 flex items-center justify-center transition shrink-0">
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
  // RENDER: FIND PROVIDERS TAB
  // ==========================================
  const renderFindProviders = () => (
    <div className="animate-in fade-in duration-300 max-w-5xl">
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
          {availableProviders
            .filter(nurse => nurse.isFeatured || nurse.rating >= 4.8)
            .map(featuredNurse => (
            <div key={featuredNurse.id} className="min-w-[300px] bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:border-emerald-200 transition cursor-pointer" onClick={() => router.push(`/nurses/${featuredNurse.id}`)}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-[#0a271f] text-white overflow-hidden flex items-center justify-center font-black text-lg">
                  {featuredNurse.avatar_url || featuredNurse.photoURL ? <img src={featuredNurse.avatar_url || featuredNurse.photoURL} alt="Nurse" className="w-full h-full object-cover"/> : (featuredNurse.name || featuredNurse.full_name || "N").charAt(0)}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-gray-900">Rs. {featuredNurse.hourlyRate || 1500}<span className="text-xs text-gray-500">/hr</span></p>
                </div>
              </div>
              <h4 className="text-lg font-black text-gray-900">{featuredNurse.name || featuredNurse.full_name}</h4>
              <p className="text-xs text-gray-500 font-medium mb-3">{featuredNurse.specialty || featuredNurse.role}</p>
              <div className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                <ShieldCheck className="w-4 h-4 mr-1" /> Verified Professional
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALL OTHER PROVIDERS */}
      {availableProviders.length === 0 ? (
        <div className="py-20 text-center text-gray-500 font-bold">No providers found in your area yet.</div>
      ) : (
        <div className="space-y-6">
          {availableProviders.map((nurse) => (
            <div key={nurse.id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 font-black text-xl border-4 border-white shadow-sm shrink-0">
                    {nurse.avatar_url || nurse.photoURL ? <img src={nurse.avatar_url || nurse.photoURL} alt="Nurse" className="w-full h-full object-cover"/> : (nurse.name || nurse.full_name || "N").charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900">{nurse.name || nurse.full_name}</h4>
                    <p className="text-sm text-gray-500 font-medium">{nurse.specialty || nurse.role} · {nurse.experience || '3'} yrs exp.</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black text-gray-900">Rs. {nurse.hourlyRate || 1500}<span className="text-sm text-gray-500 font-medium">/hr</span></p>
                  <p className="text-xs text-gray-400 font-bold flex items-center sm:justify-end mt-1"><MapPin className="w-3 h-3 mr-1"/> {nurse.location || nurse.district}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-50">
                <button 
                  onClick={() => router.push(`/nurses/${nurse.id}`)} 
                  className="w-full sm:w-auto px-8 py-3 bg-[#0a271f] text-white font-bold rounded-xl hover:bg-black transition shadow-md"
                >
                  View Full Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ==========================================
  // RENDER: MY CASES TAB
  // ==========================================
  const renderMyCases = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 font-serif">My Care Requests</h2>
          <p className="text-sm text-gray-500 font-medium">Track the status of your family's care.</p>
        </div>
        <button onClick={() => router.push('/dashboard/post-case')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-2"/> New Request
        </button>
      </div>

      <div className="space-y-4">
        {myRequests.map(job => (
          <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:shadow-md transition">
            <div>
              <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md mb-3 ${job.status === 'searching' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {job.status === 'searching' ? 'Finding Matches' : job.status}
              </span>
              <h3 className="text-xl font-black text-gray-900">{job.roleNeeded}</h3>
              <p className="text-gray-500 text-sm mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1"/> {job.location} • {job.careType}</p>
              
              {/* Show Nurse if Matched */}
              {job.nurseName && (
                <div className="mt-4 flex items-center bg-gray-50 p-3 rounded-lg w-fit">
                  <div className="w-8 h-8 rounded-full bg-emerald-200 overflow-hidden flex items-center justify-center mr-3">
                    {job.nursePhoto ? <img src={job.nursePhoto} className="w-full h-full object-cover"/> : <span className="text-emerald-800 font-bold text-xs">{job.nurseName.charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Assigned Provider</p>
                    <p className="text-sm font-black text-gray-900">{job.nurseName}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <button onClick={() => setActiveTab('messages')} className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-gray-300 transition flex justify-center items-center">
                 <MessageSquare className="w-4 h-4 mr-2"/> Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ==========================================
  // RENDER: MESSAGES TAB
  // ==========================================
  const renderMessages = () => (
    <div className="animate-in fade-in duration-300 h-[70vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center max-w-4xl">
      <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><MessageSquare className="w-12 h-12"/></div>
      <h2 className="text-3xl font-black text-gray-900 font-serif mb-2">Secure Messaging</h2>
      <p className="text-gray-500 font-medium max-w-md mx-auto mb-8">
        This is where you will chat directly with the nurses providing care for your family. The real-time messaging system is currently under development!
      </p>
    </div>
  );

  // ==========================================
  // MASTER RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR (Architecturally identical to Nurse Dashboard) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
              {displayPhoto ? (
                <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-emerald-700 font-black text-lg">{displayName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight truncate w-32">{displayName}</h3>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate w-32">Patient Account</p>
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded-lg">
            <MapPin className="w-3 h-3 mr-1 text-gray-400" /> {displayLocation}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Patient Menu</p>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
            </button>
            <button onClick={() => setActiveTab('find')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'find' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Search className="w-5 h-5 mr-3" /> Find Providers
            </button>
            <button onClick={() => setActiveTab('my-cases')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'my-cases' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Briefcase className="w-5 h-5 mr-3" /> My Cases
            </button>
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6 px-4">Activity</p>
            <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'messages' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><MessageSquare className="w-5 h-5 mr-3" /> Messages</span>
            </button>
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6 px-4">Account</p>
            <button onClick={() => router.push('/profile')} className="w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
              <UserCircle className="w-5 h-5 mr-3" /> Full Profile
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <button onClick={() => router.push('/dashboard/post-case')} className="w-full bg-[#0a271f] hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm flex justify-center items-center transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
            <Plus className="w-4 h-4 mr-2" /> New Care Request
          </button>
        </div>
      </aside>

      {/* DYNAMIC TAB RENDERING */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center shrink-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Patient Portal</p>
             <h2 className="text-2xl font-black text-gray-900 font-serif">Hello, {displayName.split(' ')[0]} 👋</h2>
           </div>
           <div className="flex items-center gap-4">
             <button className="relative p-2 text-gray-400 hover:text-emerald-600 bg-gray-50 rounded-full transition">
               <Bell className="w-5 h-5" />
               {activeCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
             </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'find' && renderFindProviders()}
          {activeTab === 'my-cases' && renderMyCases()}
          {activeTab === 'messages' && renderMessages()}
        </main>
      </div>

    </div>
  );
}