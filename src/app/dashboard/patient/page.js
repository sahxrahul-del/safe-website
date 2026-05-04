"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, onSnapshot, where, or, updateDoc, addDoc, serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, UserCircle, Plus, Search, Bell, 
  MapPin, Loader2, HeartPulse, FileText, ChevronRight, 
  Activity, Star, ShieldCheck, Briefcase, MessageSquare, CheckCircle, AlertTriangle, Trash2 
} from 'lucide-react';

export default function PatientSaaSDashboard() {
  const router = useRouter();
  
  // Real State
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);

  // Chat State
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Database Feeds
  const [myRequests, setMyRequests] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  // Review Modal State
  const [reviewModal, setReviewModal] = useState({ isOpen: false, job: null, rating: 5, reviewText: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Delete Case Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, jobId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // ==========================================
  // CUSTOM SORTING FUNCTION FOR CASES
  // ==========================================
  const sortCases = (casesArray) => {
    const statusWeight = {
      'pending_verification': 1, 
      'matched': 2,
      'searching': 3,
      'completed': 4
    };

    return [...casesArray].sort((a, b) => {
      const weightDiff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (weightDiff !== 0) return weightDiff;
      
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  };

  // Helper for Status Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_verification':
        return { style: 'bg-yellow-100 text-yellow-800 border border-yellow-200', label: 'In Review' };
      case 'searching':
        return { style: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Finding Matches' };
      case 'matched':
        return { style: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Active Care' };
      case 'completed':
        return { style: 'bg-gray-100 text-gray-600 border border-gray-200', label: 'Completed' };
      default:
        return { style: 'bg-gray-100 text-gray-600', label: status };
    }
  };

  // ==========================================
  // 1. SYSTEM INITIALIZATION & SECURITY
  // ==========================================
  useEffect(() => {
    let unsubReqs = () => {};
    let unsubUsers = () => {};
    let unsubProviders = () => {};

    const handleSilentError = (error) => {
      if (error.code === 'permission-denied') return; 
      console.error("Listener error:", error);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        unsubReqs();
        unsubUsers();
        unsubProviders();
        router.push('/login');
        return;
      }
      
      setUserAuth(currentUser);

      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        
        const safeRole = data.role?.toLowerCase() || '';
        document.cookie = `userRole=${safeRole}; path=/; max-age=604800; SameSite=Lax; Secure`;

        if (safeRole === 'admin') { router.push('/admin'); return; }
        if (safeRole !== 'patient' && safeRole !== 'family') { router.push('/dashboard/nurse'); return; }
        
        setUserData(data);
        setPageLoading(false); 

        const reqQuery = query(
          collection(db, "care_requests"), 
          where("patientId", "==", currentUser.uid)
        );
        
        unsubReqs = onSnapshot(reqQuery, (snapshot) => {
          const myOnlyReqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setMyRequests(sortCases(myOnlyReqs)); 
        }, handleSilentError); 

        const pLoc = data.location || {};
        const safeCountry = (pLoc.country || '').toLowerCase();
        const safeCity = (pLoc.city || '').toLowerCase();
        const safeZip = (pLoc.zipCode || '').trim();

        let realNurses = [];
        let fakeNurses = [];

        const updateProviderList = () => {
          const allProviders = [...realNurses, ...fakeNurses];
          
          const validProviders = allProviders.filter(provider => {
            const isNurse = provider.role?.toLowerCase() === 'nurse' || provider.role?.toLowerCase() === 'provider' || !provider.role;
            const matchesCountry = (provider.location?.country || '').toLowerCase() === safeCountry;
            return isNurse && matchesCountry;
          });
          
          setAvailableProviders(validProviders);
        };

        if (safeCity || safeZip) {
          const locationQuery = [
            or(
              where("location.zipCode", "==", safeZip || "NO_ZIP"),
              where("location.city", "==", safeCity || "NO_CITY")
            )
          ];

          unsubUsers = onSnapshot(query(collection(db, "users"), ...locationQuery), (snapshot) => {
            realNurses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateProviderList();
          }, handleSilentError);

          unsubProviders = onSnapshot(query(collection(db, "providers"), ...locationQuery), (snapshot) => {
            fakeNurses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            updateProviderList();
          }, handleSilentError);
        }

      } else {
        router.push('/profile?setup=true'); 
      }
    });

    return () => {
      unsubscribeAuth();
      unsubReqs();
      unsubUsers();
      unsubProviders();
    };
  }, [router]);
  
  // ==========================================
  // 2. LIVE DATABASE ACTIONS (Chat, Reviews, Delete)
  // ==========================================
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    
    try {
      const job = reviewModal.job;

      await updateDoc(doc(db, "care_requests", job.id), { 
        isReviewed: true,
        ratingGiven: reviewModal.rating,
        reviewText: reviewModal.reviewText
      });

      let nurseRef = doc(db, "users", job.nurseId);
      let nurseSnap = await getDoc(nurseRef);
      
      if (!nurseSnap.exists()) {
        nurseRef = doc(db, "providers", job.nurseId);
        nurseSnap = await getDoc(nurseRef);
      }
      
      if (nurseSnap.exists()) {
        const nurseData = nurseSnap.data();
        const currentTotal = (nurseData.rating || 0) * (nurseData.reviewCount || 0);
        const newCount = (nurseData.reviewCount || 0) + 1;
        const newRating = (currentTotal + reviewModal.rating) / newCount;

        await updateDoc(nurseRef, {
          rating: parseFloat(newRating.toFixed(1)),
          reviewCount: newCount
        });
      }

      setReviewModal({ isOpen: false, job: null, rating: 5, reviewText: '' });
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    if (!activeChatId) return;
    const q = query(collection(db, `care_requests/${activeChatId}/messages`));
    const unsubChat = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [activeChatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    try {
      await addDoc(collection(db, `care_requests/${activeChatId}/messages`), {
        text: newMessage,
        senderId: userAuth.uid,
        senderName: userData.name || userData.full_name || "Patient",
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const executeDeleteJob = async () => {
    if (!deleteModal.jobId) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, "care_requests", deleteModal.jobId));
      setDeleteModal({ isOpen: false, jobId: null });
    } catch (error) {
      console.error("Error deleting case:", error);
      alert("Failed to delete the case. Please check your connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // 3. UI CALCULATIONS & VARIABLES
  // ==========================================
  if (pageLoading || !userData) {
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
            Safe
          </h1>
          <p className="text-emerald-200/80 font-medium tracking-widest uppercase text-xs mb-10">
            Securely Loading Dashboard...
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

  const displayName = userData.name || userData.full_name || "Patient";
  const displayPhoto = userData.photoURL || userData.avatar_url || null;
  
  const displayLocation = userData.location?.city 
    ? `${userData.location.city}, ${userData.location.zipCode}` 
    : 'Location not set';

  const activeCount = myRequests.filter(r => r.status === 'searching').length;
  const matchedCount = myRequests.filter(r => r.status === 'matched').length;
  const completedCount = myRequests.filter(r => r.status === 'completed').length;

  const renderDashboard = () => {
    const isMissingLocation = !userData.location?.country || !userData.location?.city || !userData.location?.street;
    const isMissingEmergency = !userData.emergencyName || !userData.emergencyPhone;
    const isMissingPhone = !userData.phone;
    
    const needsProfileUpdate = isMissingLocation || isMissingEmergency || isMissingPhone;

    return (
      <div className="animate-in fade-in duration-300 max-w-5xl space-y-8">
        
        {needsProfileUpdate && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
            <div className="bg-amber-100 p-3 rounded-full shrink-0">
              <AlertTriangle className="w-8 h-8 text-amber-600"/>
            </div>
            <div className="flex-1">
                <h3 className="text-amber-900 font-black text-xl mb-1">Action Required: Complete Your Profile</h3>
                <p className="text-amber-800 text-sm font-medium mb-2">
                  To ensure patient safety and connect with local providers, we need a few more details:
                </p>
                <ul className="text-amber-700 text-sm font-bold list-disc list-inside ml-4 space-y-1">
                  {isMissingPhone && <li>Add your Mobile Number</li>}
                  {isMissingLocation && <li>Add your exact Street Address and City</li>}
                  {isMissingEmergency && <li>Add an Emergency Contact</li>}
                </ul>
            </div>
            <button 
              onClick={() => router.push('/profile?setup=true')} 
              className="w-full sm:w-auto mt-4 sm:mt-0 shrink-0 px-6 py-3 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 shadow-md transition transform hover:-translate-y-0.5"
            >
              Complete Profile Now
            </button>
          </div>
        )}

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
                        <p className="text-xs font-bold text-gray-400 flex items-center capitalize">
                          <MapPin className="w-3 h-3 mr-1" /> 
                          {req.location?.city ? `${req.location.city}, ${req.location.zipCode}` : 'Local Area'} • {req.careType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end sm:gap-8 border-t sm:border-0 border-gray-50 pt-4 sm:pt-0">
                      
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(req.status).style}`}>
                        {getStatusBadge(req.status).label}
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
  };
  
  const renderFindProviders = () => {
    const localFeaturedNurses = availableProviders.filter(nurse => nurse.isFeatured === true);
    const regularProviders = availableProviders.filter(nurse => !nurse.isFeatured);
    
    return (
      <div className="animate-in fade-in duration-300 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-4xl font-serif text-gray-900 leading-tight">
            Find <span className="text-emerald-600 italic">trusted</span><br/>care near you
          </h2>
          <p className="text-sm text-gray-500 font-bold flex items-center mt-3 bg-gray-50 w-fit px-3 py-1.5 rounded-lg border border-gray-100 capitalize">
            <MapPin className="w-4 h-4 mr-2 text-emerald-600"/> Showing providers in <span className="text-emerald-700 mx-1">{userData.location?.city || 'your local area'}</span>
          </p>
        </div>

        {/* FEATURED PROVIDERS SECTION */}
        {localFeaturedNurses.length > 0 && (
          <div className="mb-10">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-amber-500 fill-amber-500" /> Featured Local Providers
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {localFeaturedNurses.map(featuredNurse => (
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
                  <div className="flex items-center gap-1.5 mb-3">
                    <Star className={`w-4 h-4 ${featuredNurse.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                    <span className="font-bold text-gray-900 text-sm">{featuredNurse.rating ? featuredNurse.rating : 'New'}</span>
                    <span className="text-gray-400 text-xs font-medium">({featuredNurse.reviewCount || 0} reviews)</span>
                  </div>
                  <div className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                    <ShieldCheck className="w-4 h-4 mr-1" /> Verified Professional
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGULAR PROVIDERS SECTION */}
        <div className="space-y-6">
          
          {/* 🚨 THE HEADING IS NOW ALWAYS VISIBLE 🚨 */}
          <h3 className="font-bold text-gray-900 text-xl flex items-center pt-2 pb-2">
            All Available Providers
          </h3>

          {regularProviders.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-bold bg-white rounded-3xl border border-gray-100 shadow-sm capitalize">
               <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
               No other providers found in {userData.location?.city || 'your area'} yet.
            </div>
          ) : (
            regularProviders.map((nurse) => (
              <div key={nurse.id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center text-emerald-700 font-black text-xl border-4 border-white shadow-sm shrink-0">
                      {nurse.avatar_url || nurse.photoURL ? <img src={nurse.avatar_url || nurse.photoURL} alt="Nurse" className="w-full h-full object-cover"/> : (nurse.name || nurse.full_name || "N").charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 leading-tight mb-1 flex items-center">
                        {nurse.name || nurse.full_name}
                        {nurse.isVerified && <ShieldCheck className="w-5 h-5 text-emerald-500 ml-2" title="Verified"/>}
                      </h4>
                      <p className="text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">{nurse.specialty || nurse.role} · {nurse.experience || '3'} yrs exp.</p>
                      <div className="flex items-center gap-1.5 mb-3">
                        <Star className={`w-4 h-4 ${nurse.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                        <span className="font-bold text-gray-900 text-sm">{nurse.rating ? nurse.rating : 'New'}</span>
                        <span className="text-gray-400 text-xs font-medium">({nurse.reviewCount || 0} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-gray-900">Rs. {nurse.hourlyRate || 1500}<span className="text-sm text-gray-500 font-medium">/hr</span></p>
                    <p className="text-xs text-gray-400 font-bold flex items-center sm:justify-end mt-1 capitalize">
                      <MapPin className="w-3 h-3 mr-1"/> 
                      {nurse.location?.city ? `${nurse.location.city}, ${nurse.location.zipCode}` : 'Local Area'}
                    </p>
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
            ))
          )}
        </div>
      </div>
    );
  };

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
              <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md mb-3 ${getStatusBadge(job.status).style}`}>
                {getStatusBadge(job.status).label}
              </span>
              
              <h3 className="text-xl font-black text-gray-900">{job.roleNeeded}</h3>
              <p className="text-gray-500 text-sm mt-1 flex items-center capitalize">
                <MapPin className="w-4 h-4 mr-1"/> 
                {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'} • {job.careType}
              </p>
              
              {job.status === 'pending_verification' && (
                <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-yellow-800 max-w-sm">
                    This request is under review by our safety team. You cannot invite providers until it is approved.
                  </p>
                </div>
              )}

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
              {job.status === 'matched' && (
                <button onClick={() => setActiveTab('messages')} className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-gray-300 transition flex justify-center items-center">
                   <MessageSquare className="w-4 h-4 mr-2"/> Message
                </button>
              )}
              {job.status === 'completed' && !job.isReviewed && (
                <button 
                  onClick={() => setReviewModal({ isOpen: true, job: job, rating: 5, reviewText: '' })} 
                  className="w-full sm:w-auto px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-xl hover:bg-amber-100 transition shadow-sm flex items-center justify-center text-sm"
                >
                  <Star className="w-4 h-4 mr-2 fill-amber-500 text-amber-500" />
                  Rate & Review
                </button>
              )}
              {job.isReviewed && (
                 <p className="text-sm font-bold text-gray-400 flex items-center px-2 py-1"><CheckCircle className="w-4 h-4 mr-1.5"/> Reviewed</p>
              )}

              {job.status !== 'completed' && (
                <button 
                  onClick={() => setDeleteModal({ isOpen: true, jobId: job.id })}
                  className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl hover:bg-red-100 transition shadow-sm flex items-center justify-center text-sm mt-2"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMessages = () => {
    const activeChats = myRequests.filter(r => r.status === 'matched');

    return (
      <div className="animate-in fade-in duration-300 h-[75vh] flex bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden max-w-5xl">
        <div className="w-1/3 border-r border-gray-100 bg-gray-50/50 flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-white">
            <h3 className="font-black text-gray-900">Active Care Teams</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {activeChats.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-10 font-medium">No assigned providers yet.</p>
            ) : (
              activeChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left p-4 rounded-xl transition ${activeChatId === chat.id ? 'bg-emerald-100 border-emerald-200' : 'bg-white border-transparent hover:bg-emerald-50'} border shadow-sm`}
                >
                  <p className="font-bold text-gray-900 truncate">{chat.nurseName || 'Provider'}</p>
                  <p className="text-xs text-gray-500 truncate">{chat.roleNeeded}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white relative">
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300"/>
              <p className="font-bold">Select a provider to start messaging</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#fdfcf9]">
                <div>
                  <h3 className="font-black text-gray-900">Chat with Provider</h3>
                  <p className="text-xs font-bold text-emerald-600">Secure Connection</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar flex flex-col">
                {chatMessages.length === 0 ? (
                   <div className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hello!</div>
                ) : (
                  chatMessages.map(msg => {
                    const isMe = msg.senderId === userAuth.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] p-3.5 rounded-2xl ${isMe ? 'bg-[#0a271f] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                          <p className="text-sm font-medium">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 font-bold">{msg.senderName}</span>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0">
                <input type="text" required value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-sm" />
                <button type="submit" className="px-6 py-3 bg-[#0a271f] text-white font-bold rounded-xl hover:bg-black transition shadow-md">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden">
      
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
          <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded-lg capitalize">
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

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center shrink-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Patient Portal</p>
             <h2 className="text-2xl font-black text-gray-900 font-serif">Hello, {displayName.split(' ')[0]} 👋</h2>
           </div>          
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'find' && renderFindProviders()}
          {activeTab === 'my-cases' && renderMyCases()}
          {activeTab === 'messages' && renderMessages()}
        </main>
      </div>
      
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-center text-gray-900 font-serif mb-2">Rate Your Experience</h3>
            <p className="text-gray-500 text-sm text-center mb-6">How was your care with {reviewModal.job.nurseName}?</p>
            
            <form onSubmit={handleReviewSubmit} className="space-y-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                    className="focus:outline-none hover:scale-110 transition-transform"
                  >
                    <Star className={`w-10 h-10 ${reviewModal.rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'}`} />
                  </button>
                ))}
              </div>

              <textarea 
                required 
                value={reviewModal.reviewText} 
                onChange={(e) => setReviewModal({...reviewModal, reviewText: e.target.value})} 
                className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium resize-none min-h-[120px] focus:ring-2 focus:ring-amber-400 text-sm bg-gray-50" 
                placeholder="Write a brief review to help other families..."
              ></textarea>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModal({ isOpen: false, job: null, rating: 5, reviewText: '' })} className="flex-1 bg-white border-2 border-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={submittingReview} className="flex-1 bg-[#0a271f] text-white font-bold py-4 rounded-xl hover:bg-black transition flex items-center justify-center shadow-lg">
                  {submittingReview ? <Loader2 className="w-5 h-5 animate-spin"/> : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 text-center">
            
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
              <Trash2 className="w-10 h-10 text-red-600" />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Cancel Care Request?</h3>
            <p className="text-gray-500 font-medium mb-8 text-sm">
              Are you sure you want to permanently delete this care request? This action cannot be undone, and any interested providers will no longer see it.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteModal({ isOpen: false, jobId: null })} 
                className="flex-1 bg-white border-2 border-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50 transition"
                disabled={isDeleting}
              >
                Go Back
              </button>
              <button 
                onClick={executeDeleteJob} 
                disabled={isDeleting} 
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition flex items-center justify-center shadow-lg"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Yes, Delete It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}