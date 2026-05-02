"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, getDoc, updateDoc, deleteDoc, getDocs, where
} from 'firebase/firestore';
import { 
  ShieldAlert, Users, Activity, CheckCircle, 
  FileText, Star, Loader2, LayoutDashboard, 
  ShieldCheck, ArrowRight, Eye, X, MapPin, 
  Briefcase, GraduationCap, XCircle, AlertCircle, 
  HeartPulse, UserCircle, Search, ClipboardList, 
  UserX, Trash2, ShieldBan, MessageSquare, UserPlus
} from 'lucide-react'; 

export default function AdminDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [adminAuth, setAdminAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState(''); 
  
  // Data States
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [allUsersLog, setAllUsersLog] = useState([]); 
  
  const [viewPatient, setViewPatient] = useState(null);
  const [viewProvider, setViewProvider] = useState(null);
  
  // Action States (Users/Providers)
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, provider: null, reason: '' });
  const [rejecting, setRejecting] = useState(false);
  
  // Delete User Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const [deleting, setDeleting] = useState(false);

  // 🚨 NEW: Universal Case Management States 🚨
  const [caseModal, setCaseModal] = useState({ isOpen: false, data: null, type: 'pending' }); // type: 'pending' or 'active'
  const [auditMessages, setAuditMessages] = useState([]);
  const [deleteCaseModal, setDeleteCaseModal] = useState({ isOpen: false, caseId: null, caseTitle: '' });

  useEffect(() => { setSearchQuery(''); }, [activeTab]);

