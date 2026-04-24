"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Users, UserCheck, Activity, ShieldCheck, 
  Search, CheckCircle, XCircle, Star, FileText, 
  MapPin, Phone, Mail, Loader2 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'nurses', 'patients'
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter Data
  const nurses = users.filter(u => u.role === 'nurse');
  const patients = users.filter(u => u.role === 'patient');
  const pendingNurses = nurses.filter(n => n.status === 'pending' || !n.status);
  const featuredNurses = nurses.filter(n => n.isFeatured === true);

  // Handle Admin Actions (Approve, Reject, Feature)
  const handleNurseAction = async (nurseId, actionType, extraData = {}) => {
    setActionLoading(true);
    try {
      const nurseRef = doc(db, "users", nurseId);
      let updates = {};

      if (actionType === 'approve') updates = { status: 'approved' };
      if (actionType === 'reject') updates = { status: 'rejected' }; // Later we will add rejection reason here
      if (actionType === 'feature') updates = { isFeatured: !selectedNurse.isFeatured };

      await updateDoc(nurseRef, updates);
      
      // Update local state to reflect changes instantly
      setUsers(users.map(u => u.id === nurseId ? { ...u, ...updates } : u));
      setSelectedNurse({ ...selectedNurse, ...updates });
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]"><Loader2 className="animate-spin text-[#0a271f] w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0a271f] text-emerald-50 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-emerald-900">
          <div className="text-2xl font-black font-serif text-emerald-400">Safe Home.</div>
          <p className="text-xs text-emerald-200 mt-1 uppercase tracking-widest font-bold">Admin Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center p-3 rounded-lg font-bold transition ${activeTab === 'overview' ? 'bg-emerald-800 text-white' : 'hover:bg-emerald-900/50 text-emerald-200'}`}>
            <Activity className="w-5 h-5 mr-3" /> Overview
          </button>
          <button onClick={() => setActiveTab('nurses')} className={`w-full flex items-center p-3 rounded-lg font-bold transition ${activeTab === 'nurses' ? 'bg-emerald-800 text-white' : 'hover:bg-emerald-900/50 text-emerald-200'}`}>
            <ShieldCheck className="w-5 h-5 mr-3" /> Care Providers
            {pendingNurses.length > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingNurses.length}</span>}
          </button>
          <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center p-3 rounded-lg font-bold transition ${activeTab === 'patients' ? 'bg-emerald-800 text-white' : 'hover:bg-emerald-900/50 text-emerald-200'}`}>
            <Users className="w-5 h-5 mr-3" /> Patients
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#fdfcf9]">
        
        {/* --- TAB 1: OVERVIEW (God View Analytics) --- */}
        {activeTab === 'overview' && (
          <div className="p-8 overflow-y-auto h-full">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Platform Analytics</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="p-4 bg-emerald-50 rounded-xl text-emerald-700 mr-4"><ShieldCheck className="w-8 h-8"/></div>
                <div><p className="text-sm font-bold text-gray-500 uppercase">Total Nurses</p><p className="text-3xl font-black text-gray-900">{nurses.length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="p-4 bg-blue-50 rounded-xl text-blue-700 mr-4"><Users className="w-8 h-8"/></div>
                <div><p className="text-sm font-bold text-gray-500 uppercase">Total Patients</p><p className="text-3xl font-black text-gray-900">{patients.length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="p-4 bg-amber-50 rounded-xl text-amber-600 mr-4"><UserCheck className="w-8 h-8"/></div>
                <div><p className="text-sm font-bold text-gray-500 uppercase">Pending Approval</p><p className="text-3xl font-black text-gray-900">{pendingNurses.length}</p></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                <div className="p-4 bg-purple-50 rounded-xl text-purple-700 mr-4"><Star className="w-8 h-8"/></div>
                <div><p className="text-sm font-bold text-gray-500 uppercase">Featured Profiles</p><p className="text-3xl font-black text-gray-900">{featuredNurses.length}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: NURSES (Split-Screen Viewer) --- */}
        {activeTab === 'nurses' && (
          <div className="flex h-full w-full overflow-hidden">
            
            {/* LEFT SIDE: Applicant List */}
            <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search nurses..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {nurses.map(nurse => (
                  <button key={nurse.id} onClick={() => setSelectedNurse(nurse)} className={`w-full text-left p-4 rounded-xl flex items-center transition ${selectedNurse?.id === nurse.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative shrink-0">
                      <Image src={nurse.avatar_url || '/default-avatar.png'} fill className="object-cover" alt="avatar" />
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <p className="font-bold text-gray-900 truncate">{nurse.full_name || 'Unnamed User'}</p>
                      <p className="text-xs text-gray-500 truncate">{nurse.specialty || 'No Specialty'}</p>
                      <div className="mt-1 flex gap-2">
                        {nurse.status === 'approved' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Approved</span>}
                        {(nurse.status === 'pending' || !nurse.status) && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Pending</span>}
                        {nurse.status === 'rejected' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Rejected</span>}
                        {nurse.isFeatured && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center"><Star className="w-3 h-3 mr-0.5"/> Featured</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: Profile & CV Details */}
            <div className="w-2/3 bg-[#fdfcf9] h-full overflow-y-auto">
              {selectedNurse ? (
                <div className="p-8 max-w-4xl mx-auto">
                  
                  {/* Header Actions */}
                  <div className="flex justify-between items-start mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center">
                      <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden relative mr-5 shadow-sm">
                        <Image src={selectedNurse.avatar_url || '/default-avatar.png'} fill className="object-cover" alt="avatar" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-gray-900">{selectedNurse.full_name}</h2>
                        <p className="text-emerald-700 font-bold">{selectedNurse.specialty}</p>
                        <p className="text-sm text-gray-500 flex items-center mt-1"><MapPin className="w-4 h-4 mr-1"/> {selectedNurse.city_zone}, {selectedNurse.district}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleNurseAction(selectedNurse.id, 'approve')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center text-sm shadow-sm transition disabled:opacity-50">
                          <CheckCircle className="w-4 h-4 mr-1.5"/> Approve
                        </button>
                        <button onClick={() => handleNurseAction(selectedNurse.id, 'reject')} disabled={actionLoading} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-lg font-bold flex items-center text-sm transition disabled:opacity-50">
                          <XCircle className="w-4 h-4 mr-1.5"/> Reject
                        </button>
                      </div>
                      <button onClick={() => handleNurseAction(selectedNurse.id, 'feature')} disabled={actionLoading || selectedNurse.status !== 'approved'} className={`px-4 py-2 rounded-lg font-bold flex items-center justify-center text-sm transition disabled:opacity-50 border ${selectedNurse.isFeatured ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                        <Star className={`w-4 h-4 mr-1.5 ${selectedNurse.isFeatured ? 'fill-current' : ''}`}/> {selectedNurse.isFeatured ? 'Unfeature Profile' : 'Feature on Homepage'}
                      </button>
                    </div>
                  </div>

                  {/* Body Details Split */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Data Details */}
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-900 border-b pb-2 uppercase text-xs tracking-wider">Professional Info</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-gray-500">License (NMC)</p><p className="font-bold">{selectedNurse.licenseNumber || 'N/A'}</p></div>
                          <div><p className="text-gray-500">Experience</p><p className="font-bold">{selectedNurse.experience} Years</p></div>
                          <div><p className="text-gray-500">Hourly Rate</p><p className="font-bold">NPR {selectedNurse.hourlyRate}/hr</p></div>
                          <div><p className="text-gray-500">Availability</p><p className="font-bold">{selectedNurse.availability || 'N/A'}</p></div>
                        </div>
                        <div><p className="text-gray-500 text-sm">Education</p><p className="font-bold text-sm">{selectedNurse.education || 'N/A'}</p></div>
                        <div><p className="text-gray-500 text-sm">Bio</p><p className="text-sm bg-gray-50 p-3 rounded-lg mt-1">{selectedNurse.bio || 'No bio provided.'}</p></div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="font-bold text-gray-900 border-b pb-2 uppercase text-xs tracking-wider">Contact Info</h3>
                        <div className="space-y-3">
                          <p className="flex items-center text-sm"><Phone className="w-4 h-4 text-gray-400 mr-3"/> <span className="font-bold">{selectedNurse.phone}</span></p>
                          <p className="flex items-center text-sm"><Mail className="w-4 h-4 text-gray-400 mr-3"/> <span className="font-bold">{selectedNurse.email}</span></p>
                          <p className="flex items-center text-sm"><MapPin className="w-4 h-4 text-gray-400 mr-3"/> <span className="font-bold">{selectedNurse.address}, {selectedNurse.ward}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* PDF CV Embed */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                      <h3 className="font-bold text-gray-900 border-b pb-2 uppercase text-xs tracking-wider mb-4 flex items-center">
                        <FileText className="w-4 h-4 mr-2"/> Attached CV / Resume
                      </h3>
                      {selectedNurse.cv_url ? (
                        <iframe src={selectedNurse.cv_url} className="w-full flex-1 rounded-lg border border-gray-200" title="CV PDF Viewer"></iframe>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <FileText className="w-12 h-12 text-gray-300 mb-2"/>
                          <p className="text-gray-500 font-medium">No CV uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShieldCheck className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-bold">Select an application to review</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: PATIENTS LIST --- */}
        {activeTab === 'patients' && (
          <div className="p-8 overflow-y-auto h-full">
             <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Registered Patients</h1>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                      <th className="p-4 font-bold">Patient Name</th>
                      <th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold">Care Recipient</th>
                      <th className="p-4 font-bold">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="p-4 font-bold text-gray-900">{patient.full_name || 'Unnamed User'}</td>
                        <td className="p-4 text-gray-600">{patient.city_zone}, {patient.district}</td>
                        <td className="p-4 text-gray-600">
                           <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{patient.careRecipient || 'Unknown'}</span>
                        </td>
                        <td className="p-4 text-gray-600 text-sm">{patient.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}