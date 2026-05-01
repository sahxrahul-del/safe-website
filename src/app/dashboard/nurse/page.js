"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, onSnapshot, updateDoc, addDoc, serverTimestamp, where, or 
} from 'firebase/firestore';
import { 
  LayoutDashboard, UserCircle, Briefcase, Bell, 
  MapPin, Loader2, CheckCircle, Clock, FileText, ChevronRight, 
  Activity, Inbox, AlertCircle,
  MessageSquare, Calendar, ToggleLeft, ToggleRight, XCircle, ShieldCheck, Star,
  ExternalLink, HeartPulse
} from 'lucide-react';

export default function NurseSaaSDashboard() {
  const router = useRouter();
  
  // Real State
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(true);
  
  // Chat State
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, jobId: null });
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Check memory when the page loads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = localStorage.getItem('verifiedBannerDismissed');
      if (isDismissed === 'true') {
        setShowVerifiedBanner(false);
      }
    }
  }, []);

  const handleDismissBanner = () => {
    setShowVerifiedBanner(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('verifiedBannerDismissed', 'true');
    }
  };
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Job Feeds
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [directInvites, setDirectInvites] = useState([]); 
  
  // UI & Action States
  const [pageLoading, setPageLoading] = useState(true);
  const [decliningId, setDecliningId] = useState(null);

  // Availability State
  const [schedule, setSchedule] = useState({
    Monday: true, 
    Tuesday: true, 
    Wednesday: true, 
    Thursday: true, 
    Friday: true, 
    Saturday: false, 
    Sunday: false
  });

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
        
        const safeRole = data.role?.toLowerCase() || '';

        document.cookie = `userRole=${safeRole}; path=/; max-age=604800; SameSite=Lax; Secure`;
        
        if (safeRole === 'admin') {
          router.push('/admin');
          return;
        }

        if (safeRole !== 'nurse' && safeRole !== 'provider') {
          router.push('/dashboard/patient');
          return;
        }
        
        setUserData(data);

        if (data.availabilitySchedule) {
          setSchedule(data.availabilitySchedule);
        }

        setPageLoading(false);

        // 🚨 INTELLIGENT LOCATION MATCHING (Zip Code OR City) 🚨
        const pLoc = data.location || {};
        const safeCountry = (pLoc.country || '').toLowerCase();
        const safeCity = (pLoc.city || '').toLowerCase();
        const safeZip = (pLoc.zipCode || '').trim();

        let unsubAvailable = () => {};
        
        // QUERY 1: ONLY FETCH JOBS IN THEIR CITY OR ZIP CODE
        if (safeCity || safeZip) {
          const locQuery = query(
            collection(db, "care_requests"),
            or(
              where("location.zipCode", "==", safeZip || "NO_ZIP"),
              where("location.city", "==", safeCity || "NO_CITY")
            )
          );
          
          unsubAvailable = onSnapshot(locQuery, (snapshot) => {
            const locJobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Client-side filter for 'searching' status and exact country match
            const validAvailable = locJobs.filter(req => 
              req.status === 'searching' && 
              (req.location?.country || '').toLowerCase() === safeCountry
            );
            
            setAvailableJobs(validAvailable);
          });
        }

        // QUERY 2: FETCH ONLY JOBS THEY ACCEPTED
        const myJobsQuery = query(
          collection(db, "care_requests"),
          where("nurseId", "==", currentUser.uid)
        );
        const unsubMyJobs = onSnapshot(myJobsQuery, (snapshot) => {
          setMyJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // QUERY 3: FETCH ONLY DIRECT INVITES TO THEM
        const invitesQuery = query(
          collection(db, "care_requests"),
          where("targetNurseId", "==", currentUser.uid)
        );
        const unsubInvites = onSnapshot(invitesQuery, (snapshot) => {
          const invites = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setDirectInvites(invites.filter(req => req.status === 'direct_request'));
        });

        return () => { 
          unsubAvailable(); 
          unsubMyJobs(); 
          unsubInvites(); 
        };

      } else {
        router.push('/profile?setup=true'); 
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // REAL-TIME CHAT LISTENER
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

  // SEND MESSAGE FUNCTION
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    try {
      await addDoc(collection(db, `care_requests/${activeChatId}/messages`), {
        text: newMessage,
        senderId: userAuth.uid,
        senderName: userData.name || userData.full_name || "Care Provider",
        createdAt: serverTimestamp()
      });
      setNewMessage(""); 
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // ==========================================
  // 2. LIVE DATABASE ACTIONS
  // ==========================================
  
  const handleCompleteJobClick = (jobId) => {
    setConfirmModal({ isOpen: true, jobId });
  };

  const executeCompleteJob = async () => {
    if (!confirmModal.jobId) return;
    setIsCompleting(true);
    
    try {
      await updateDoc(doc(db, "care_requests", confirmModal.jobId), {
        status: 'completed'
      });
      setConfirmModal({ isOpen: false, jobId: null });
    } catch (error) {
      console.error("Error completing shift:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Decline Direct Invite
  const handleDeclineInvite = async (jobId) => {
    setDecliningId(jobId);
    try {
      const jobRef = doc(db, "care_requests", jobId);
      await updateDoc(jobRef, {
        status: 'searching',
        targetNurseId: null 
      });
    } catch (error) {
      console.error("Error declining job:", error);
    } finally {
      setDecliningId(null);
    }
  };

  const toggleDay = async (day) => {
    const newSchedule = { ...schedule, [day]: !schedule[day] };
    setSchedule(newSchedule);
    try {
      await updateDoc(doc(db, 'users', userAuth.uid), { availabilitySchedule: newSchedule });
    } catch (error) {
      console.error("Failed to save schedule:", error);
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
            Safe Home<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-emerald-200/80 font-medium tracking-widest uppercase text-xs mb-10">
            Securely Loading Dashboard...
          </p>
          <div className="w-48 h-1 bg-emerald-950 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-1/2 animate-[shimmer_1.5s_infinite_ease-in-out] origin-left"></div>
          </div>
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  const displayName = userData.name || userData.full_name || "Provider";
  const displayPhoto = userData.photoURL || userData.avatar_url || null;
  const displayRole = userData.specialty || userData.role || "Care Provider";
  
  // Safe location display for sidebar
  const displayLocation = userData.location?.city 
    ? `${userData.location.city}, ${userData.location.zipCode}` 
    : 'Location not set';

  let profileScore = 0;
  if (displayName) profileScore += 25;
  if (displayRole && (userData.experience || userData.bio)) profileScore += 25;
  if (userData.hourlyRate) profileScore += 10;
  if (displayPhoto && !displayPhoto.includes('default')) profileScore += 20;
  if (userData.cv_url) profileScore += 5;
  if (userData.license_url) profileScore += 5;
  if (userData.cert_slc_url || userData.cert_plus2_url || userData.cert_bachelor_url) profileScore += 10;

  
  // ==========================================
  // RENDER: DIRECT INVITES INBOX
  // ==========================================
  const renderInvites = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 font-serif">Direct Invites</h2>
        <p className="text-sm text-gray-500 font-medium">Patients who viewed your profile and exclusively requested you.</p>
      </div>
      
      {directInvites.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Inbox className="w-8 h-8"/></div>
          <h3 className="text-lg font-black text-gray-900">Inbox Zero</h3>
          <p className="text-gray-500 mt-1">You have no pending direct requests right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {directInvites.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border-2 border-emerald-400 shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                Exclusive Request
              </div>
              
              <div>
                <h3 className="text-xl font-black text-gray-900 mt-2">{job.roleNeeded}</h3>
                <p className="text-gray-500 text-sm mt-1 flex items-center capitalize">
                  <MapPin className="w-4 h-4 mr-1"/> 
                  {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'} • {job.careType}
                </p>
                
                <div className="mt-4 flex items-center bg-gray-50 p-3 rounded-lg w-fit">
                  <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center mr-3">
                    {job.patientPhoto ? <img src={job.patientPhoto} className="w-full h-full object-cover"/> : <span className="text-blue-800 font-bold text-xs">{(job.patientName || "P").charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Requested By</p>
                    <p className="text-sm font-black text-gray-900">{job.patientName}</p>
                  </div>
                </div>
      
                <p className="text-gray-600 text-sm mt-3 border-l-2 border-emerald-200 pl-3 italic truncate max-w-md">"{job.details}"</p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row gap-3 mt-6 sm:mt-0">
               <button 
                  onClick={() => router.push(`/cases/${job.id}`)} 
                  className="px-6 py-3 bg-[#0a271f] text-white rounded-xl font-black text-sm hover:bg-black transition flex justify-center items-center shadow-md w-full sm:w-auto"
                >
                  Review Case Details ➔
                </button> 
                
                <button 
                  onClick={() => handleDeclineInvite(job.id)}
                  disabled={decliningId === job.id}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex justify-center items-center w-full sm:w-auto"
                >
                  {decliningId === job.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Decline Quickly"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ==========================================
  // RENDER: DASHBOARD TAB (Overview)
  // ==========================================
  const renderDashboard = () => {
    
    const availableJobsCount = typeof availableJobs !== 'undefined' ? availableJobs.length : 0;
    const activeJobsCount = typeof myJobs !== 'undefined' ? myJobs.filter(job => job.status === 'matched').length : 0;
    const completedJobsCount = typeof myJobs !== 'undefined' ? myJobs.filter(job => job.status === 'completed').length : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {userData.accountStatus === 'rejected' && (
          <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
            <div className="bg-red-100 p-3 rounded-full shrink-0"><AlertCircle className="w-8 h-8 text-red-600"/></div>
            <div className="flex-1">
                <h3 className="text-red-900 font-black text-xl mb-1">Verification Rejected</h3>
                <p className="text-red-800 text-sm mb-2 bg-red-100/50 p-3 rounded-lg border border-red-200 font-medium">
                  Admin Message: "{userData.rejectionReason || 'Please review your uploaded documents.'}"
                </p>
                <p className="text-red-700 text-sm font-bold">Please update your profile documents and click "Save Changes" to automatically re-apply for verification.</p>
            </div>
            <button onClick={() => router.push('/profile')} className="w-full sm:w-auto mt-4 sm:mt-0 shrink-0 px-6 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-md transition">
              Fix My Profile
            </button>
          </div>
        )}

        {(userData.accountStatus === 'approved' && userData.isVerified && showVerifiedBanner) && (
          <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm relative pr-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="bg-emerald-100 p-3 rounded-full shrink-0"><ShieldCheck className="w-8 h-8 text-emerald-600"/></div>
              <div className="flex-1">
                  <h3 className="text-emerald-900 font-black text-xl mb-1">Account Verified! 🎉</h3>
                  <p className="text-emerald-800 text-sm font-medium">
                    Admin Message: "Your profile and credentials have been officially verified. Your profile is now actively visible to patients searching in your area!"
                  </p>
              </div>
            </div>
            <button onClick={handleDismissBanner} className="absolute top-4 right-4 p-2 text-emerald-600 bg-emerald-100 hover:bg-emerald-200 rounded-full transition" title="Dismiss Banner">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {(!userData.isVerified && userData.accountStatus !== 'rejected') && (
          <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-sm">
            <div className="bg-blue-100 p-3 rounded-full shrink-0"><Clock className="w-8 h-8 text-blue-600"/></div>
            <div className="flex-1">
                <h3 className="text-blue-900 font-black text-xl mb-1">Verification Pending</h3>
                <p className="text-blue-800 text-sm font-medium">
                  Your profile and documents are currently being reviewed by our Admin team. We will notify you here as soon as you are verified.
                </p>
            </div>
          </div>
        )}
        
        {directInvites.length > 0 && (
          <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer hover:bg-emerald-700 transition" onClick={() => setActiveTab('invites')}>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-4"><Inbox className="w-6 h-6"/></div>
              <div>
                <h3 className="font-black text-lg">You have {directInvites.length} direct request{directInvites.length > 1 ? 's' : ''}!</h3>
                <p className="text-emerald-100 text-sm">Patients have viewed your profile and sent you exclusive job offers.</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6"/>
          </div>
        )}

        {profileScore < 100 && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="bg-amber-100 p-2 rounded-full shrink-0"><Clock className="w-6 h-6 text-amber-600"/></div>
              <div className="flex-1">
                  <h3 className="text-amber-900 font-bold text-lg">Your profile is {profileScore}% complete</h3>
                  <p className="text-amber-700 text-sm mt-1">Our team verifies credentials to ensure patient safety. Please complete your profile to get approved faster.</p>
              </div>
              <button onClick={() => router.push('/profile')} className="hidden sm:block shrink-0 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700">Complete Now</button>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-gray-500">Jobs Near You</p>
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{availableJobsCount}</h3>
            <p className="text-xs font-bold text-emerald-600">Live active requests</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:border-emerald-300 transition" onClick={() => setActiveTab('my-cases')}>
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-gray-500">Active Cases</p>
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{activeJobsCount}</h3>
            <p className="text-xs font-bold text-blue-600">Currently working ➔</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-gray-500">Completed</p>
              <CheckCircle className="w-5 h-5 text-gray-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{completedJobsCount}</h3>
            <p className="text-xs font-bold text-emerald-600">Total finished jobs</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-bold text-gray-500">Patient Rating</p>
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{userData.rating || 'New'}</h3>
            <p className="text-xs font-bold text-amber-600">{userData.reviewCount || 0} Total Reviews</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* LOCATION FILTERED PUBLIC JOB BOARD */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
                  <h3 className="font-bold text-gray-900 flex items-center capitalize">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> 
                    Available Jobs in {userData.location?.city || 'Your Area'}
                  </h3>
                </div>
                <div className="p-6">
                  {availableJobs.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm font-medium capitalize">
                      No general requests in {userData.location?.city || 'your area'} right now.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availableJobs.map((job) => (
                        <div key={job.id} className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-md">{job.urgency}</span>
                              <span className="text-xs font-bold text-gray-500">{job.careType}</span>
                            </div>
                            <h4 className="font-black text-gray-900 leading-tight mb-1">{job.roleNeeded}</h4>
                            <p className="text-xs text-gray-500 font-medium truncate capitalize">
                              {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'} • {job.details}
                            </p>
                          </div>
                          <button 
                            onClick={() => router.push(`/cases/${job.id}`)} 
                            className="px-6 py-3 bg-[#0a271f] hover:bg-black text-white text-sm font-black rounded-xl transition flex items-center justify-center shadow-md whitespace-nowrap"
                          >
                            Review Details ➔
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gray-100"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${profileScore}%` }}></div></div>
                  <h3 className="font-bold text-gray-900 mt-2">Profile Strength</h3>
                  <p className="text-3xl font-black text-emerald-600 my-2">{profileScore}%</p>
                  <div className="space-y-3 mt-4 text-sm font-medium">
                    {displayName ? <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Basic Info Added</p> : <p className="flex items-center text-amber-600"><AlertCircle className="w-4 h-4 mr-2"/> Missing Basic Info</p>}
                    {userData.hourlyRate ? <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Rate Configured</p> : <p className="flex items-center text-amber-600"><AlertCircle className="w-4 h-4 mr-2"/> Set Hourly Rate</p>}
                    {displayPhoto && !displayPhoto.includes('default') ? <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> Photo Uploaded</p> : <p className="flex items-center text-amber-600"><AlertCircle className="w-4 h-4 mr-2"/> Add Profile Photo</p>}
                    
                    {userData.cv_url ? (
                      <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> CV Uploaded</p>
                    ) : (
                      <button onClick={() => router.push('/profile')} className="flex items-center text-amber-600 hover:text-amber-700 w-full text-left group transition"><AlertCircle className="w-4 h-4 mr-2"/> Upload CV <span className="ml-auto opacity-0 group-hover:opacity-100 transition text-xs font-bold bg-amber-100 px-2 py-0.5 rounded">Add +</span></button>
                    )}
                    {userData.license_url ? (
                      <p className="flex items-center text-gray-500"><CheckCircle className="w-4 h-4 mr-2 text-emerald-500"/> License Uploaded</p>
                    ) : (
                      <button onClick={() => router.push('/profile')} className="flex items-center text-amber-600 hover:text-amber-700 w-full text-left group transition"><AlertCircle className="w-4 h-4 mr-2"/> Upload License <span className="ml-auto opacity-0 group-hover:opacity-100 transition text-xs font-bold bg-amber-100 px-2 py-0.5 rounded">Add +</span></button>
                    )}
                  </div>
              </div>
            </div>
        </div>
      </div>
    );
  };

  const renderReviews = () => {
    const myReviews = myJobs.filter(job => job.isReviewed);

    return (
      <div className="animate-in fade-in duration-300 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 font-serif">Patient Reviews</h2>
          <p className="text-sm text-gray-500 font-medium">See what families are saying about your care.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 mb-8 w-fit pr-12">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shrink-0">
            <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Overall Rating</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-gray-900 leading-none">{userData.rating || '0.0'}</span>
              <span className="text-gray-500 font-bold text-sm mb-1">({userData.reviewCount || 0} Reviews)</span>
            </div>
          </div>
        </div>

        {myReviews.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-gray-100">
            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">You haven't received any reviews yet.</p>
            <p className="text-gray-400 text-sm mt-1">Complete more shifts to build your reputation!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {myReviews.map(rev => (
              <div key={rev.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className={`w-5 h-5 ${idx < rev.ratingGiven ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">Verified Shift</span>
                </div>
                
                <p className="text-gray-700 text-lg font-medium leading-relaxed mb-6">"{rev.reviewText}"</p>
                
                <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-black border-2 border-white shadow-sm overflow-hidden shrink-0">
                    {rev.patientPhoto ? <img src={rev.patientPhoto} className="w-full h-full object-cover"/> : (rev.patientName || "P").charAt(0)}
                  </div>
                  <div>
                    <span className="font-black text-gray-900 block">{rev.patientName}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1"/> Patient
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: MY DOCUMENTS TAB
  // ==========================================
  const renderDocuments = () => {
    const myDocs = [
      { name: "Curriculum Vitae (CV)", url: userData.cv_url },
      { name: "Professional License", url: userData.license_url },
      { name: "SLC Certificate", url: userData.cert_slc_url },
      { name: "+2 Certificate", url: userData.cert_plus2_url },
      { name: "Bachelor's Degree", url: userData.cert_bachelor_url }
    ].filter(doc => doc.url); 

    return (
      <div className="animate-in fade-in duration-300 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 font-serif">My Documents</h2>
          <p className="text-sm text-gray-500 font-medium">View and verify the credentials and files you uploaded.</p>
        </div>

        {myDocs.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900">No Documents Found</h3>
            <p className="text-gray-500 mt-2 text-sm font-medium">You haven't uploaded any documents yet. Please update your profile to add them.</p>
            <button onClick={() => router.push('/profile')} className="mt-6 px-6 py-2.5 bg-[#0a271f] text-white font-bold rounded-xl text-sm shadow-md hover:bg-black transition">
              Go to Profile Setup
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myDocs.map((doc, idx) => (
              <a 
                key={idx} 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-400 hover:shadow-md transition group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-100 transition group-hover:scale-105 duration-300">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 transition" />
                </div>
                <div className="mt-auto border-t border-gray-50 pt-4">
                  <h3 className="font-black text-gray-900 text-lg mb-1">{doc.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Click to view secure file</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: MY CASES TAB
  // ==========================================
  const renderMyCases = () => {
    const activeCases = myJobs.filter(job => job.status === 'matched');
    const pastCases = myJobs.filter(job => job.status === 'completed');

    return (
      <div className="animate-in fade-in duration-300 max-w-5xl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 font-serif">My Cases</h2>
            <p className="text-sm text-gray-500 font-medium">Manage your active shifts and review your history.</p>
          </div>
        </div>

        {/* SECTION 1: ACTIVE CASES COMMAND CENTER */}
        <div className="mb-12">
          <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-2">
            <Activity className="w-5 h-5 mr-2 text-emerald-600"/> Current Active Cases
          </h3>
          
          {activeCases.length === 0 ? (
            <div className="p-8 bg-gray-50 border border-gray-200 border-dashed rounded-2xl text-center text-gray-500 font-medium">
              You currently have no active cases. Check the available jobs or your invites!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCases.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-2xl border-2 border-emerald-400 shadow-md relative overflow-hidden group hover:shadow-xl transition">
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                    In Progress
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4 mt-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl shrink-0">
                      {job.patientPhoto ? <img src={job.patientPhoto} className="w-full h-full rounded-full object-cover"/> : (job.patientName || "P").charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Patient</p>
                      <h4 className="font-black text-gray-900 text-lg leading-none">{job.patientName}</h4>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 font-medium mb-1"><span className="font-bold">Role:</span> {job.roleNeeded}</p>
                  <p className="text-sm text-gray-600 font-medium mb-6 capitalize"><span className="font-bold">Location:</span> {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'}</p>

                  <button 
                    onClick={() => router.push(`/cases/${job.id}`)}
                    className="w-full bg-[#0a271f] hover:bg-black text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-md transition"
                  >
                    Enter Case Room <ExternalLink className="w-5 h-5"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: PAST / COMPLETED CASES */}
        <div>
          <h3 className="font-black text-lg text-gray-900 mb-4 flex items-center border-b border-gray-200 pb-2">
            <CheckCircle className="w-5 h-5 mr-2 text-gray-400"/> Past Shifts History
          </h3>
          
          {pastCases.length === 0 ? (
            <div className="p-8 bg-white border border-gray-100 rounded-2xl text-center text-gray-400 font-medium shadow-sm">
              No completed shifts in your history yet.
            </div>
          ) : (
            <div className="space-y-4">
              {pastCases.map(job => (
                <div key={job.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 opacity-75 hover:opacity-100 transition">
                  <div>
                    <span className="inline-block px-2.5 py-1 text-[10px] bg-gray-100 text-gray-600 font-black uppercase tracking-widest rounded-md mb-2">
                      Shift Completed
                    </span>
                    <h3 className="text-lg font-black text-gray-900">{job.patientName}</h3>
                    <p className="text-gray-500 text-xs font-medium capitalize">{job.roleNeeded} • {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'}</p>
                  </div>
                  
                  {job.isReviewed ? (
                     <span className="px-4 py-2 bg-amber-50 text-amber-600 font-bold text-xs rounded-lg border border-amber-100 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500"/> Patient Reviewed
                     </span>
                  ) : (
                     <span className="px-4 py-2 bg-gray-50 text-gray-500 font-bold text-xs rounded-lg border border-gray-200">
                        Awaiting Review
                     </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

const renderAvailability = () => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="animate-in fade-in duration-300 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 font-serif">My Availability</h2>
          <p className="text-sm text-gray-500 font-medium">Set the days you are available to take new care requests.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
            <h3 className="font-bold text-gray-900 flex items-center"><Calendar className="w-5 h-5 mr-2 text-emerald-600"/> Weekly Schedule</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Auto-saves</span>
          </div>

          <div className="space-y-3">
            {dayOrder.map((day) => {
              const isAvailable = schedule[day] || false; 

              return (
                <div key={day} onClick={() => toggleDay(day)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition border ${isAvailable ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isAvailable ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                      {day.charAt(0)}
                    </div>
                    <span className={`font-bold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>{day}</span> 
                  </div>
                  <div className="text-gray-400">
                    {isAvailable ? <ToggleRight className="w-8 h-8 text-emerald-600"/> : <ToggleLeft className="w-8 h-8"/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const activeChats = myJobs.filter(j => j.status === 'matched');

    return (
      <div className="animate-in fade-in duration-300 h-[75vh] flex bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden max-w-5xl">
        
        <div className="w-1/3 border-r border-gray-100 bg-gray-50/50 flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-white">
            <h3 className="font-black text-gray-900">Active Chats</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {activeChats.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-10 font-medium">No active cases to chat about.</p>
            ) : (
              activeChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left p-4 rounded-xl transition ${activeChatId === chat.id ? 'bg-emerald-100 border-emerald-200' : 'bg-white border-transparent hover:bg-emerald-50'} border shadow-sm`}
                >
                  <p className="font-bold text-gray-900 truncate">{chat.patientName || 'Patient'}</p>
                  <p className="text-xs text-gray-500 truncate capitalize">{chat.roleNeeded} • {chat.location?.city ? `${chat.location.city}` : 'Local'}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white relative">
          {!activeChatId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300"/>
              <p className="font-bold">Select a case to start messaging</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#fdfcf9]">
                <div>
                  <h3 className="font-black text-gray-900">Chat with Patient</h3>
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
                        <div className={`max-w-[75%] p-3.5 rounded-2xl ${isMe ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'}`}>
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

  // ==========================================
  // MASTER RENDER
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f4f7f6] font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
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
              <h3 className="text-sm font-black text-gray-900 leading-tight truncate w-32 flex items-center gap-1">
                {displayName}
                {userData.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Verified Provider" />}
              </h3>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate w-32">{displayRole}</p>
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded-lg capitalize">
            <MapPin className="w-3 h-3 mr-1 text-gray-400" /> {displayLocation}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Overview</p>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button onClick={() => setActiveTab('invites')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'invites' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><Inbox className="w-5 h-5 mr-3" /> Direct Invites</span>
              {directInvites.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{directInvites.length}</span>}
            </button>
            <button onClick={() => setActiveTab('my-cases')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'my-cases' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Briefcase className="w-5 h-5 mr-3" /> My Cases
            </button>
            <button onClick={() => setActiveTab('availability')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'availability' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Calendar className="w-5 h-5 mr-3" /> Availability
            </button>
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6 px-4">Activity</p>
            <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'messages' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <MessageSquare className="w-5 h-5 mr-3" /> Messages
            </button>
            
            <button onClick={() => setActiveTab('reviews')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'reviews' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <Star className="w-5 h-5 mr-3" /> My Reviews
            </button>

            <button onClick={() => setActiveTab('documents')} className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'documents' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <FileText className="w-5 h-5 mr-3" /> My Documents
            </button>
            
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-6 px-4">Account</p>
            <button onClick={() => router.push('/profile')} className="w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition">
              <UserCircle className="w-5 h-5 mr-3" /> Full Profile
            </button>
          </nav>
        </div>
      </aside>

      {/* DYNAMIC TAB RENDERING */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center shrink-0 z-10">
           <div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Provider Portal</p>
             <h2 className="text-2xl font-black text-gray-900 font-serif">Good morning, {displayName.split(' ')[0]} 👋</h2>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'invites' && renderInvites()}
          {activeTab === 'my-cases' && renderMyCases()}
          {activeTab === 'messages' && renderMessages()}
          {activeTab === 'availability' && renderAvailability()}
          {activeTab === 'reviews' && renderReviews()} 
          {activeTab === 'documents' && renderDocuments()}
        </main>
      </div>

      {/* --- CUSTOM CONFIRM COMPLETION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 text-center">
            
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-sm">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Complete Shift?</h3>
            <p className="text-gray-500 font-medium mb-8 text-sm">
              Are you sure you want to mark this shift as complete? The patient will be notified and asked to leave a review for your profile.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ isOpen: false, jobId: null })} 
                className="flex-1 bg-white border-2 border-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50 transition"
                disabled={isCompleting}
              >
                Cancel
              </button>
              <button 
                onClick={executeCompleteJob} 
                disabled={isCompleting} 
                className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center shadow-lg"
              >
                {isCompleting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Yes, Complete It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}