// ==========================================
  // 1. SECURITY GATEKEEPER & DATA FETCHING
  // ==========================================
  useEffect(() => {
    // 🚨 FIX: Define the unsub functions OUTSIDE the auth callback
    let unsubUsers = () => {};
    let unsubJobs = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // Kill the listeners immediately if the user logs out
        unsubUsers();
        unsubJobs();
        router.push('/login');
        return;
      }

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          
          if (data.role !== 'admin') {
            router.push(`/dashboard/${data.role === 'nurse' ? 'nurse' : 'patient'}`); 
            return;
          }
          
          setAdminAuth(data);
          setLoading(false);

          // Assign the listeners to our outside variables
          unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            const registeredNurses = allUsers.filter(u => u.role === 'nurse' || u.role === 'provider');
            const registeredPatients = allUsers.filter(u => u.role === 'patient' || u.role === 'family');
            
            setAllUsersLog(allUsers.reverse()); 
            setNurses(registeredNurses);
            setPatients(registeredPatients);
          });

          unsubJobs = onSnapshot(collection(db, "care_requests"), (snapshot) => {
            setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
          });

        } else {
          setLoading(false);
          router.push('/login');
        }
      } catch (error) {
        console.error("Authentication Error:", error);
        setLoading(false);
        router.push('/login');
      }
    });

    // 🚨 FIX: This ensures React successfully cleans up the listeners when the component unmounts
    return () => {
      unsubscribeAuth();
      unsubUsers();
      unsubJobs();
    };
  }, [router]);

  // ==========================================
  // 2. AUDIT CHAT LISTENER (Only runs if type === 'active')
  // ==========================================
  useEffect(() => {
    if (!caseModal.isOpen || !caseModal.data?.id || caseModal.type !== 'active') return;
    const chatQuery = query(collection(db, `care_requests/${caseModal.data.id}/messages`));
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setAuditMessages(msgs);
    });
    return () => unsubChat();
  }, [caseModal]);

  // ==========================================
  // 3. ADMIN ACTIONS (Users)
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
    } catch (error) { console.error("Error updating verification:", error); } 
    finally { setActionLoading(false); }
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
    } catch (error) { console.error("Error rejecting:", error); } 
    finally { setRejecting(false); }
  };

  const toggleFeatured = async (nurseId, currentStatus) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "users", nurseId), { isFeatured: !currentStatus });
      if (viewProvider && viewProvider.id === nurseId) {
        setViewProvider({ ...viewProvider, isFeatured: !currentStatus });
      }
    } catch (error) { console.error("Error updating featured status:", error); } 
    finally { setActionLoading(false); }
  };

  const toggleBanUser = async (userId, currentStatus) => {
    setActionLoading(true);
    try {
      const isCurrentlyBanned = currentStatus === 'banned';
      await updateDoc(doc(db, "users", userId), { 
        accountStatus: isCurrentlyBanned ? 'approved' : 'banned',
        isVerified: isCurrentlyBanned ? true : false 
      });
    } catch (error) { console.error("Error toggling ban:", error); } 
    finally { setActionLoading(false); }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const targetUserId = deleteModal.user.id;
      await updateDoc(doc(db, "users", targetUserId), {
        accountStatus: 'banned',
        isVerified: false,
        role: 'deleted',
        name: 'Deleted User',
        full_name: 'Deleted User',
        email: 'deleted@user.local',
        phone: '0000000000',
        avatar_url: '/default-avatar.png'
      });
      
      const casesQuery = query(collection(db, "care_requests"), where("patientId", "==", targetUserId));
      const casesSnapshot = await getDocs(casesQuery);
      const deletePromises = casesSnapshot.docs.map(jobDoc => deleteDoc(doc(db, "care_requests", jobDoc.id)));
      await Promise.all(deletePromises);
      
      setDeleteModal({ isOpen: false, user: null });
    } catch (error) { console.error("Error deleting user and cases:", error); } 
    finally { setDeleting(false); }
  };

  // ==========================================
  // 4. ADMIN ACTIONS (Cases)
  // ==========================================
  const handleApproveCase = async (caseId) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "care_requests", caseId), { status: "searching" });
      setCaseModal({ isOpen: false, data: null, type: 'pending' });
    } catch (error) {
      console.error("Error approving case:", error);
      alert("Failed to approve case.");
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteCase = async () => {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "care_requests", deleteCaseModal.caseId));
      setDeleteCaseModal({ isOpen: false, caseId: null, caseTitle: '' });
      if (caseModal.data?.id === deleteCaseModal.caseId) {
        setCaseModal({ isOpen: false, data: null, type: 'pending' });
      }
    } catch (error) {
      console.error("Error deleting case:", error);
      alert("Failed to delete the case.");
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // 5. UI DATA FILTERS & VARIABLES
  // ==========================================
  const pendingNurses = nurses.filter(n => !n.isVerified && n.accountStatus !== 'banned');
  const verifiedNurses = nurses.filter(n => n.isVerified);
  const featuredNurses = nurses.filter(n => n.isFeatured);
  
  // 🚨 Filter restricted to matched/assigned cases only
  const pendingCases = jobs.filter(j => j.status === 'pending_verification');
  const activeCases = jobs.filter(j => j.status === 'matched');

  const filterData = (data) => {
    if (!searchQuery) return data;
    const lowerQ = searchQuery.toLowerCase();
    return data.filter(item => 
      (item.name || item.full_name || item.roleNeeded || '').toLowerCase().includes(lowerQ) ||
      (item.email || item.patientName || '').toLowerCase().includes(lowerQ) ||
      (item.phone || '').toLowerCase().includes(lowerQ)
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_verification': return { style: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Needs Review' };
      case 'searching': return { style: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Searching' };
      case 'matched': return { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Active Care' };
      case 'completed': return { style: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Completed' };
      default: return { style: 'bg-gray-100 text-gray-600', label: status };
    }
  };

  // ==========================================
  // 6. UI RENDERERS
  // ==========================================
  if (loading || !adminAuth) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a271f] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col items-center animate-in fade-in duration-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
            <div className="bg-emerald-900/50 p-4 rounded-full border border-emerald-700/50 backdrop-blur-sm relative z-10">
              <ShieldCheck className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white font-serif tracking-tight mb-2">
            System Admin<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-emerald-200/80 font-medium tracking-widest uppercase text-xs mb-10">
            Authenticating Master Credentials...
          </p>
          <div className="w-48 h-1 bg-emerald-950 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-1/2 animate-[shimmer_1.5s_infinite_ease-in-out] origin-left"></div>
          </div>
        </div>
        <style jsx>{` @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } } `}</style>
      </div>
    );
  }

  const renderSearchBar = (placeholder) => (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input 
        type="text" 
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
      />
    </div>
  );

  const renderOverview = () => (
    <div className="animate-in fade-in duration-300 space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer" onClick={() => setActiveTab('providers')}>
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Total Nurses</span> <ShieldCheck className="w-5 h-5 text-emerald-600"/></div>
            <div><p className="text-4xl font-black text-gray-900">{nurses.length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer" onClick={() => setActiveTab('patients')}>
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Total Patients</span> <Users className="w-5 h-5 text-blue-600"/></div>
            <div><p className="text-4xl font-black text-gray-900">{patients.length}</p></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-amber-100 transition transform hover:-translate-y-1" onClick={() => setActiveTab('provider-verifications')}>
            <div className="flex justify-between items-start text-amber-700 mb-4"><span className="text-sm font-bold">Nurse Approvals</span> <UserPlus className="w-5 h-5"/></div>
            <div>
              <p className="text-4xl font-black text-amber-900">{pendingNurses.length}</p>
              {pendingNurses.length > 0 && <p className="text-xs font-bold text-amber-800 mt-2 flex items-center">Action Required <ArrowRight className="w-3 h-3 ml-1"/></p>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-yellow-200 bg-yellow-50 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-yellow-100 transition transform hover:-translate-y-1" onClick={() => setActiveTab('case-verifications')}>
            <div className="flex justify-between items-start text-yellow-700 mb-4"><span className="text-sm font-bold">Case Approvals</span> <AlertCircle className="w-5 h-5"/></div>
            <div>
              <p className="text-4xl font-black text-yellow-900">{pendingCases.length}</p>
              {pendingCases.length > 0 && <p className="text-xs font-bold text-yellow-800 mt-2 flex items-center">Verify Pending Cases <ArrowRight className="w-3 h-3 ml-1"/></p>}
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
            <h3 className="font-bold text-gray-900 flex items-center"><ClipboardList className="w-4 h-4 mr-2 text-emerald-600"/> Assigned Care Teams</h3>
            <button onClick={() => setActiveTab('active-cases')} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Audit Teams</button>
          </div>
          <div className="p-0">
            {activeCases.slice(0, 5).map(job => (
              <div key={job.id} className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition flex justify-between items-center">
                 <div>
                    <h4 className="font-bold text-sm text-gray-900">{job.roleNeeded}</h4>
                    <p className="text-xs text-gray-500 capitalize">{job.patientName} • {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'}</p>
                 </div>
                 <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border ${getStatusBadge(job.status).style}`}>{getStatusBadge(job.status).label}</span>
              </div>
            ))}
            {activeCases.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No active cases are currently assigned.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
            <h3 className="font-bold text-gray-900 flex items-center"><Activity className="w-4 h-4 mr-2 text-blue-600"/> Newest Members</h3>
          </div>
          <div className="p-0">
            {allUsersLog.slice(0, 5).map(user => (
              <div key={user.id} className="p-4 border-b border-gray-50 last:border-0 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                    {user.avatar_url && !user.avatar_url.includes('default') ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : (user.name || user.full_name || "U").charAt(0)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{user.name || user.full_name || 'Unnamed'}</h4>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                 </div>
                 <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${user.role === 'nurse' ? 'bg-emerald-50 text-emerald-700' : (user.role === 'patient' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}`}>{user.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCaseVerifications = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Case Verifications ({pendingCases.length})</h3>
        </div>
        <div className="p-0">
          {pendingCases.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">All caught up! No pending cases to review.</div>
          ) : (
            pendingCases.map(req => (
              <div key={req.id} className="p-6 border-b border-gray-50 hover:bg-yellow-50/20 transition flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md mb-3 border ${getStatusBadge(req.status).style}`}>
                    {getStatusBadge(req.status).label}
                  </span>
                  <h3 className="text-xl font-black text-gray-900">{req.roleNeeded}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600 text-sm font-medium flex items-center"><Users className="w-4 h-4 mr-2 text-gray-400"/> Patient: {req.patientName}</p>
                    <p className="text-gray-600 text-sm font-medium flex items-center capitalize"><MapPin className="w-4 h-4 mr-2 text-gray-400"/> Location: {req.location?.city ? `${req.location.city}, ${req.location.zipCode}` : 'Not Specified'}</p>
                    <p className="text-gray-600 text-sm font-medium flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Care Type: {req.careType}</p>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center">
                  <button 
                    onClick={() => setCaseModal({ isOpen: true, data: req, type: 'pending' })}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-emerald-300 transition flex items-center justify-center text-sm shadow-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Review Request
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveCases = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center bg-[#fdfcf9] gap-4">
          <h3 className="font-bold text-gray-900">Active Cases & Audit Logs ({filterData(activeCases).length})</h3>
          {renderSearchBar("Search assigned cases or patients...")}
        </div>
        <div className="p-0">
          {filterData(activeCases).length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">No assigned active cases found.</div>
          ) : (
            filterData(activeCases).map(req => (
              <div key={req.id} className="p-6 border-b border-gray-50 hover:bg-emerald-50/20 transition flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                <div>
                  <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md mb-3 border ${getStatusBadge(req.status).style}`}>
                    {getStatusBadge(req.status).label}
                  </span>
                  
                  {/* 🚨 MATCHED UI: Now uses the exact same layout as the Verifications tab */}
                  <h3 className="text-xl font-black text-gray-900">{req.roleNeeded}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600 text-sm font-medium flex items-center"><Users className="w-4 h-4 mr-2 text-gray-400"/> Patient: {req.patientName}</p>
                    <p className="text-gray-600 text-sm font-medium flex items-center capitalize"><MapPin className="w-4 h-4 mr-2 text-gray-400"/> Location: {req.location?.city ? `${req.location.city}, ${req.location.zipCode}` : 'Not Specified'}</p>
                    <p className="text-gray-600 text-sm font-medium flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400"/> Care Type: {req.careType}</p>
                  </div>

                  {/* Highlighted assigned nurse badge */}
                  {req.nurseName && (
                    <p className="text-xs font-bold text-emerald-700 mt-4 flex items-center bg-emerald-50 w-fit px-3 py-1.5 rounded-md border border-emerald-100">
                      <ShieldCheck className="w-4 h-4 mr-1.5"/> Assigned Provider: {req.nurseName}
                    </p>
                  )}
                </div>
                
                <div className="shrink-0 flex items-center">
                  <button 
                    onClick={() => setCaseModal({ isOpen: true, data: req, type: 'active' })}
                    className="px-5 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition flex items-center text-sm shadow-sm"
                  >
                    <Eye className="w-4 h-4 mr-2" /> Audit Case
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
  
  const ProviderTable = ({ title, dataSet, showSearch = true }) => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">{title} ({filterData(dataSet).length})</h3>
          {showSearch && renderSearchBar("Search by name, email, or phone...")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-5 pl-6">Nurse Info</th>
                <th className="p-5">Contact</th>
                <th className="p-5">Location</th>
                <th className="p-5 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filterData(dataSet).length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No nurses found.</td></tr>
              ) : (
                filterData(dataSet).map(nurse => (
                  <tr key={nurse.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-5 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm">
                          {nurse.avatar_url && !nurse.avatar_url.includes('default') ? <img src={nurse.avatar_url} className="w-full h-full object-cover"/> : (nurse.name || nurse.full_name || "N").charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 flex items-center">
                            {nurse.name || nurse.full_name || 'Unnamed'}
                            {nurse.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500 ml-1.5"/>}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">{nurse.specialty || nurse.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm text-gray-800">{nurse.phone || '-'}</p>
                      <p className="text-xs text-gray-500">{nurse.email}</p>
                    </td>
                    <td className="p-5 text-sm text-gray-600 font-medium capitalize">
                      {nurse.location?.city ? `${nurse.location.city}, ${nurse.location.zipCode}` : 'Not set'}
                    </td>
                    <td className="p-5 text-right pr-6">
                      <button onClick={() => setViewProvider(nurse)} className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:border-emerald-300 hover:text-emerald-700 transition shadow-sm">
                        <Eye className="w-4 h-4 mr-2"/> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPatients = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Registered Patients</h3>
          {renderSearchBar("Search patients...")}
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
              {filterData(patients).length === 0 ? (
                 <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-medium">No patients found.</td></tr>
              ) : (
                filterData(patients).map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setViewPatient(patient)}>
                    <td className="p-5 pl-6 font-bold text-gray-900">{patient.full_name || 'Unnamed'}</td>
                    <td className="p-5">
                      <p className="text-sm text-gray-900">{patient.phone || 'No phone'}</p>
                      <p className="text-xs text-gray-500">{patient.email}</p>
                    </td>
                    <td className="p-5 text-sm text-gray-600 capitalize">
                      {patient.location?.city ? `${patient.location.city}, ${patient.location.zipCode}` : 'Not set'}
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700">
                        {patient.careRecipient || 'Self'}
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <button className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"><Eye className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderMembers = () => (
    <div className="animate-in fade-in duration-300 max-w-6xl">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-[#fdfcf9]">
          <h3 className="font-bold text-gray-900">Access Control & Members</h3>
          {renderSearchBar("Search database...")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="p-5 pl-6">User Info</th>
                <th className="p-5">Role</th>
                <th className="p-5">Access Status</th>
                <th className="p-5 text-right pr-6">Ban/Delete Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filterData(allUsersLog).length === 0 ? (
                 <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No users found in database.</td></tr>
              ) : (
                filterData(allUsersLog).map(user => (
                  <tr key={user.id} className={`transition ${user.accountStatus === 'banned' ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                    <td className="p-5 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm">
                          {user.avatar_url && !user.avatar_url.includes('default') ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : (user.name || user.full_name || "U").charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold ${user.accountStatus === 'banned' ? 'text-red-900 line-through opacity-70' : 'text-gray-900'}`}>{user.name || user.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${user.role === 'nurse' ? 'bg-emerald-50 text-emerald-700' : (user.role === 'patient' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}`}>{user.role}</span>
                    </td>
                    <td className="p-5">
                      {user.accountStatus === 'banned' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
                          <ShieldBan className="w-3 h-3 mr-1"/> Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                      )}
                    </td>
                    <td className="p-5 text-right pr-6 flex justify-end gap-2">
                      <button 
                        onClick={() => toggleBanUser(user.id, user.accountStatus)} 
                        disabled={actionLoading || user.role === 'admin'}
                        className={`p-2 rounded-lg transition border ${user.accountStatus === 'banned' ? 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700' : 'bg-white border-red-200 text-red-600 hover:bg-red-50'}`}
                        title={user.accountStatus === 'banned' ? "Unban User" : "Ban User"}
                      >
                        <ShieldBan className="w-4 h-4"/>
                      </button>
                      
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, user: user })} 
                        disabled={user.role === 'admin'}
                        className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
      
      {/* VIP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
              {adminAuth?.avatar_url && !adminAuth?.avatar_url.includes('default') ? (
                <img src={adminAuth.avatar_url} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <span className="text-purple-700 font-black text-lg">{(adminAuth?.name || adminAuth?.full_name || "A").charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight truncate w-32">{adminAuth?.name || adminAuth?.full_name || 'Admin'}</h3>
              <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit mt-1">System Admin</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Master Control</p>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'overview' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('provider-verifications')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'provider-verifications' ? 'bg-amber-50 text-amber-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><ShieldAlert className="w-5 h-5 mr-3" /> Provider Approvals</span>
              {pendingNurses.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingNurses.length}</span>}
            </button>
            <button onClick={() => setActiveTab('case-verifications')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'case-verifications' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><AlertCircle className="w-5 h-5 mr-3" /> Case Approvals</span>
              {pendingCases.length > 0 && <span className="bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCases.length}</span>}
            </button>
            <button onClick={() => setActiveTab('members')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'members' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <UserX className="w-5 h-5 mr-3" /> Access Control
            </button>
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6 px-4">Databases</p>
            <button onClick={() => setActiveTab('providers')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'providers' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <ShieldCheck className="w-5 h-5 mr-3" /> All Nurses
            </button>
            <button onClick={() => setActiveTab('featured')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'featured' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Star className="w-5 h-5 mr-3" /> Featured Nurses
            </button>
            <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'patients' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Users className="w-5 h-5 mr-3" /> Patients
            </button>
            <button onClick={() => setActiveTab('active-cases')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'active-cases' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <ClipboardList className="w-5 h-5 mr-3" /> Active Cases
            </button>
          </nav>
        </div>
        
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          <button onClick={() => router.push('/profile')} className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-sm flex items-center justify-center">
            <UserCircle className="w-4 h-4 mr-2"/> Admin Profile
          </button>
        </div>
      </aside>

      {/* DYNAMIC TAB RENDERING */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center shrink-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Admin Portal</p>
             <h2 className="text-2xl font-black text-gray-900 font-serif">
                {activeTab === 'overview' && 'Dashboard'}
                {activeTab === 'provider-verifications' && 'Nurse Approvals'}
                {activeTab === 'case-verifications' && 'Case Verifications'}
                {activeTab === 'providers' && 'Verified Nurses'}
                {activeTab === 'featured' && 'Featured Nurses'}
                {activeTab === 'patients' && 'Patient Database'}
                {activeTab === 'active-cases' && 'Active Cases & Audits'}
                {activeTab === 'members' && 'Member Access Control'}
             </h2>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'provider-verifications' && <ProviderTable title="Pending Verifications" dataSet={pendingNurses} />}
          {activeTab === 'case-verifications' && renderCaseVerifications()}
          {activeTab === 'providers' && <ProviderTable title="Verified Nurses" dataSet={verifiedNurses} />}
          {activeTab === 'featured' && <ProviderTable title="Featured Nurses" dataSet={featuredNurses} />}
          {activeTab === 'patients' && renderPatients()}
          {activeTab === 'active-cases' && renderActiveCases()}
          {activeTab === 'members' && renderMembers()}
        </main>
      </div>

      {/* ========================================== */}
      {/* MODALS BELOW */}
      {/* ========================================== */}
      
      {/* 1. DELETE USER MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm"><Trash2 className="w-8 h-8 text-red-600"/></div>
            <h3 className="text-2xl font-black text-center text-gray-900 font-serif mb-2">Delete User?</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              You are about to permanently delete <b>{deleteModal.user.name || deleteModal.user.full_name}</b> from the database. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, user: null })} className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleDeleteUser} disabled={deleting} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition flex items-center justify-center shadow-lg">
                {deleting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Yes, Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MASTER DELETE CASE MODAL */}
      {deleteCaseModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Master Delete Case?</h3>
            <p className="text-gray-500 font-medium mb-8 text-sm">
              Are you sure you want to permanently delete <strong className="text-gray-900">"{deleteCaseModal.caseTitle}"</strong>? This will remove the case and all associated chat logs.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteCaseModal({ isOpen: false, caseId: null, caseTitle: '' })} 
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteCase} 
                disabled={actionLoading} 
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition flex items-center justify-center shadow-lg"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Force Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 3. UNIVERSAL CASE MODAL (REPLACES AUDIT MODAL) 🚨 */}
      {caseModal.isOpen && caseModal.data && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95">
            
            {/* LEFT SIDE: PATIENT NAME & CASE DETAILS */}
            <div className="w-full md:w-1/2 bg-gray-50 border-r border-gray-200 p-8 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${getStatusBadge(caseModal.data.status).style}`}>
                  {getStatusBadge(caseModal.data.status).label}
                </span>
                <button onClick={() => setCaseModal({ isOpen: false, data: null, type: 'pending' })} className="text-gray-400 hover:text-gray-900 font-bold text-sm">Close</button>
              </div>
              
              {/* PATIENT NAME FRONT AND CENTER */}
              <div className="mb-6">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Patient Info</p>
                 <h3 className="text-3xl font-black text-gray-900 leading-tight">{caseModal.data.patientName}</h3>
                 <p className="text-sm text-gray-500 capitalize flex items-center mt-1"><MapPin className="w-4 h-4 mr-1"/> {caseModal.data.location?.city ? `${caseModal.data.location.city}, ${caseModal.data.location.zipCode}` : 'Not Specified'}</p>
              </div>
              
              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Care Requirements</p>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 space-y-3">
                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-bold">Role Needed:</span> <span className="font-black text-gray-900">{caseModal.data.roleNeeded}</span></p>
                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-bold">Care Type:</span> <span className="font-bold text-gray-900">{caseModal.data.careType}</span></p>
                    
                    {/* 🚨 DURATION DISPLAYED HERE 🚨 */}
                    <p className="flex justify-between border-b border-gray-50 pb-2">
                       <span className="text-gray-500 font-bold">Duration:</span> 
                       <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{caseModal.data.duration || 'Not specified'}</span>
                    </p>
                    
                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-bold">Urgency:</span> <span className="font-bold text-red-600">{caseModal.data.urgency || 'Not specified'}</span></p>
                    <div>
                      <span className="text-gray-500 font-bold block mb-1">Detailed Description:</span>
                      <p className="bg-gray-50 p-3 rounded-lg text-gray-600 italic">"{caseModal.data.details || caseModal.data.jobDescription || 'No description provided.'}"</p>
                    </div>
                  </div>
                </div>

                {caseModal.data.nurseName && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Assigned Provider</p>
                    <p className="font-black text-emerald-900">{caseModal.data.nurseName}</p>
                    <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> Background Verified</p>
                  </div>
                )}

                {caseModal.data.medical_urls && caseModal.data.medical_urls.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attached Medical Documents</p>
                    <div className="flex flex-col gap-2">
                      {caseModal.data.medical_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-sm font-bold text-blue-700 group">
                           <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-gray-400 group-hover:text-blue-600" /> View Medical File {i + 1}</span>
                           <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: DYNAMIC PANEL (VERIFICATION VS AUDIT) */}
            <div className="w-full md:w-1/2 bg-white flex flex-col h-[50vh] md:h-auto relative">
               
               {caseModal.type === 'pending' ? (
                   // PENDING VERIFICATION ACTIONS
                   <div className="p-8 flex flex-col h-full justify-center">
                      <div className="text-center mb-8">
                         <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                            <AlertCircle className="w-8 h-8 text-yellow-600" />
                         </div>
                         <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Verification Action Required</h3>
                         <p className="text-gray-500 font-medium text-sm max-w-sm mx-auto">Please review the patient's case details thoroughly. Once verified, this request will instantly go live on the job board.</p>
                      </div>
                      <div className="space-y-4 max-w-md mx-auto w-full">
                         <button 
                            onClick={() => handleApproveCase(caseModal.data.id)} 
                            disabled={actionLoading} 
                            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition flex items-center justify-center shadow-lg"
                         >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <CheckCircle className="w-5 h-5 mr-2"/>} Approve & Publish Case
                         </button>
                         <button 
                            onClick={() => setDeleteCaseModal({ isOpen: true, caseId: caseModal.data.id, caseTitle: caseModal.data.roleNeeded })} 
                            className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition border border-red-100 flex items-center justify-center"
                         >
                            <Trash2 className="w-5 h-5 mr-2"/> Reject & Delete Request
                         </button>
                      </div>
                   </div>
               ) : (
                   // ACTIVE AUDIT LOGS
                   <>
                     <div className="p-6 border-b border-gray-100 bg-[#fdfcf9] flex justify-between items-center shrink-0">
                       <div>
                         <h3 className="font-black text-gray-900 flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-blue-500"/> Communications Audit Log</h3>
                         <p className="text-xs font-bold text-gray-500 mt-1">Read-only view of patient-provider messaging.</p>
                       </div>
                       <button onClick={() => setDeleteCaseModal({ isOpen: true, caseId: caseModal.data.id, caseTitle: caseModal.data.roleNeeded })} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Master Delete Case">
                          <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/50 custom-scrollbar">
                        {auditMessages.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-gray-400">
                             <MessageSquare className="w-12 h-12 mb-3 text-gray-300 opacity-50"/>
                             <p className="font-bold">No messages in this case yet.</p>
                           </div>
                        ) : (
                          auditMessages.map(msg => {
                            const isPatient = msg.senderId === caseModal.data.patientId;
                            return (
                              <div key={msg.id} className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}>
                                <span className="text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">
                                  {isPatient ? 'Patient' : 'Provider'} • {msg.senderName}
                               </span>
                                <div className={`max-w-[75%] p-4 rounded-2xl ${isPatient ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm' : 'bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-tr-sm shadow-sm'}`}>
                                  <p className="text-sm font-medium">{msg.text}</p>
                                </div>
                              </div>
                            )
                          })
                        )}
                     </div>
                     <div className="p-4 bg-white border-t border-gray-100 text-center shrink-0">
                        <p className="text-xs font-bold text-gray-400 flex items-center justify-center"><ShieldCheck className="w-4 h-4 mr-1"/> Admin Read-Only Mode</p>
                     </div>
                   </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW PROVIDER MODAL */}
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
                                    <p className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500 font-medium">Location</span> <span className="font-bold text-gray-900 capitalize">{viewProvider.location?.city ? `${viewProvider.location.city}, ${viewProvider.location.zipCode}` : 'Not set'}</span></p>
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

      {/* 5. REJECT PROVIDER MODAL */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm"><XCircle className="w-8 h-8 text-red-600"/></div>
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
      
      {/* 6. VIEW PATIENT MODAL */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setViewPatient(null)}></div>
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                
                <div className="bg-[#fdfcf9] p-6 border-b border-gray-100 flex justify-between items-start shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {viewPatient.avatar_url && !viewPatient?.avatar_url?.includes('default') ? <img src={viewPatient.avatar_url} className="w-full h-full object-cover"/> : (viewPatient.full_name || "P").charAt(0)}
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
                                    <p className="flex justify-between"><span className="text-gray-500 font-medium">Location</span> <span className="font-bold text-gray-900 capitalize">{viewPatient.location?.city ? `${viewPatient.location.city}, ${viewPatient.location.zipCode}` : 'Not set'}</span></p>
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
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(job.status).style}`}>
                                          {getStatusBadge(job.status).label}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400">{job.urgency}</span>
                                    </div>
                                    <h4 className="font-black text-gray-900 text-lg mb-1">{job.roleNeeded}</h4>
                                    <p className="text-sm text-gray-600 mb-3 capitalize">{job.careType} • {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'}</p>
                                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-3">"{job.details || job.jobDescription}"</p>
                                    
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