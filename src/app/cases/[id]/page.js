"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, MapPin, FileText, Loader2, AlertCircle, Clock, UserCircle, Briefcase, Activity, CheckCircle } from 'lucide-react';

export default function CaseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [nurseData, setNurseData] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const nDoc = await getDoc(doc(db, 'users', user.uid));
          if (nDoc.exists()) setNurseData({ id: user.uid, ...nDoc.data() });
        }
      });

      try {
        const jobDoc = await getDoc(doc(db, 'care_requests', id));
        if (jobDoc.exists()) {
          setJobData({ id: jobDoc.id, ...jobDoc.data() });
        } else {
          router.push('/dashboard/nurse');
        }
      } catch (error) {
        console.error("Error fetching case:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleAcceptInvite = async () => {
    if (!nurseData) return;
    setAccepting(true);
    try {
      await updateDoc(doc(db, "care_requests", jobData.id), {
        status: 'matched',
        nurseId: nurseData.id,
        nurseName: nurseData.name || nurseData.full_name || "Provider",
        nursePhoto: nurseData.photoURL || nurseData.avatar_url || ""
      });
      router.push('/dashboard/nurse');
    } catch (error) {
      console.error("Error accepting invite:", error);
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    setDeclining(true);
    try {
      await updateDoc(doc(db, "care_requests", jobData.id), {
        status: 'searching',
        targetNurseId: null 
      });
      router.push('/dashboard/nurse');
    } catch (error) {
      console.error("Error declining invite:", error);
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcf9]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500 font-bold">Decrypting Case File...</p>
      </div>
    );
  }

  if (!jobData) return null;

  // Normalize medical URLs into an array so we can map them cleanly
  const medicalFiles = jobData.medical_urls || (jobData.medical_url ? [jobData.medical_url] : []);

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans pb-24">
      <header className="bg-white border-b border-gray-100 p-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-emerald-600 transition font-bold text-sm">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Inbox
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: Intro & Patient Identity */}
          <div className="lg:col-span-5 space-y-8 sticky top-32">
            <div>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Exclusive Direct Invite</p>
              <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 leading-tight mb-4">
                Review this<br/><span className="text-emerald-600 italic">care request.</span>
              </h1>
              <p className="text-gray-500 font-medium leading-relaxed">
                Review the patient's requirements and attached medical documents before accepting the shift. Once accepted, you can instantly message the family.
              </p>
            </div>

            {/* Patient Info Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-50 overflow-hidden flex items-center justify-center border-4 border-white shadow-sm shrink-0">
                {jobData.patientPhoto ? <img src={jobData.patientPhoto} className="w-full h-full object-cover"/> : <UserCircle className="w-8 h-8 text-blue-300"/>}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Requested By</p>
                <p className="text-lg font-black text-gray-900">{jobData.patientName}</p>
                <p className="text-xs text-emerald-600 font-bold flex items-center mt-1"><CheckCircle className="w-3 h-3 mr-1"/> Verified Patient Account</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Form Details */}
          <div className="lg:col-span-7 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-lg">
            
            <div className="space-y-8">
              {/* Top Row: Role & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Briefcase className="w-4 h-4 mr-1.5"/> Role Needed</p>
                  <p className="text-xl font-black text-gray-900">{jobData.roleNeeded}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Activity className="w-4 h-4 mr-1.5"/> Care Type</p>
                  <p className="text-xl font-black text-gray-900">{jobData.careType}</p>
                </div>
              </div>

              {/* Middle Row: Location & Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><MapPin className="w-4 h-4 mr-1.5"/> Location</p>
                  <p className="text-lg font-bold text-gray-700">{jobData.location}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Clock className="w-4 h-4 mr-1.5"/> Urgency</p>
                  <span className="inline-block px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-bold">
                    {jobData.urgency}
                  </span>
                </div>
              </div>

              {/* Details Text Area */}
              <div className="pt-6 border-t border-gray-50">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Case Details & Requirements</p>
                 <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <p className="text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">"{jobData.details}"</p>
                 </div>
              </div>

              {/* Multiple Medical Files */}
              {medicalFiles.length > 0 && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Attached Documents ({medicalFiles.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {medicalFiles.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" className="flex items-center px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition border border-blue-100 group">
                        <FileText className="w-5 h-5 mr-2 text-blue-400 group-hover:text-blue-600 transition"/> 
                        View Document {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-8 mt-8 border-t border-gray-100">
                {jobData.status === 'direct_request' ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleAcceptInvite} disabled={accepting || declining} className="flex-1 px-8 py-4 bg-[#0a271f] text-white rounded-xl font-black text-lg hover:bg-black transition flex justify-center items-center shadow-lg transform hover:-translate-y-1">
                      {accepting ? <Loader2 className="w-6 h-6 animate-spin"/> : "Accept & Connect"}
                    </button>
                    <button onClick={handleDeclineInvite} disabled={accepting || declining} className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-bold text-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition flex justify-center items-center">
                      {declining ? <Loader2 className="w-6 h-6 animate-spin"/> : "Decline Request"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center gap-3">
                    <AlertCircle className="w-6 h-6 text-gray-400"/>
                    <p className="font-bold text-gray-500">This request is no longer pending.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}