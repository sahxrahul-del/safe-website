"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { 
  ShieldAlert, Users, Activity, CheckCircle, 
  FileText, Star, Loader2, LayoutDashboard, 
  ShieldCheck, ArrowRight, Eye, X, MapPin, 
  Phone, Mail, Briefcase, GraduationCap, XCircle, AlertCircle, HeartPulse, UserCircle 
} from 'lucide-react'; 

export default function AdminDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data States
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [viewPatient, setViewPatient] = useState(null);
  
  const [viewProvider, setViewProvider] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, provider: null, reason: '' });
  const [rejecting, setRejecting] = useState(false);

  // ==========================================
  // 1. SECURITY GATEKEEPER & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        
        // STRICT ADMIN CHECK
        if (data.role !== 'admin') {
          router.push(`/dashboard/${data.role === 'nurse' ? 'nurse' : 'patient'}`); 
          return;
        }
        
        setAdminAuth(data);
        setLoading(false);

        // Fetch All Users (Background)
        const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
          const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const registeredNurses = allUsers.filter(u => u.role === 'nurse' || u.role === 'provider');
          const registeredPatients = allUsers.filter(u => u.role === 'patient' || u.role === 'family');
          
          // Sort nurses: Unverified ones bubble to the top
          registeredNurses.sort((a, b) => (a.isVerified === b.isVerified) ? 0 : a.isVerified ? 1 : -1);

          setNurses(registeredNurses);
          setPatients(registeredPatients);
        });

        // Fetch All Jobs (Background)
        const unsubJobs = onSnapshot(collection(db, "care_requests"), (snapshot) => {
          setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
          unsubUsers();
          unsubJobs();
        };
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // ==========================================
  // 2. ADMIN ACTIONS
  // ==========================================
  const toggleVerification = async (nurseId, currentStatus) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", nurseId), { 
        isVerified: !currentStatus,
        accountStatus: !currentStatus ? 'approved' : 'pending',
        rejectionReason: null 
      });
      if (viewProvider && viewProvider.id === nurseId) {
        setViewProvider({ ...viewProvider, isVerified: !currentStatus });
      }
    } catch (error) {
      console.error("Error updating verification:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setRejecting(true);
    try {
      await updateDoc(doc(db, "users", rejectModal.provider.id), {
        isVerified: false,
        accountStatus: 'rejected',
        rejectionReason: rejectModal.reason
      });
      setRejectModal({ isOpen: false, provider: null, reason: '' });
      setViewProvider(null); 
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setRejecting(false);
    }
  };

  const toggleFeatured = async (nurseId, currentStatus) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", nurseId), { isFeatured: !currentStatus });
      if (viewProvider && viewProvider.id === nurseId) {
        setViewProvider({ ...viewProvider, isFeatured: !currentStatus });
      }
    } catch (error) {
      console.error("Error updating featured status:", error);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // 3. UI RENDERERS
  // ==========================================
  if (loading || !adminAuth) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a271f] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
            <div className="bg-emerald-900/50 p-4 rounded-full border border-emerald-700/50 backdrop-blur-sm relative z-10">
              <HeartPulse className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white font-serif tracking-tight mb-2">
            Safe Home<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-emerald-200/80 font-medium tracking-widest uppercase text-xs mb-10">
            Securely Loading Admin Portal...
          </p>
          <div className="w-48 h-1 bg-emerald-950 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-1/2 animate-[shimmer_1.5s_infinite_ease-in-out] origin-left"></div>
          </div>
        </div>
        <style jsx>{`
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        `}</style>
      </div>
    );
  }

  const pendingCount = nurses.filter(n => !n.isVerified).length;
  // ENHANCEMENT: Calculate Active vs Completed Jobs for the Dashboard
  const activeJobsCount = jobs.filter(j => j.status !== 'completed').length;

  const renderOverview = () => (
    <div className="animate-in fade-in duration-300 space-y-6 max-w-6xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer" onClick={() => setActiveTab('providers')}>
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Total Providers</span> <ShieldCheck className="w-5 h-5 text-emerald-600"/></div>
            <div><p className="text-4xl font-black text-gray-900">{nurses.length}</p></div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer" onClick={() => setActiveTab('patients')}>
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Total Patients</span> <Users className="w-5 h-5 text-blue-600"/></div>
            <div><p className="text-4xl font-black text-gray-900">{patients.length}</p></div>
          </div>
          
          {/* ENHANCED JOB METRICS */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start text-gray-400 mb-2"><span className="text-sm font-bold">Total Jobs</span> <Briefcase className="w-5 h-5 text-purple-600"/></div>
            <div>
              <p className="text-4xl font-black text-gray-900 mb-1">{jobs.length}</p>
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md">{activeJobsCount} Active</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-amber-100 transition transform hover:-translate-y-1" onClick={() => setActiveTab('providers')}>
            <div className="flex justify-between items-start text-amber-700 mb-4"><span className="text-sm font-bold">Pending Approvals</span> <AlertCircle className="w-5 h-5"/></div>
            <div>
              <p className="text-4xl font-black text-amber-900">{pendingCount}</p>
              {pendingCount > 0 && <p className="text-xs font-bold text-amber-800 mt-2 flex items-center">Action Required <ArrowRight className="w-3 h-3 ml-1"/></p>}
            </div>
          </div>
      </div>
    </div>
  );

  const renderProviders = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Provider Database</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-5 pl-6">Provider Info</th>
                <th className="p-5">Location</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {nurses.map(nurse => (
                <tr key={nurse.id} className={`transition ${!nurse.isVerified ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/50'}`}>
                  <td className="p-5 pl-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {nurse.avatar_url && !nurse.avatar_url.includes('default') ? <img src={nurse.avatar_url} className="w-full h-full object-cover"/> : (nurse.name || nurse.full_name || "N").charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{nurse.name || nurse.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500 font-medium">{nurse.specialty || nurse.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-sm text-gray-600 font-medium">{nurse.location || nurse.district || 'Not Set'}</p>
                  </td>
                  <td className="p-5">
                    {nurse.isVerified ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">Pending</span>
                    )}
                    {nurse.isFeatured && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-200 ml-2"><Star className="w-3 h-3 mr-1 fill-purple-700"/> Featured</span>
                    )}
                  </td>
                  <td className="p-5 text-right pr-6">
                    <button onClick={() => setViewProvider(nurse)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:border-emerald-300 hover:text-emerald-700 transition shadow-sm">
                      <Eye className="w-4 h-4 mr-2"/> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Registered Patients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-5 pl-6">Patient Name</th>
                <th className="p-5">Contact</th>
                <th className="p-5">Location</th>
                <th className="p-5">Care Recipient</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.map(patient => (
                <tr key={patient.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setViewPatient(patient)}>
                  <td className="p-5 pl-6 font-bold text-gray-900">{patient.full_name || 'Unnamed'}</td>
                  <td className="p-5">
                    <p className="text-sm text-gray-900">{patient.phone || 'No phone'}</p>
                    <p className="text-xs text-gray-500">{patient.email}</p>
                  </td>
                  <td className="p-5 text-sm text-gray-600">{patient.city_zone || patient.district || 'Not Set'}</td>
                  <td className="p-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700">
                      {patient.careRecipient || 'Self'}
                    </span>
                  </td>
                  <td className="p-5 text-right pr-6">
                    <button className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"><Eye className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // MASTER RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-emerald-600" />
            <h2 className="text-xl font-black font-serif text-gray-900">Safe Home.</h2>
          </div>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">God Mode Activated</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Master Control</p>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'overview' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('providers')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'providers' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><ShieldCheck className="w-5 h-5 mr-3" /> Providers</span>
              {pendingCount > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'patients' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Users className="w-5 h-5 mr-3" /> Patients
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <button onClick={() => router.push('/profile')} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-sm mb-3 flex items-center justify-center">
            <UserCircle className="w-4 h-4 mr-2"/> Admin Profile
          </button>
        </div>
      </aside>

      {/* DYNAMIC TAB RENDERING */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center shrink-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Admin Portal</p>
             <h2 className="text-2xl font-black text-gray-900 font-serif">Hello, {adminAuth?.name || adminAuth?.full_name?.split(' ')[0] || 'Admin'} 👋</h2>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'providers' && renderProviders()}
          {activeTab === 'patients' && renderPatients()}
        </main>
      </div>

      {/* PROVIDER MODAL */}
      {viewProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setViewProvider(null)}></div>
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                
                <div className="bg-[#fdfcf9] p-6 border-b border-gray-100 flex justify-between items-start shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {viewProvider.avatar_url && !viewProvider.avatar_url.includes('default') ? <img src={viewProvider.avatar_url} className="w-full h-full object-cover"/> : (viewProvider.name || viewProvider.full_name || "N").charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 font-serif">{viewProvider.name || viewProvider.full_name}</h3>
                        <p className="text-emerald-700 font-bold text-sm">{viewProvider.specialty || viewProvider.role}</p>
                      </div>
                    </div>
                    <button onClick={() => setViewProvider(null)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400"/> Contact & Location</h4>
                                <div className="space-y-3 text-sm">
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Email</span> <span className="font-bold text-gray-900">{viewProvider.email || '-'}</span></p>
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Phone</span> <span className="font-bold text-gray-900">{viewProvider.phone || '-'}</span></p>
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">District</span> <span className="font-bold text-gray-900">{viewProvider.district || viewProvider.location || '-'}</span></p>
                                    <p className="flex justify-between"><span className="text-gray-500 font-medium">Hourly Rate</span> <span className="font-bold text-emerald-700">Rs. {viewProvider.hourlyRate || 'Not Set'}</span></p>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center"><GraduationCap className="w-4 h-4 mr-2 text-gray-400"/> Credentials</h4>
                                <div className="space-y-3 text-sm">
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">NMC License</span> <span className="font-bold text-gray-900">{viewProvider.licenseNumber || 'Not provided'}</span></p>
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Experience</span> <span className="font-bold text-gray-900">{viewProvider.experience ? `${viewProvider.experience} Years` : '-'}</span></p>
                                    <p className="text-gray-500 font-medium mt-4">Professional Bio</p>
                                    <p className="bg-gray-50 p-3 rounded-xl text-gray-700 italic border border-gray-100">{viewProvider.bio || 'No bio provided.'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                                <button 
                                    onClick={() => toggleVerification(viewProvider.id, viewProvider.isVerified)}
                                    disabled={actionLoading}
                                    className={`w-full py-4 rounded-xl font-black transition flex items-center justify-center shadow-sm ${viewProvider.isVerified ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#0a271f] text-white hover:bg-black'}`}
                                >
                                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : (viewProvider.isVerified ? <><XCircle className="w-5 h-5 mr-2"/> Revoke Verification</> : <><CheckCircle className="w-5 h-5 mr-2"/> Approve & Verify</>)}
                                </button>

                                {!viewProvider.isVerified && (
                                  <button 
                                      onClick={() => setRejectModal({ isOpen: true, provider: viewProvider, reason: '' })}
                                      className="w-full py-4 rounded-xl font-bold transition flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                                  >
                                      <XCircle className="w-5 h-5 mr-2"/> Reject Provider
                                  </button>
                                )}
                                
                                <button 
                                    onClick={() => toggleFeatured(viewProvider.id, viewProvider.isFeatured)}
                                    disabled={actionLoading || !viewProvider.isVerified}
                                    className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center border disabled:opacity-50 ${viewProvider.isFeatured ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <Star className={`w-5 h-5 mr-2 ${viewProvider.isFeatured ? 'fill-purple-700' : ''}`}/> {viewProvider.isFeatured ? 'Unfeature from Top Search' : 'Feature Provider'}
                                </button>
                            </div>

                            <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[300px]">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Uploaded Documents</h4>
                                <div className="space-y-2 flex-1 flex flex-col">
                                    {viewProvider.cv_url && (
                                        <a href={viewProvider.cv_url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition group"><FileText className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 mr-3" /><span className="font-bold text-gray-900 text-sm">Full CV (PDF)</span></a>
                                    )}
                                    {viewProvider.license_url && (
                                        <a href={viewProvider.license_url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition group"><ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 mr-3" /><span className="font-bold text-gray-900 text-sm">Nursing License</span></a>
                                    )}
                                    {viewProvider.cert_bachelor_url && (
                                        <a href={viewProvider.cert_bachelor_url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition group"><GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 mr-3" /><span className="font-bold text-gray-900 text-sm">Bachelor's Degree</span></a>
                                    )}
                                    {viewProvider.cert_plus2_url && (
                                        <a href={viewProvider.cert_plus2_url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition group"><CheckCircle className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 mr-3" /><span className="font-bold text-gray-900 text-sm">+2 / Higher Sec.</span></a>
                                    )}
                                    {viewProvider.cert_slc_url && (
                                        <a href={viewProvider.cert_slc_url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition group"><CheckCircle className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 mr-3" /><span className="font-bold text-gray-900 text-sm">SLC / Schooling</span></a>
                                    )}
                                    
                                    {!viewProvider.cv_url && !viewProvider.license_url && !viewProvider.cert_bachelor_url && !viewProvider.cert_plus2_url && !viewProvider.cert_slc_url && (
                                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <FileText className="w-8 h-8 text-gray-300 mb-2"/>
                                            <p className="text-sm font-medium text-gray-500">No documents uploaded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><XCircle className="w-8 h-8 text-red-600"/></div>
            <h3 className="text-2xl font-black text-center text-gray-900 font-serif mb-2">Reject Provider</h3>
            <p className="text-gray-500 text-sm text-center mb-6">Explain why {rejectModal.provider.name || 'this provider'} is being rejected. They will see this message.</p>
            
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea required value={rejectModal.reason} onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium resize-none min-h-[120px] focus:ring-2 focus:ring-red-100 text-sm" placeholder="e.g. 'Your Nursing License PDF is blurry and unreadable. Please re-upload a clear copy.'"></textarea>
              <div className="flex gap-3">
                <button type="button" onClick={() => setRejectModal({ isOpen: false, provider: null, reason: '' })} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={rejecting} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition flex items-center justify-center shadow-lg">
                  {rejecting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Send Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* PATIENT MODAL */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setViewPatient(null)}></div>
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                
                <div className="bg-[#fdfcf9] p-6 border-b border-gray-100 flex justify-between items-start shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {viewPatient.avatar_url && !viewProvider?.avatar_url?.includes('default') ? <img src={viewPatient.avatar_url} className="w-full h-full object-cover"/> : (viewPatient.full_name || "P").charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 font-serif">{viewPatient.full_name || 'Unnamed Patient'}</h3>
                        <p className="text-blue-700 font-bold text-sm">Registered Patient Account</p>
                      </div>
                    </div>
                    <button onClick={() => setViewPatient(null)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        <div className="md:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center"><Users className="w-4 h-4 mr-2 text-blue-600"/> Patient Details</h4>
                                <div className="space-y-3 text-sm">
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Care For</span> <span className="font-bold text-gray-900">{viewPatient.careRecipient || 'Self'}</span></p>
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Mobility</span> <span className="font-bold text-gray-900">{viewPatient.mobility || 'Not specified'}</span></p>
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Phone</span> <span className="font-bold text-gray-900">{viewPatient.phone || '-'}</span></p>
                                    <p className="flex justify-between"><span className="text-gray-500 font-medium">Location</span> <span className="font-bold text-gray-900">{viewPatient.district || '-'}</span></p>
                                </div>
                            </div>
                            {viewPatient.emergencyName && (
                              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                                  <h4 className="font-bold text-red-900 mb-2 flex items-center"><ShieldAlert className="w-4 h-4 mr-2"/> Emergency Contact</h4>
                                  <p className="font-bold text-red-800">{viewPatient.emergencyName} ({viewPatient.emergencyRelation})</p>
                                  <p className="text-red-700 font-medium">{viewPatient.emergencyPhone}</p>
                              </div>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h4 className="font-black text-gray-900 text-lg mb-2">Care Requests Posted</h4>
                            {jobs.filter(j => j.patientId === viewPatient.id).length === 0 ? (
                               <p className="text-gray-500 italic p-6 bg-white rounded-2xl border border-gray-100">This patient hasn't posted any cases yet.</p>
                            ) : (
                               jobs.filter(j => j.patientId === viewPatient.id).map(job => (
                                 <div key={job.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${job.status === 'searching' ? 'bg-amber-50 text-amber-700' : (job.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700')}`}>
                                          {job.status}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400">{job.urgency}</span>
                                    </div>
                                    <h4 className="font-black text-gray-900 text-lg mb-1">{job.roleNeeded}</h4>
                                    <p className="text-sm text-gray-600 mb-3">{job.careType} • {job.location}</p>
                                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-3">"{job.details}"</p>
                                    
                                    {job.medical_url && (
                                      <a href={job.medical_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition">
                                        <FileText className="w-4 h-4 mr-2"/> View Attached Medical File
                                      </a>
                                    )}
                                 </div>
                               ))
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}