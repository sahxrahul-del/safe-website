"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, updateDoc, collection, query, onSnapshot, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  ArrowLeft, MapPin, FileText, Loader2, AlertCircle, Clock, 
  UserCircle, Briefcase, Activity, CheckCircle, MessageSquare, Send 
} from 'lucide-react';

export default function CaseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  // Real State
  const [jobData, setJobData] = useState(null);
  const [patientData, setPatientData] = useState(null); // <-- NEW: To hold patient's personal info
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [nurseData, setNurseData] = useState(null);
  
  // Action States
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ==========================================
  // 1. INITIALIZATION & DATA FETCHING
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserAuth(user);
          const nDoc = await getDoc(doc(db, 'users', user.uid));
          if (nDoc.exists()) setNurseData({ id: user.uid, ...nDoc.data() });
        }
      });

      try {
        const jobDoc = await getDoc(doc(db, 'care_requests', id));
        if (jobDoc.exists()) {
          const job = { id: jobDoc.id, ...jobDoc.data() };
          setJobData(job);

          // NEW: Fetch the Patient's full profile data from the users collection
          if (job.patientId) {
            const patientDoc = await getDoc(doc(db, 'users', job.patientId));
            if (patientDoc.exists()) {
              setPatientData(patientDoc.data());
            }
          }

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

  // ==========================================
  // 2. LIVE CHAT LISTENER
  // ==========================================
  useEffect(() => {
    if (!id || !jobData || jobData.status !== 'matched') return;
    
    const q = query(collection(db, `care_requests/${id}/messages`));
    const unsubChat = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setChatMessages(msgs);
    });

    return () => unsubChat();
  }, [id, jobData]);

  // ==========================================
  // 3. DATABASE ACTIONS
  // ==========================================
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
      // Refresh local state instantly to open the chat room
      setJobData(prev => ({ ...prev, status: 'matched' }));
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
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

  const handleCompleteShift = async () => {
    setCompleting(true);
    try {
      await updateDoc(doc(db, "care_requests", jobData.id), {
        status: 'completed'
      });
      setJobData(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error("Error completing shift:", error);
    } finally {
      setCompleting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userAuth) return;
    try {
      await addDoc(collection(db, `care_requests/${id}/messages`), {
        text: newMessage,
        senderId: userAuth.uid,
        senderName: nurseData?.name || nurseData?.full_name || "Provider",
        createdAt: serverTimestamp()
      });
      setNewMessage(""); 
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcf9]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-500 font-bold">Decrypting Case File...</p>
      </div>
    );
  }

  if (!jobData) return null;

  const medicalFiles = jobData.medical_urls || (jobData.medical_url ? [jobData.medical_url] : []);
  const isMatched = jobData.status === 'matched';
  const isCompleted = jobData.status === 'completed';

  return (
    <div className="h-[calc(100vh-80px)] bg-[#fdfcf9] font-sans flex flex-col overflow-hidden">
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 overflow-hidden h-full">
        
        {/* NEW: Integrated Top Action Bar (No background, sits seamlessly above content) */}
        <div className="flex justify-between items-center w-full shrink-0">
          <button onClick={() => router.push('/dashboard/nurse')} className="flex items-center text-gray-500 hover:text-emerald-700 transition font-bold text-sm bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </button>
          
          {/* Status Badge */}
          {isMatched && <span className="bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-emerald-200 shadow-sm flex items-center"><Activity className="w-4 h-4 mr-2"/> Active Shift</span>}
          {isCompleted && <span className="bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-full border border-gray-200 shadow-sm">Shift Completed</span>}
        </div>

        {/* Split Screen Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-hidden h-full">
          
          {/* LEFT COLUMN: Case Details (Review Section) */}
          <div className="w-full lg:w-5/12 h-full overflow-y-auto custom-scrollbar pr-2 pb-6">
            
            {/* Patient Header Card */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-50 overflow-hidden flex items-center justify-center border-4 border-white shadow-sm shrink-0">
                {jobData.patientPhoto ? <img src={jobData.patientPhoto} className="w-full h-full object-cover"/> : <UserCircle className="w-8 h-8 text-blue-300"/>}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Patient Account</p>
                <p className="text-lg font-black text-gray-900">{jobData.patientName}</p>
                <p className="text-xs text-emerald-600 font-bold flex items-center mt-1"><CheckCircle className="w-3 h-3 mr-1"/> Verified Profile</p>
              </div>
            </div>

            {/* DETAILED PATIENT PERSONAL INFO */}
            {patientData && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 mb-6">
                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-50 pb-2">Personal Information</h4>
                
                <div className="space-y-3 text-sm">
                    <p className="flex justify-between items-center"><span className="text-gray-500 font-medium">Phone</span> <span className="font-bold text-gray-900">{patientData.phone || 'Not provided'}</span></p>
                    <p className="flex justify-between items-start"><span className="text-gray-500 font-medium shrink-0 mr-4">Location</span> <span className="font-bold text-gray-900 text-right">{patientData.address ? `${patientData.city_zone || ''}, ${patientData.address}` : (patientData.district || 'Not provided')}</span></p>
                </div>

                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-50 pb-2 pt-4">Medical Summary</h4>
                <div className="space-y-3 text-sm">
                    <p className="flex justify-between"><span className="text-gray-500 font-medium">Care For</span> <span className="font-bold text-gray-900">{patientData.careRecipient || 'Self'}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500 font-medium">Mobility</span> <span className="font-bold text-gray-900">{patientData.mobility || 'Not specified'}</span></p>
                </div>

                {patientData.emergencyName && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4">
                      <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Emergency Contact</p>
                      <p className="font-bold text-red-900">{patientData.emergencyName} {patientData.emergencyRelation ? `(${patientData.emergencyRelation})` : ''}</p>
                      <p className="text-sm font-medium text-red-800">{patientData.emergencyPhone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Job Requirements */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Role Needed</p>
                  <p className="font-black text-gray-900">{jobData.roleNeeded}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Care Type</p>
                  <p className="font-black text-gray-900">{jobData.careType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Location</p>
                  <p className="font-bold text-gray-700">{jobData.location}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Urgency</p>
                  <span className="text-amber-700 font-bold">{jobData.urgency}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Case Notes & Requirements</p>
                 <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <p className="text-gray-700 text-sm font-medium whitespace-pre-wrap">"{jobData.details}"</p>
                 </div>
              </div>

              {medicalFiles.length > 0 && (
                <div className="pt-6 border-t border-gray-50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Medical Documents</p>
                  <div className="flex flex-col gap-2">
                    {medicalFiles.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noreferrer" className="flex items-center px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition border border-blue-100">
                        <FileText className="w-5 h-5 mr-3 text-blue-500"/> View Document {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Action & Chat Section */}
          <div className="w-full lg:w-7/12 h-full flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            
            {/* 🚨 UPDATED: Dynamic Action Header 🚨 */}
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
              
              {/* Handles BOTH Direct Invites AND Public Searching Jobs */}
              {jobData.status === 'direct_request' || jobData.status === 'searching' ? (
                <div className="w-full text-center py-4">
                   <h3 className="font-black text-xl text-gray-900 mb-2">Review & Accept Case</h3>
                   <p className="text-sm text-gray-500 mb-6">Review the patient's personal and medical details on the left before accepting.</p>
                   <div className="flex justify-center gap-4">
                      
                      {/* ONLY show Decline button if it was a direct invite */}
                      {jobData.status === 'direct_request' && (
                        <button onClick={handleDeclineInvite} disabled={declining} className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition shadow-sm">
                          {declining ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "Decline Invite"}
                        </button>
                      )}

                      <button onClick={handleAcceptInvite} disabled={accepting} className="px-8 py-3 bg-[#0a271f] text-white rounded-xl font-black shadow-md hover:bg-black transition flex items-center">
                        {accepting ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : null} Accept & Open Chat Room
                      </button>
                   </div>
                </div>

              ) : isMatched ? (
                <>
                  <div className="flex items-center">
                     <MessageSquare className="w-6 h-6 text-emerald-600 mr-3"/>
                     <div>
                       <h3 className="font-black text-gray-900 leading-tight">Live Chat</h3>
                       <p className="text-xs text-gray-500 font-bold">Encrypted Connection</p>
                     </div>
                  </div>
                  <button onClick={handleCompleteShift} disabled={completing} className="px-5 py-2.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 rounded-xl font-black text-sm transition flex items-center shadow-sm">
                     {completing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>} Complete Shift
                  </button>
                </>

              ) : (
                <div className="w-full text-center py-2">
                   <h3 className="font-black text-gray-900 mb-1 flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2 text-emerald-500"/> Shift Completed</h3>
                   <p className="text-sm text-gray-500">This case has been closed and archived.</p>
                </div>
              )}
            </div>

            {/* Chat Interface (Only visible if matched or completed) */}
            {(isMatched || isCompleted) && (
              <>
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#fdfcf9] flex flex-col space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="m-auto text-center">
                       <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                         <MessageSquare className="w-8 h-8 text-emerald-300"/>
                       </div>
                       <p className="text-gray-500 font-bold">No messages yet.</p>
                       <p className="text-sm text-gray-400">Introduce yourself to the patient!</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.senderId === userAuth?.uid;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl ${isMe ? 'bg-emerald-600 text-white rounded-br-sm shadow-md' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 font-bold tracking-wider">{msg.senderName}</span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Message Input Form */}
                {isMatched && (
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      placeholder="Type your message here..." 
                      className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-medium text-sm transition" 
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="px-6 py-3 bg-[#0a271f] text-white font-bold rounded-xl hover:bg-black transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                      <Send className="w-5 h-5 mr-2"/> Send
                    </button>
                  </form>
                )}
              </>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}