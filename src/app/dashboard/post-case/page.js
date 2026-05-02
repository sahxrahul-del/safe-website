"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader2, UploadCloud, FileText, MapPin, X } from 'lucide-react'; // 🚨 Added X icon

// IMPORTING FIREBASE
import { auth, db, storage } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; 

export default function PostCareRequest() {
  const router = useRouter();
  
  const [userData, setUserData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  const [uploadingFile, setUploadingFile] = useState(false); 
  const [medicalFiles, setMedicalFiles] = useState([]); 

  const [durationSelect, setDurationSelection] = useState("");
  const [customDuration, setCustomDuration] = useState("");

  const [formData, setFormData] = useState({
    careType: 'In-Home Care',
    roleNeeded: 'Registered Nurse (RN)',
    country: '',
    state: '',
    city: '',
    zipCode: '',
    street: '',
    urgency: 'This Week',
    details: ''
  });

  const careTypes = ['In-Home Care', 'Post-Surgical', 'Companionship', 'Facility Shift'];
  const urgencies = [
    { label: 'Flexible', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { label: 'This Week', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { label: 'Urgent', color: 'bg-red-50 text-red-700 hover:bg-red-100' }
  ];

  // 1. SECURELY GET THE LOGGED-IN PATIENT & PRE-FILL LOCATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({ id: user.uid, ...data });

          // AUTO-FILL NEW LOCATION FORMAT FROM PATIENT PROFILE
          const loc = data.location || {};
          setFormData(prev => ({
            ...prev,
            country: loc.country || '',
            state: loc.state || '',
            city: loc.city || '',
            zipCode: loc.zipCode || '',
            street: loc.street || ''
          }));
        }
        setPageLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 🚨 2. FILE MANAGEMENT FIXES 🚨
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // APPEND new files to the existing array instead of replacing them
      setMedicalFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    // Filter out the file that matches the clicked index
    setMedicalFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. THE REAL FIREBASE SUBMIT FUNCTION
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let uploadedUrls = [];

      if (medicalFiles.length > 0) {
        setUploadingFile(true); 
        
        uploadedUrls = await Promise.all(
          medicalFiles.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            // Added a random string so multiple files don't overwrite each other!
            const randomString = Math.random().toString(36).substring(7);
            const fileName = `medical_${userData.id}_${Date.now()}_${randomString}_${index}.${fileExt}`;
            const storageRef = ref(storage, `medical_records/${fileName}`);
            
            await uploadBytesResumable(storageRef, file);
            return await getDownloadURL(storageRef);
          })
        );
        
        setUploadingFile(false);
      }

      const { country, state, city, zipCode, street, ...restData } = formData;
      
      // Calculate the final duration to save
      const finalDuration = durationSelect === 'Custom' ? customDuration : durationSelect;

      await addDoc(collection(db, "care_requests"), {
        ...restData,
        location: {
          country: country?.toLowerCase().trim() || '',
          state: state?.trim() || '',
          city: city?.toLowerCase().trim() || '',
          zipCode: zipCode?.trim() || '',
          street: street?.trim() || ''
        },
        duration: finalDuration, 
        patientId: userData.id, 
        patientName: userData.name || userData.full_name || "Patient",
        patientPhoto: userData.photoURL || userData.avatar_url || "",
        medical_urls: uploadedUrls, 
        status: "pending_verification",
        createdAt: serverTimestamp(),
      });
          
      setSubmitting(false);
      setSuccess(true);
      
      setTimeout(() => {
        router.push('/dashboard/patient');
      }, 2500);

    } catch (error) {
      console.error("Error posting case: ", error);
      alert("Failed to post request. Check your database connection.");
      setSubmitting(false);
      setUploadingFile(false);
    }
  };

  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3";
  const inputClass = "w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none transition-all bg-[#fbfaf8] text-gray-900 font-medium text-base";

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans flex justify-center items-center py-12 px-6">
      <div className="max-w-6xl w-full bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 lg:p-16 flex flex-col lg:flex-row gap-12 lg:gap-24 relative">
        
        <button onClick={() => router.back()} className="absolute top-8 left-8 lg:top-12 lg:left-12 flex items-center text-gray-400 hover:text-gray-900 transition font-bold text-sm">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        <div className="lg:w-5/12 flex flex-col justify-between mt-12 lg:mt-8">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">New Care Request</p>
            <h1 className="text-5xl lg:text-6xl font-serif text-gray-900 leading-[1.1] mb-6">
              What kind of <br/>care do you <span className="text-emerald-600 italic">need?</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Describe your need and attach any relevant medical documents. We'll instantly match you with verified professionals in your area.
            </p>
          </div>
        </div> 

        <div className="lg:w-7/12">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            <div>
              <label className={labelClass}>Care Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {careTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, careType: type})}
                    className={`py-4 px-6 rounded-2xl text-base font-bold transition-all text-left ${
                      formData.careType === type 
                        ? 'bg-[#0a271f] text-white shadow-md' 
                        : 'bg-[#fbfaf8] text-gray-700 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Professional Role Needed</label>
              <select 
                value={formData.roleNeeded} 
                onChange={(e) => setFormData({...formData, roleNeeded: e.target.value})}
                className={inputClass}
              >
                <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                <option value="Licensed Practical Nurse (LPN)">Licensed Practical Nurse (LPN)</option>
                <option value="Certified Caregiver">Certified Caregiver</option>
                <option value="Physical Therapist">Physical Therapist</option>
              </select>
            </div>

            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
              <label className="text-sm font-black text-gray-900 flex items-center mb-4"><MapPin className="w-5 h-5 mr-2 text-emerald-600"/> Care Location</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Country *</label>
                      <input required name="country" value={formData.country} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Nepal" />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">State / Province *</label>
                      <input required name="state" value={formData.state} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Madhesh" />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">City *</label>
                      <input required name="city" value={formData.city} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Janakpur" />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Zip / Postal Code *</label>
                      <input required name="zipCode" value={formData.zipCode} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. 45600" />
                  </div>
              </div>

              <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Street Address *</label>
                  <input required name="street" value={formData.street} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Station Road, Ward 1" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Urgency</label>
              <div className="flex flex-col sm:flex-row gap-4">
                {urgencies.map(urgency => (
                  <button
                    key={urgency.label}
                    type="button"
                    onClick={() => setFormData({...formData, urgency: urgency.label})}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all border ${
                      formData.urgency === urgency.label 
                        ? `${urgency.color} border-transparent shadow-sm ring-2 ring-offset-2 ring-${urgency.color.split('-')[1]}-200` 
                        : 'bg-[#fbfaf8] text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className={labelClass}>Expected Duration</label>
              <select 
                value={durationSelect} 
                onChange={(e) => setDurationSelection(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select Duration</option>
                <option value="1-3 Days">1-3 Days (Short term)</option>
                <option value="1 Week">1 Week</option>
                <option value="1 Month">1 Month</option>
                <option value="Long Term (3+ Months)">Long Term (3+ Months)</option>
                <option value="Custom">Custom (Specify below)</option>
              </select>
              
              {durationSelect === 'Custom' && (
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Every weekend for 6 weeks" 
                  className={`mt-3 ${inputClass} animate-in fade-in slide-in-from-top-2`}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}
            </div>
         
            <div>
              <label className={labelClass}>Details</label>
              <textarea 
                required
                value={formData.details}
                onChange={(e) => setFormData({...formData, details: e.target.value})}
                className={`${inputClass} min-h-[140px] resize-none`} 
                placeholder="Post-op care for mom after hip replacement. Need overnight coverage for 3-5 days..." 
              />
            </div>

            {/* 🚨 UPDATED MULTI-FILE UPLOAD UI 🚨 */}
            <div className="pt-4 border-t border-gray-100">
              <label className={labelClass}>Medical Documents / Prescriptions (Optional)</label>
              
              <label className="mt-2 flex w-full flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer transition bg-white border-gray-300 text-gray-600 hover:border-emerald-500 hover:bg-emerald-50">
                  <UploadCloud className="w-8 h-8 mb-2 text-emerald-600"/>
                  <span className="font-bold text-sm text-gray-900">
                    Click to select Medical Files (PDF/Image)
                  </span>
                  <span className="text-xs font-medium text-gray-400 mt-1">You can select multiple files</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
              </label>

              {medicalFiles.length > 0 && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Selected Files ({medicalFiles.length}):</p>
                  {medicalFiles.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="w-4 h-4 text-emerald-600 mr-3 shrink-0" />
                        <span className="text-sm font-bold text-gray-700 truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition shrink-0 ml-2"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={submitting || uploadingFile} 
              className="w-full bg-[#0a271f] text-white font-bold text-xl py-6 rounded-2xl flex items-center justify-center transition hover:bg-black disabled:opacity-70 shadow-lg"
            >
              {submitting || uploadingFile ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-3" /> 
                  {uploadingFile ? "Uploading Secure Files..." : "Matching Providers..."}
                </>
              ) : (
                "Post My Care Request →"
              )}
            </button>

            {/* BEAUTIFUL SUCCESS MODAL */}
            {success && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 font-serif mb-2">Request Submitted!</h3>
                  <p className="text-gray-500 font-medium mb-6 text-sm">
                    Your care request has been sent to our safety team. It will go live once verified.
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}