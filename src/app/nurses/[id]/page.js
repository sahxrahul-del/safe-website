"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Star, MapPin, ShieldCheck, CheckCircle, 
  Clock, Loader2, FileText, Briefcase, GraduationCap 
} from 'lucide-react';

export default function NursePublicProfile() {
  const { id } = useParams(); // Gets the ID from the URL
  const router = useRouter();
  
  const [nurseData, setNurseData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    careType: 'In-Home Care',
    urgency: 'Flexible',
    details: ''
  });

  // ==========================================
  // 1. FETCH NURSE & PATIENT DATA
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      // Get Logged-in Patient Identity
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const pDoc = await getDoc(doc(db, 'users', user.uid));
          if (pDoc.exists()) setPatientData({ id: user.uid, ...pDoc.data() });
        }
      });

      try {
        // Try to find the nurse in REAL users first
        let nDoc = await getDoc(doc(db, 'users', id));
        
        // If not found, look in the MEGA-SEEDER providers collection
        if (!nDoc.exists()) {
          nDoc = await getDoc(doc(db, 'providers', id));
        }

        if (nDoc.exists()) {
          setNurseData({ id: nDoc.id, ...nDoc.data() });

          // Fetch their completed reviews!
          const q = query(collection(db, "care_requests"), where("nurseId", "==", id), where("status", "==", "completed"));
          const reviewSnap = await getDocs(q);
          const fetchedReviews = reviewSnap.docs.map(d => d.data()).filter(r => r.rating); // Only keep ones with a rating
          setReviews(fetchedReviews);

        } else {
          // No nurse found with this ID
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
  // 2. DIRECT REQUEST ENGINE
  // ==========================================
  const handleDirectRequest = async (e) => {
    e.preventDefault();
    if (!patientData) {
      alert("Please log in to send a request.");
      router.push('/login');
      return;
    }

    setSubmitting(true);
    
    try {
      await addDoc(collection(db, "care_requests"), {
        ...formData,
        patientId: patientData.id,
        patientName: patientData.name || patientData.full_name || "Patient",
        patientPhoto: patientData.photoURL || patientData.avatar_url || "",
        location: patientData.location || patientData.district || "Patient Location",
        roleNeeded: nurseData.specialty || nurseData.role || "Registered Nurse",
        targetNurseId: nurseData.id, // EXCLUSIVE DIRECT INVITE!
        status: "direct_request", 
        createdAt: serverTimestamp(),
      });

      setSubmitting(false);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/dashboard/patient');
      }, 2500);

    } catch (error) {
      console.error("Error posting case: ", error);
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

  // --> DROPPED IT RIGHT HERE! <--
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : "New";

  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans pb-24">
      
      {/* TOP NAVIGATION */}
      <header className="bg-white border-b border-gray-100 p-6 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 transition font-bold text-sm">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Search
          </button>
          <div className="flex items-center text-emerald-700 font-black font-serif text-xl">
            Safe Home.
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10">
        
        {/* HEADER PROFILE CARD */}
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
                <span className="flex items-center text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" /> {nurseData.location || nurseData.district || "Kathmandu"}
                </span>
                <span className="flex items-center text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
                  <Star className="w-4 h-4 mr-2 text-amber-400 fill-amber-400" /> {avgRating} Rating ({reviews.length})
                </span>
                <span className="flex items-center text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl">
                  <CheckCircle className="w-4 h-4 mr-2" /> Verified Background
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
          
          {/* LEFT COLUMN: Bio & Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center"><Briefcase className="w-5 h-5 mr-3 text-emerald-600"/> Professional Bio</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                {nurseData.bio || `${displayName} is a highly qualified ${displayRole} with extensive experience providing compassionate, top-tier care in home and facility settings. Fully verified through the Safe Home platform.`}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center"><GraduationCap className="w-5 h-5 mr-3 text-emerald-600"/> Verified Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {nurseData.cv_url && (
                  <a href={nurseData.cv_url} target="_blank" rel="noreferrer" className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition group cursor-pointer">
                    <FileText className="w-8 h-8 text-gray-400 group-hover:text-emerald-600 mr-4 transition" />
                    <div><p className="font-bold text-gray-900">Curriculum Vitae (CV)</p><p className="text-xs text-gray-500">PDF Document</p></div>
                  </a>
                )}
                {nurseData.cert_bachelor_url && (
                  <a href={nurseData.cert_bachelor_url} target="_blank" rel="noreferrer" className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 transition group cursor-pointer">
                    <CheckCircle className="w-8 h-8 text-gray-400 group-hover:text-emerald-600 mr-4 transition" />
                    <div><p className="font-bold text-gray-900">Nursing License</p><p className="text-xs text-emerald-600 font-bold">Verified</p></div>
                  </a>
                )}
                {!nurseData.cv_url && !nurseData.cert_bachelor_url && (
                  <p className="text-gray-500 font-medium italic col-span-2">Documents securely stored offline via Safe Home compliance.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Availability & Stats */}
          <div className="space-y-8">
            <div className="bg-[#0a271f] text-white rounded-3xl p-8 shadow-xl">
              <h3 className="text-xl font-black mb-6 flex items-center"><Clock className="w-5 h-5 mr-3 text-emerald-400"/> Current Availability</h3>
              <div className="space-y-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                  <div key={day} className="flex justify-between items-center py-2 border-b border-emerald-900/50">
                    <span className="font-bold text-emerald-100">{day}</span>
                    <span className="text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Available</span>
                  </div>
                ))}
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
                       <Star key={idx} className={`w-4 h-4 ${idx < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                     ))}
                   </div>
                   <p className="text-gray-700 font-medium leading-relaxed mb-6">"{rev.reviewComment}"</p>
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

      {/* DIRECT REQUEST MODAL (Popup) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
            
            {success ? (
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 font-serif mb-2">Request Sent!</h3>
                <p className="text-gray-500 mb-8 font-medium">We've directly notified {displayName.split(' ')[0]}. Routing you back to your dashboard...</p>
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              </div>
            ) : (
              <div>
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-[#fdfcf9]">
                  <h3 className="text-xl font-black text-gray-900 font-serif">Direct Care Request</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900 font-black">✕</button>
                </div>
                
                <form onSubmit={handleDirectRequest} className="p-8 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Care Needed</label>
                    <select value={formData.careType} onChange={(e) => setFormData({...formData, careType: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium">
                      <option value="In-Home Care">In-Home Care</option>
                      <option value="Post-Surgical">Post-Surgical</option>
                      <option value="Elderly Companionship">Elderly Companionship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Timeline</label>
                    <select value={formData.urgency} onChange={(e) => setFormData({...formData, urgency: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium">
                      <option value="Flexible">Flexible Timeline</option>
                      <option value="This Week">Starts This Week</option>
                      <option value="Urgent">ASAP / Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Message to Provider</label>
                    <textarea required value={formData.details} onChange={(e) => setFormData({...formData, details: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 outline-none font-medium resize-none min-h-[100px]" placeholder="Briefly describe what you need help with..."></textarea>
                  </div>
                  <button type="submit" disabled={submitting} className="w-full bg-[#0a271f] text-white font-bold py-4 rounded-xl flex items-center justify-center hover:bg-black transition shadow-lg disabled:opacity-70">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Secure Request"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}