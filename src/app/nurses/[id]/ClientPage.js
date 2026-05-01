"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Star, MapPin, ShieldCheck, CheckCircle, 
  Clock, Loader2, Briefcase, GraduationCap, AlertCircle
} from 'lucide-react';

export default function NursePublicProfile() {
  const { id } = useParams();
  const router = useRouter();
  
  const [nurseData, setNurseData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [patientActiveCases, setPatientActiveCases] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(""); 

  // ==========================================
  // 1. FETCH NURSE & PATIENT DATA
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const pDoc = await getDoc(doc(db, 'users', user.uid));
          if (pDoc.exists()) {
            setPatientData({ id: user.uid, ...pDoc.data() });
            
            const q = query(collection(db, "care_requests"), where("patientId", "==", user.uid), where("status", "==", "searching"));
            const caseSnap = await getDocs(q);
            setPatientActiveCases(caseSnap.docs.map(d => ({id: d.id, ...d.data()})));
          }
        }
      });

      try {
        let nDoc = await getDoc(doc(db, 'users', id));
        if (!nDoc.exists()) nDoc = await getDoc(doc(db, 'providers', id));

        if (nDoc.exists()) {
          setNurseData({ id: nDoc.id, ...nDoc.data() });

          const q = query(collection(db, "care_requests"), where("nurseId", "==", id), where("status", "==", "completed"));
          const reviewSnap = await getDocs(q);
          
          const allCompletedJobs = reviewSnap.docs.map(d => d.data());
          setCompletedJobsCount(allCompletedJobs.length);

          const fetchedReviews = allCompletedJobs.filter(r => r.isReviewed === true);
          setReviews(fetchedReviews);

        } else {
          router.push('/dashboard/patient'); 
        }
      } catch (error) {
        console.error("Error fetching nurse:", error);
      } finally {
        setLoading(false);
      }
      return () => unsubscribe();
    };

    fetchData();
  }, [id, router]);

  // ==========================================
  // 2. SEND DIRECT INVITE ENGINE
  // ==========================================
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!patientData) {
      alert("Please log in to send a request.");
      router.push('/login');
      return;
    }
    if (!selectedCaseId) {
      alert("Please select a case to invite this provider to.");
      return;
    }

    setSubmitting(true);
    
    try {
      await updateDoc(doc(db, "care_requests", selectedCaseId), {
        targetNurseId: nurseData.id,
        status: "direct_request" 
      });

      setSubmitting(false);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/dashboard/patient');
      }, 2500);

    } catch (error) {
      console.error("Error sending invite: ", error);
      alert("Failed to send request.");
      setSubmitting(false);
    }
  };

  // ==========================================
  // 3. UI RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcf9]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500 font-bold">Loading secure profile...</p>
      </div>
    );
  }

  if (!nurseData) return null;

  const displayName = nurseData.name || nurseData.full_name || "Provider";
  const displayPhoto = nurseData.photoURL || nurseData.avatar_url || null;
  const displayRole = nurseData.specialty || nurseData.role || "Professional Caregiver";

  // 🚨 NEW: Safely extract the nested location object 🚨
  const locationDisplay = nurseData.location?.city 
    ? `${nurseData.location.city}, ${nurseData.location.zipCode}` 
    : nurseData.district || "Location not set";

  const schedule = nurseData.availabilitySchedule || {
    Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
  };
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans pb-24">
      
      <main className="max-w-5xl mx-auto px-6 pt-8">
        
        <button onClick={() => router.back()} className="flex items-center text-gray-400 hover:text-emerald-600 transition font-bold text-sm mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Search
        </button>

        <div className="bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
          
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            <div className="w-32 h-32 rounded-full bg-[#0a271f] text-white overflow-hidden flex items-center justify-center font-black text-4xl border-4 border-white shadow-lg shrink-0">
              {displayPhoto ? <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover"/> : displayName.charAt(0)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 font-serif leading-tight">{displayName}</h1>
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-lg text-gray-500 font-medium mb-4">{displayRole} • {nurseData.experience || '3'} Years Experience</p>
              
              <div className="flex flex-wrap gap-4 text-sm font-bold">
                <span className="flex items-center text-gray-600 bg-gray-50 px-4 py-2 rounded-xl capitalize">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {locationDisplay}
                </span>

                <span className="flex items-center text-sm font-bold text-gray-900 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                  <Star className={`w-4 h-4 mr-2 ${nurseData.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-300 text-gray-300'}`} /> 
                  {nurseData.rating ? `${nurseData.rating} Rating` : 'New Provider'} 
                  <span className="text-gray-500 font-medium ml-1">
                    ({nurseData.reviewCount ? nurseData.reviewCount : 0} {nurseData.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </span>

                <span className="flex items-center text-sm font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                  <Briefcase className="w-4 h-4 mr-2 text-emerald-600" />
                  {completedJobsCount} {completedJobsCount === 1 ? 'Job' : 'Jobs'} Completed
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto bg-[#fbfaf8] p-6 rounded-2xl border border-gray-100 text-center shrink-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Hourly Rate</p>
              <p className="text-4xl font-black text-gray-900 mb-4">Rs. {nurseData.hourlyRate || 1500}</p>
              <button onClick={() => setShowModal(true)} className="w-full px-8 py-4 bg-[#0a271f] text-white font-bold rounded-xl shadow-md hover:bg-black transition">
                Request Provider
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center"><Briefcase className="w-5 h-5 mr-3 text-emerald-600"/> Professional Bio</h3>
              <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                {nurseData.bio || `${displayName} is a highly qualified ${displayRole} with extensive experience providing compassionate, top-tier care in home and facility settings. Fully verified through the Safe Home platform.`}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center"><GraduationCap className="w-5 h-5 mr-3 text-emerald-600"/> Verified Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
                {nurseData.license_url && (
                  <a href={nurseData.license_url} target="_blank" rel="noreferrer" className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition group cursor-pointer">
                    <ShieldCheck className="w-8 h-8 text-gray-400 group-hover:text-emerald-600 mr-4 transition" />
                    <div><p className="font-bold text-gray-900">Nursing License</p><p className="text-xs text-emerald-600 font-bold">Verified Provider</p></div>
                  </a>
                )}

                {!nurseData.cv_url && !nurseData.license_url && !nurseData.cert_bachelor_url && !nurseData.cert_plus2_url && !nurseData.cert_slc_url && (
                  <p className="text-gray-500 font-medium italic col-span-2">Documents securely stored offline via Safe Home compliance.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-[#0a271f] text-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-black mb-6 flex items-center"><Clock className="w-5 h-5 mr-3 text-emerald-400"/> Current Availability</h3>
              <div className="space-y-3">
                {dayOrder.map(day => {
                  const isAvailable = schedule[day] || false;
                  return (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-emerald-900/50">
                      <span className={`font-bold ${isAvailable ? 'text-emerald-100' : 'text-gray-500 line-through'}`}>{day}</span>
                      {isAvailable ? (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Available</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-800 text-gray-400 px-2 py-1 rounded">Off Duty</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* PATIENT TESTIMONIALS SECTION */}
        <div className="mt-8 bg-white rounded-3xl p-8 lg:p-12 shadow-sm border border-gray-100">
           <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center font-serif">
             <Star className="w-6 h-6 mr-3 text-amber-400 fill-amber-400"/> Patient Testimonials
           </h3>
           
           {reviews.length === 0 ? (
             <p className="text-gray-500 font-medium italic">No reviews yet. Be the first to hire and review {displayName.split(' ')[0]}!</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {reviews.map((rev, i) => (
                 <div key={i} className="p-6 rounded-2xl bg-[#fdfcf9] border border-gray-100 shadow-sm">
                   <div className="flex items-center gap-1 mb-4">
                     {[...Array(5)].map((_, idx) => (
                       <Star key={idx} className={`w-4 h-4 ${idx < rev.ratingGiven ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                     ))}
                   </div>
                   <p className="text-gray-700 font-medium leading-relaxed mb-6">"{rev.reviewText}"</p>
                   <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm overflow-hidden border-2 border-white shadow-sm">
                       {rev.patientPhoto ? <img src={rev.patientPhoto} className="w-full h-full object-cover"/> : (rev.patientName || "P").charAt(0)}
                     </div>
                     <div>
                       <span className="font-bold text-sm text-gray-900 block">{rev.patientName}</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Verified Patient</span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

      </main>

      {/* NEW DIRECT REQUEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
            
            {success ? (
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 font-serif mb-2">Invite Sent!</h3>
                <p className="text-gray-500 mb-8 font-medium">We've directly notified {displayName.split(' ')[0]}. Routing you back to your dashboard...</p>
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : (
              <div>
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
                  <h3 className="text-xl font-black text-gray-900 font-serif">Invite Provider to Case</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 font-black">✕</button>
                </div>
                
                <div className="p-8">
                  {patientActiveCases.length === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h4 className="text-lg font-black text-gray-900 mb-2">No Active Care Requests</h4>
                      <p className="text-gray-500 text-sm mb-6">You need to post a care request on your dashboard before you can invite providers to it.</p>
                      <button 
                        onClick={() => router.push('/dashboard/post-case')}
                        className="w-full bg-[#0a271f] text-white font-bold py-4 rounded-xl hover:bg-black transition shadow-lg"
                      >
                        Create a Care Request Now
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendInvite} className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Select an active request to invite them to:</label>
                        <div className="space-y-3">
                          {patientActiveCases.map(job => (
                            <label key={job.id} className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition ${selectedCaseId === job.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-emerald-200 hover:bg-gray-50'}`}>
                              <input 
                                type="radio" 
                                name="caseSelection" 
                                value={job.id} 
                                checked={selectedCaseId === job.id} 
                                onChange={() => setSelectedCaseId(job.id)}
                                className="mt-1 mr-4 w-4 h-4 text-emerald-600 accent-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <p className="font-black text-gray-900">{job.roleNeeded}</p>
                                <p className="text-xs text-gray-500 font-medium capitalize">
                                  {job.careType} • {job.location?.city ? `${job.location.city}, ${job.location.zipCode}` : 'Local Area'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={!selectedCaseId || submitting} 
                        className="w-full bg-[#0a271f] text-white font-bold py-4 rounded-xl flex items-center justify-center hover:bg-black transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Direct Invite"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}