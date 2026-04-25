"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, onSnapshot, updateDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, UserCircle, Briefcase, Settings, Bell, 
  MapPin, Loader2, CheckCircle, Clock, FileText, ChevronRight, 
  Activity, HeartPulse, Edit3, Eye, Inbox, Smartphone, Bookmark, AlertCircle,
  MessageSquare, Calendar, ToggleLeft, ToggleRight, XCircle
} from 'lucide-react';

export default function NurseSaaSDashboard() {
  const router = useRouter();
  
  // Real State
  const [userAuth, setUserAuth] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Job Feeds
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [directInvites, setDirectInvites] = useState([]); // <-- NEW: The Direct Inbox
  
  // UI & Action States
  const [pageLoading, setPageLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  // Quick Edit State
  const [quickEdit, setQuickEdit] = useState({ specialty: '', hourlyRate: '', bio: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState(null);

  // Availability State
  const [schedule, setSchedule] = useState({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false
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
        if (safeRole !== 'nurse' && safeRole !== 'provider') {
          router.push('/dashboard/patient');
          return;
        }
        
        setUserData(data);
        
        setQuickEdit({
          specialty: data.specialty || data.role || 'Registered Nurse (RN)',
          hourlyRate: data.hourlyRate || '',
          bio: data.bio || ''
        });

        if (data.availabilitySchedule) {
          setSchedule(data.availabilitySchedule);
        }

        // START LIVE LISTENER
        const q = query(collection(db, "care_requests"));
        const unsubscribeJobs = onSnapshot(q, (snapshot) => {
          const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // 1. GLOBAL JOBS: Searching & Matches my location
          const available = allRequests.filter(req => 
            req.status === 'searching' && 
            (req.location === data.location || req.location === data.district) 
          );
          
          // 2. MY JOBS: I have already accepted these
          const accepted = allRequests.filter(req => 
            (req.status === 'matched' || req.status === 'completed') && 
            req.nurseId === currentUser.uid
          );

          // 3. DIRECT INVITES: Patients specifically chose me!
          const invites = allRequests.filter(req => 
            req.status === 'direct_request' && 
            req.targetNurseId === currentUser.uid
          );

          setAvailableJobs(available);
          setMyJobs(accepted);
          setDirectInvites(invites); // Save to state
          
          setPageLoading(false);
        });

        return () => unsubscribeJobs();

      } else {
        router.push('/setup-profile');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  // ==========================================
  // 2. LIVE DATABASE ACTIONS
  // ==========================================
  const handleAcceptJob = async (jobId) => {
    setAcceptingId(jobId);
    try {
      const jobRef = doc(db, "care_requests", jobId);
      await updateDoc(jobRef, {
        status: 'matched',
        nurseId: userAuth.uid,
        nurseName: userData.name || userData.full_name || "Care Provider",
        nursePhoto: userData.photoURL || userData.avatar_url || ''
      });
      setActiveTab('my-cases'); 
    } catch (error) {
      console.error("Error accepting job:", error);
      alert("Failed to accept job.");
    } finally {
      setAcceptingId(null);
    }
  };

  // NEW: Decline a direct invite
  const handleDeclineInvite = async (jobId) => {
    setDecliningId(jobId);
    try {
      const jobRef = doc(db, "care_requests", jobId);
      // Pushes it to the global job board so the patient can still get help!
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

  const handleQuickEditSave = async (e) => {
    e.preventDefault();
    setSavingEdit(true); setEditMessage(null);
    try {
      await updateDoc(doc(db, 'users', userAuth.uid), quickEdit);
      setUserData(prev => ({ ...prev, ...quickEdit }));
      setEditMessage("Saved securely!");
      setTimeout(() => setEditMessage(null), 3000);
    } catch (error) {
      setEditMessage("Error saving.");
    } finally {
      setSavingEdit(false);
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
  // 3. UI CALCULATIONS
  // ==========================================
  if (pageLoading || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500 font-bold">Securely loading Provider Dashboard...</p>
      </div>
    );
  }

  const displayName = userData.name || userData.full_name || "Provider";
  const displayPhoto = userData.photoURL || userData.avatar_url || null;
  const displayRole = userData.specialty || userData.role || "Care Provider";

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
                <p className="text-gray-500 text-sm mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1"/> {job.location} • {job.careType}</p>
                
                {/* Patient Details */}
                <div className="mt-4 flex items-center bg-gray-50 p-3 rounded-lg w-fit">
                  <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center mr-3">
                    {job.patientPhoto ? <img src={job.patientPhoto} className="w-full h-full object-cover"/> : <span className="text-blue-800 font-bold text-xs">{(job.patientName || "P").charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Requested By</p>
                    <p className="text-sm font-black text-gray-900">{job.patientName}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mt-3 border-l-2 border-emerald-200 pl-3 italic">"{job.details}"</p>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <button 
                  onClick={() => handleAcceptJob(job.id)}
                  disabled={acceptingId === job.id} 
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition flex justify-center items-center shadow-sm"
                >
                  {acceptingId === job.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Accept & Connect"}
                </button>
                <button 
                  onClick={() => handleDeclineInvite(job.id)}
                  disabled={decliningId === job.id}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex justify-center items-center"
                >
                  {decliningId === job.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Decline Request"}
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
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* DIRECT INVITE ALERT BANNER */}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Jobs Near You</span> <MapPin className="w-5 h-5"/></div>
            <div><p className="text-3xl font-black text-gray-900">{availableJobs.length}</p><p className="text-xs text-emerald-600 font-bold mt-1">Live active requests</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Active Cases</span> <Activity className="w-5 h-5"/></div>
            <div><p className="text-3xl font-black text-gray-900">{myJobs.filter(j => j.status === 'matched').length}</p><p className="text-xs text-gray-500 font-bold mt-1">Currently working</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Completed</span> <CheckCircle className="w-5 h-5"/></div>
            <div><p className="text-3xl font-black text-gray-900">{myJobs.filter(j => j.status === 'completed').length}</p><p className="text-xs text-emerald-600 font-bold mt-1">Total finished jobs</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start text-gray-400 mb-4"><span className="text-sm font-bold">Profile Saves</span> <Bookmark className="w-5 h-5"/></div>
            <div><p className="text-3xl font-black text-gray-900">0</p><p className="text-xs text-gray-500 font-bold mt-1">Patients saved you</p></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <div><h3 className="font-bold text-gray-900">Quick Profile Edit</h3><p className="text-xs text-gray-500">Update your key details</p></div>
                  <Edit3 className="w-5 h-5 text-gray-400" />
                </div>
                <form onSubmit={handleQuickEditSave} className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Care Role</label>
                        <select value={quickEdit.specialty} onChange={(e) => setQuickEdit({...quickEdit, specialty: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-sm font-medium">
                            <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                            <option value="Licensed Practical Nurse (LPN)">Licensed Practical Nurse (LPN)</option>
                            <option value="Certified Nursing Assistant (CNA)">Certified Nursing Assistant (CNA)</option>
                            <option value="Caregiver">Caregiver</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hourly Rate (NPR)</label>
                        <input type="number" required value={quickEdit.hourlyRate} onChange={(e) => setQuickEdit({...quickEdit, hourlyRate: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-sm font-medium" placeholder="e.g. 1500" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Professional Bio</label>
                        <textarea required value={quickEdit.bio} onChange={(e) => setQuickEdit({...quickEdit, bio: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 outline-none text-sm font-medium min-h-[80px]" placeholder="Briefly describe your experience..."></textarea>
                      </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-emerald-600">{editMessage}</span>
                      <button type="submit" disabled={savingEdit} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition flex items-center">
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : "Save Changes"}
                      </button>
                  </div>
                </form>
            </div>

            {/* LOCATION FILTERED PUBLIC JOB BOARD */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> Available Jobs Near You
                </h3>
              </div>
              <div className="p-6">
                {availableJobs.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm font-medium">No general requests in your area right now.</div>
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
                          <p className="text-xs text-gray-500 font-medium truncate">{job.location} • {job.details}</p>
                        </div>
                        <button onClick={() => handleAcceptJob(job.id)} disabled={acceptingId === job.id} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl transition flex items-center justify-center">
                          {acceptingId === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Accept Job"}
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
                  
                  {/* NEW: Dynamic CV & License Checks */}
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

  // ==========================================
  // RENDER: MY CASES & AVAILABILITY TABS
  // ==========================================
  const renderMyCases = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 font-serif">My Active Cases</h2>
        <p className="text-sm text-gray-500 font-medium">Manage the care requests you have accepted.</p>
      </div>
      
      {myJobs.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Briefcase className="w-8 h-8"/></div>
          <h3 className="text-lg font-black text-gray-900">No cases yet</h3>
          <p className="text-gray-500 mt-1">Accept jobs from the dashboard to see them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myJobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-6 hover:shadow-md transition">
              <div>
                <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md mb-3 ${job.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'}`}>
                  {job.status === 'completed' ? 'Shift Completed' : 'Active Match'}
                </span>
                <h3 className="text-xl font-black text-gray-900">{job.roleNeeded}</h3>
                <p className="text-gray-500 text-sm mt-1 flex items-center"><MapPin className="w-4 h-4 mr-1"/> {job.location} • {job.careType}</p>
                <p className="text-gray-600 text-sm mt-3 bg-gray-50 p-3 rounded-lg">"{job.details}"</p>
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <button onClick={() => setActiveTab('messages')} className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-gray-300 transition">Message Patient</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAvailability = () => (
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
          {Object.entries(schedule).map(([day, isAvailable]) => (
            <div key={day} onClick={() => toggleDay(day)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition border ${isAvailable ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${isAvailable ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                  {day.charAt(0)}
                </div>
                <span className={`font-bold ${isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>{day}day</span>
              </div>
              <div className="text-gray-400">
                {isAvailable ? <ToggleRight className="w-8 h-8 text-emerald-600"/> : <ToggleLeft className="w-8 h-8"/>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMessages = () => (
    <div className="animate-in fade-in duration-300 h-[70vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center max-w-4xl">
      <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><MessageSquare className="w-12 h-12"/></div>
      <h2 className="text-3xl font-black text-gray-900 font-serif mb-2">Secure Messaging</h2>
      <p className="text-gray-500 font-medium max-w-md mx-auto mb-8">
        Chat directly with patients who have accepted your services. The real-time messaging system is currently under development!
      </p>
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
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider truncate w-32">{displayRole}</p>
            </div>
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
            <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition ${activeTab === 'messages' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="flex items-center"><MessageSquare className="w-5 h-5 mr-3" /> Messages</span>
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
           <div className="flex items-center gap-4">
             <button className="relative p-2 text-gray-400 hover:text-emerald-600 bg-gray-50 rounded-full transition">
               <Bell className="w-5 h-5" />
               {(availableJobs.length > 0 || directInvites.length > 0) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
             </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'invites' && renderInvites()}
          {activeTab === 'my-cases' && renderMyCases()}
          {activeTab === 'messages' && renderMessages()}
          {activeTab === 'availability' && renderAvailability()}
        </main>
      </div>

    </div>
  );
}