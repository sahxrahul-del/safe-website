"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Home, User, Calendar, Activity, MessageSquare, Star, 
  Settings, FileText, Bell, Eye, Inbox, Smartphone, 
  Bookmark, AlertCircle, CheckCircle, Clock, MapPin, 
  ChevronRight, Edit3, Loader2, HeartPulse
} from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function DashboardRouter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  
  // Quick Edit State
  const [quickEdit, setQuickEdit] = useState({ specialty: '', hourlyRate: '', city_zone: '', bio: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setUserData(data);
          setQuickEdit({
            specialty: data.specialty || '',
            hourlyRate: data.hourlyRate || '',
            city_zone: data.city_zone || '',
            bio: data.bio || ''
          });
        } else {
           // If they have no data at all, force them to setup
           router.push('/profile?setup=true');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Handle Availability Toggle
  const toggleAvailability = async () => {
    const newStatus = !userData.isAvailable;
    setUserData({ ...userData, isAvailable: newStatus }); // Optimistic UI update
    try {
      await updateDoc(doc(db, 'users', userData.id), { isAvailable: newStatus });
    } catch (error) {
      console.error("Failed to update availability", error);
      setUserData({ ...userData, isAvailable: !newStatus }); // Revert on fail
    }
  };

  // Handle Quick Profile Edit
  const handleQuickEditSave = async (e) => {
    e.preventDefault();
    setSavingEdit(true); setEditMessage(null);
    try {
      await updateDoc(doc(db, 'users', userData.id), quickEdit);
      setUserData(prev => ({ ...prev, ...quickEdit }));
      setEditMessage("Saved!");
      setTimeout(() => setEditMessage(null), 3000);
    } catch (error) {
      setEditMessage("Error saving.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Calculate Profile Strength (Gamification)
  const calculateStrength = () => {
    if (!userData) return 0;
    let score = 20; // Base points for signing up
    if (userData.avatar_url && !userData.avatar_url.includes('default')) score += 15;
    if (userData.cv_url) score += 20;
    if (userData.bio) score += 10;
    if (userData.hourlyRate) score += 10;
    if (userData.specialty) score += 10;
    if (userData.cert_bachelor_url || userData.cert_slc_url) score += 15;
    return score;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]"><Loader2 className="animate-spin text-emerald-700 w-10 h-10" /></div>;

  // --------------------------------------------------------------------------------
  // PATIENT DASHBOARD PLACHOLDER (We will build this next!)
  // --------------------------------------------------------------------------------
  if (userData?.role === 'patient') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
          <HeartPulse className="w-16 h-16 text-emerald-600 mb-4 animate-bounce" />
          <h1 className="text-2xl font-black text-gray-900">Patient Dashboard Loading...</h1>
          <p className="text-gray-500">We will build this view next!</p>
      </div>
    );
  }

  // --------------------------------------------------------------------------------
  // NURSE DASHBOARD (Premium SaaS View)
  // --------------------------------------------------------------------------------
  const strength = calculateStrength();
  const isPending = userData?.status === 'pending' || !userData?.status;

  return (
    <div className="min-h-screen bg-[#fdfcf9] flex font-sans">
      
      {/* LEFT SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="p-6">
            <h1 className="text-2xl font-black text-emerald-800 font-serif">Safe Home.</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">Beta</span>
          </div>
          
          {/* Mini Profile */}
          <div className="px-6 py-4 border-t border-b border-gray-50 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => router.push('/profile')}>
            <Image src={userData?.avatar_url || '/default-avatar.png'} alt="Profile" width={40} height={40} className="rounded-full object-cover border border-gray-200" unoptimized />
            <div className="overflow-hidden">
              <p className="font-bold text-gray-900 text-sm truncate">{userData?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.specialty || 'Care Provider'}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          </div>

          <nav className="p-4 space-y-1 mt-2">
            <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Overview</p>
            <button className="w-full flex items-center px-3 py-2 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-sm"><Home className="w-4 h-4 mr-3"/> Dashboard</button>
            <button onClick={() => router.push('/profile')} className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition"><User className="w-4 h-4 mr-3"/> My Profile</button>
            <button className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition"><Calendar className="w-4 h-4 mr-3"/> Availability</button>

            <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Activity</p>
            <button className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition justify-between">
              <span className="flex items-center"><Activity className="w-4 h-4 mr-3"/> Care Requests</span>
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">3</span>
            </button>
            <button className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition"><MessageSquare className="w-4 h-4 mr-3"/> Messages</button>
            
            <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Account</p>
            <button className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition"><FileText className="w-4 h-4 mr-3"/> Documents</button>
            <button className="w-full flex items-center px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-bold text-sm transition"><Settings className="w-4 h-4 mr-3"/> Settings</button>
          </nav>
        </div>

        {/* Availability Toggle */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
           <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center">
                 <div className={`w-2 h-2 rounded-full mr-2 transition-colors ${userData?.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                 <span className="text-sm font-bold text-gray-700">{userData?.isAvailable ? 'Available for work' : 'Currently Busy'}</span>
              </div>
              <div className={`relative w-10 h-6 rounded-full transition-colors ${userData?.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                 <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${userData?.isAvailable ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={!!userData?.isAvailable} onChange={toggleAvailability} />
           </label>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        
        {/* Top Nav */}
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Dashboard</p>
             <h2 className="text-2xl font-black text-gray-900">Good morning, {userData?.full_name?.split(' ')[0]} 👋</h2>
           </div>
           <div className="flex items-center gap-4">
             <button className="relative p-2 text-gray-400 hover:text-emerald-600 transition">
               <Bell className="w-6 h-6" />
               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
             </button>
             <div className="md:hidden">
               {/* Mobile avatar trigger */}
               <Image src={userData?.avatar_url || '/default-avatar.png'} alt="Profile" width={40} height={40} className="rounded-full border border-gray-200" unoptimized />
             </div>
           </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto space-y-6">
          
          {/* WARNING BANNER */}
          {isPending && (
             <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in">
                <div className="bg-amber-100 p-2 rounded-full shrink-0"><Clock className="w-6 h-6 text-amber-600"/></div>
                <div>
                   <h3 className="text-amber-900 font-bold text-lg">Your profile is under review</h3>
                   <p className="text-amber-700 text-sm mt-1">Our team is verifying your credentials to ensure patient safety. This usually takes 24–48 hours. We will notify you once approved.</p>
                </div>
             </div>
          )}

          {/* KPI STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Profile Views</span> <Eye className="w-5 h-5"/></div>
                <div><p className="text-3xl font-black text-gray-900">124</p><p className="text-xs text-emerald-600 font-bold mt-1">+18% this week</p></div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Inquiries</span> <Inbox className="w-5 h-5"/></div>
                <div><p className="text-3xl font-black text-gray-900">7</p><p className="text-xs text-emerald-600 font-bold mt-1">+3 new this week</p></div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">WhatsApp Taps</span> <Smartphone className="w-5 h-5"/></div>
                <div><p className="text-3xl font-black text-gray-900">12</p><p className="text-xs text-gray-500 font-bold mt-1">same as last week</p></div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Saved Profiles</span> <Bookmark className="w-5 h-5"/></div>
                <div><p className="text-3xl font-black text-gray-900">31</p><p className="text-xs text-emerald-600 font-bold mt-1">+5 all time</p></div>
             </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* LEFT COLUMN (Wider) */}
             <div className="lg:col-span-2 space-y-6">
                
                {/* Quick Edit Panel */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                   <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-gray-900">Quick Profile Edit</h3>
                        <p className="text-xs text-gray-500">Update your key details instantly</p>
                      </div>
                      <Edit3 className="w-5 h-5 text-gray-400" />
                   </div>
                   <form onSubmit={handleQuickEditSave} className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Care Role</label>
                            <select value={quickEdit.specialty} onChange={(e) => setQuickEdit({...quickEdit, specialty: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium">
                               <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                               <option value="CNA / Caregiver">CNA / Caregiver</option>
                               <option value="Elderly Care">Elderly Care</option>
                               <option value="Post-Op Recovery">Post-Op Recovery</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hourly Rate (NPR)</label>
                            <input type="number" value={quickEdit.hourlyRate} onChange={(e) => setQuickEdit({...quickEdit, hourlyRate: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" placeholder="e.g. 500" />
                         </div>
                         <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Professional Bio</label>
                            <textarea value={quickEdit.bio} onChange={(e) => setQuickEdit({...quickEdit, bio: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium min-h-[80px]" placeholder="Briefly describe your experience..."></textarea>
                         </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                         <span className="text-sm font-bold text-emerald-600">{editMessage}</span>
                         <button type="submit" disabled={savingEdit} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition disabled:opacity-70 flex items-center">
                            {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Save Changes"}
                         </button>
                      </div>
                   </form>
                </div>

                {/* Hardcoded Recent Views */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                   <div className="flex justify-between items-end mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">Recent Profile Views</h3>
                        <p className="text-xs text-gray-500">Families looking at your profile</p>
                      </div>
                      <button className="text-emerald-600 text-sm font-bold hover:underline">See all &rarr;</button>
                   </div>
                   <div className="space-y-3">
                      {['Martha Ellison', 'David Park', 'Sunrise Facility'].map((name, i) => (
                         <div key={i} className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100 cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0">{name.charAt(0)}</div>
                            <div className="ml-3 flex-1">
                               <p className="text-sm font-bold text-gray-900">{name}</p>
                               <p className="text-xs text-gray-500">Viewed {i + 2} hours ago</p>
                            </div>
                            {i === 0 && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold">New</span>}
                         </div>
                      ))}
                   </div>
                </div>

             </div>

             {/* RIGHT COLUMN (Narrower) */}
             <div className="space-y-6">
                
                {/* Profile Strength Gamification */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${strength}%` }}></div>
                   </div>
                   <h3 className="font-bold text-gray-900 mt-2">Profile Strength</h3>
                   <p className="text-3xl font-black text-emerald-600 my-2">{strength}%</p>
                   
                   <div className="space-y-2 mt-4 text-sm font-medium">
                      <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Basic Info Added</p>
                      <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Role & Experience</p>
                      {userData?.cv_url ? (
                         <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> CV Uploaded</p>
                      ) : (
                         <button onClick={() => router.push('/profile')} className="flex items-center text-amber-600 hover:text-amber-700 w-full text-left py-1 group"><AlertCircle className="w-4 h-4 mr-2"/> Upload CV <span className="ml-auto opacity-0 group-hover:opacity-100 transition text-xs font-bold bg-amber-100 px-2 py-0.5 rounded">Add +</span></button>
                      )}
                      {(userData?.cert_bachelor_url || userData?.cert_slc_url) ? (
                         <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Certificates Added</p>
                      ) : (
                         <button onClick={() => router.push('/profile')} className="flex items-center text-amber-600 hover:text-amber-700 w-full text-left py-1 group"><AlertCircle className="w-4 h-4 mr-2"/> Add Certificates <span className="ml-auto opacity-0 group-hover:opacity-100 transition text-xs font-bold bg-amber-100 px-2 py-0.5 rounded">Add +</span></button>
                      )}
                   </div>
                   <button onClick={() => router.push('/profile')} className="mt-6 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm rounded-lg transition">Edit Full Profile</button>
                </div>

             </div>
          </div>
        </div>
      </main>
    </div>
  );
}