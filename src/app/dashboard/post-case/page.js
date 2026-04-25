"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader2, UploadCloud, FileText } from 'lucide-react';

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
  
  // NEW: State for tracking the upload progress of multiple files
  const [uploadingFile, setUploadingFile] = useState(false); 
  const [medicalFiles, setMedicalFiles] = useState([]); // Array to hold actual File objects

  const [formData, setFormData] = useState({
    careType: 'In-Home Care',
    roleNeeded: 'Registered Nurse (RN)',
    location: '',
    urgency: 'This Week',
    details: ''
    // Removed single medical_url from here, we will handle it in the submit function!
  });

  const careTypes = ['In-Home Care', 'Post-Surgical', 'Companionship', 'Facility Shift'];
  const urgencies = [
    { label: 'Flexible', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { label: 'This Week', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { label: 'Urgent', color: 'bg-red-50 text-red-700 hover:bg-red-100' }
  ];

  // 1. SECURELY GET THE LOGGED-IN PATIENT
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserData({ id: user.uid, ...docSnap.data() });
        }
        setPageLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. CAPTURE MULTIPLE FILES (Without uploading yet)
  const handleFileChange = (e) => {
    if (e.target.files) {
      // Convert the FileList object into a standard JavaScript Array
      const selectedFiles = Array.from(e.target.files);
      setMedicalFiles(selectedFiles);
    }
  };

  // 3. THE REAL FIREBASE SUBMIT FUNCTION (Now handles array of uploads)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let uploadedUrls = [];

      // If they selected files, upload them all first
      if (medicalFiles.length > 0) {
        setUploadingFile(true); // Changes button text to "Uploading Files..."
        
        // Promise.all uploads all files in the array simultaneously for speed
        uploadedUrls = await Promise.all(
          medicalFiles.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            // Added index to filename to ensure unique names if uploaded at the exact same millisecond
            const fileName = `medical_${userData.id}_${Date.now()}_${index}.${fileExt}`;
            const storageRef = ref(storage, `medical_records/${fileName}`);
            
            await uploadBytesResumable(storageRef, file);
            return await getDownloadURL(storageRef);
          })
        );
        
        setUploadingFile(false);
      }

      // Now create the main document and attach the array of URLs
      await addDoc(collection(db, "care_requests"), {
        ...formData,
        patientId: userData.id, 
        patientName: userData.name || userData.full_name || "Patient",
        patientPhoto: userData.photoURL || userData.avatar_url || "",
        medical_urls: uploadedUrls, // NEW: Saves the array of URLs to the database!
        status: "searching", 
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

  // LOADING STATE
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  // SUCCESS STATE
  if (success) {
    return (
      <div className="min-h-screen bg-[#fdfcf9] flex flex-col items-center justify-center p-6">
        <div className="text-center animate-in zoom-in duration-500">
          <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 font-serif mb-4">Case Posted!</h2>
          <p className="text-lg text-gray-500 font-medium mb-10">Routing you to your perfect matches...</p>
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
        </div>
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
              Describe your need and attach any relevant medical documents. We'll instantly match you with verified professionals.
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div>
                <label className={labelClass}>Location</label>
                <input 
                  type="text" 
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={inputClass} 
                  placeholder="e.g. Kathmandu, Ward 4" 
                />
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

            {/* UPGRADED: MULTIPLE MEDICAL FILE UPLOAD */}
            <div className="pt-4 border-t border-gray-100">
              <label className={labelClass}>Medical Documents / Prescriptions (Optional)</label>
              <label className={`mt-2 inline-flex w-full items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl cursor-pointer transition ${medicalFiles.length > 0 ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <UploadCloud className="w-6 h-6 mr-3 text-emerald-600"/>
                  <span className="font-bold text-sm">
                    {medicalFiles.length > 0 ? `${medicalFiles.length} file(s) selected (Click to change)` : "Click to select Medical Files (PDF/Image)"}
                  </span>
                  {/* Notice the 'multiple' attribute here! */}
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
              </label>

              {/* Display the names of the files they just selected */}
              {medicalFiles.length > 0 && (
                <div className="mt-4 space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Selected Files:</p>
                  {medicalFiles.map((file, index) => (
                    <p key={index} className="text-sm font-bold text-emerald-700 flex items-center">
                      <FileText className="w-4 h-4 mr-2" /> {file.name}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* DYNAMIC BUTTON TEXT based on upload state */}
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

          </form>
        </div>
      </div>
    </div>
  );
}