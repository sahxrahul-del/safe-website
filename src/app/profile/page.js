"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  User, ShieldCheck, MapPin, HeartPulse, FileText, 
  UploadCloud, Loader2, CheckCircle, AlertCircle,
  GraduationCap, Briefcase, DollarSign, Activity, AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { auth, db, storage } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import ChangePassword from '@/components/ChangePassword';
import { translateFirebaseError } from '@/lib/errorTranslator';

export default function Profile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === 'true';
  const urlRole = searchParams.get('role'); 

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingState, setUploadingState] = useState({}); 
  const [message, setMessage] = useState(null);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', email: '', full_name: '', phone: '', role: urlRole || 'patient', 
    avatar_url: '/default-avatar.png',
    
    // Global Location Fields
    country: '', state: '', city: '', zipCode: '', street: '',
    
    // Nurse Specific
    licenseNumber: '', specialty: '', experience: '', hourlyRate: '', bio: '', cv_url: '',license_url: '',
    education_slc: '', cert_slc_url: '',
    education_plus2: '', cert_plus2_url: '',
    education_bachelor: '', cert_bachelor_url: '',
    
    // Patient Specific
    emergencyName: '', emergencyPhone: '', emergencyRelation: '', 
    careRecipient: 'Self', allergies: '', mobility: '', 
    medications: '', careNeeds: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      
      const isGoogle = user.providerData.some(provider => provider.providerId === 'google.com');
      setIsGoogleLogin(isGoogle);

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        let profile = {};
        if (docSnap.exists()) profile = docSnap.data();

        // Safely extract the nested location object (or default to empty strings)
        const loc = profile.location || {};
        
        setFormData(prev => ({
          ...prev,
          id: user.uid,
          email: user.email,
          avatar_url: profile.avatar_url || (isGoogle ? user.photoURL : '/default-avatar.png'),
          full_name: profile.full_name || (isGoogle ? user.displayName : ''),
          phone: profile.phone || '', 
          role: profile.role || urlRole || 'patient',
          
          // Populate the location fields
          country: loc.country || '', 
          state: loc.state || '', 
          city: loc.city || '', 
          zipCode: loc.zipCode || '', 
          street: loc.street || '',
          
          licenseNumber: profile.licenseNumber || '', specialty: profile.specialty || '',
          experience: profile.experience || '', hourlyRate: profile.hourlyRate || '', 
          bio: profile.bio || '', cv_url: profile.cv_url || '',
          license_url: profile.license_url || '',
          
          education_slc: profile.education_slc || '', cert_slc_url: profile.cert_slc_url || '',
          education_plus2: profile.education_plus2 || '', cert_plus2_url: profile.cert_plus2_url || '',
          education_bachelor: profile.education_bachelor || '', cert_bachelor_url: profile.cert_bachelor_url || '',

          emergencyName: profile.emergencyName || '', emergencyPhone: profile.emergencyPhone || '',
          emergencyRelation: profile.emergencyRelation || '', careRecipient: profile.careRecipient || 'Self',
          allergies: profile.allergies || '', mobility: profile.mobility || '',
          medications: profile.medications || '', careNeeds: profile.careNeeds || ''
        }));

      } catch (error) {
        console.error(error);
      } finally { setLoading(false); }
    });

    return () => unsubscribe();
  }, [router, urlRole]);

  // Standard handler for text fields
  const handleChange = (e) => { 
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
    setMessage(null); 
  };

  // 🚨 NEW: Dedicated handler for phone numbers that strips letters
  const handlePhoneChange = (e) => {
    const { name, value } = e.target;
    // Replace anything that is not a number 0-9 with an empty string
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [name]: onlyNumbers });
    setMessage(null);
  };

  const handleFileUpload = async (e, type, urlField) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingState(prev => ({ ...prev, [type]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${formData.id}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `${type}s/${formData.id}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        null, 
        (error) => { console.error(error); setMessage({ type: 'error', text: `${type} upload failed.`}); setUploadingState(prev => ({ ...prev, [type]: false })); }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, [urlField]: downloadURL }));
          setUploadingState(prev => ({ ...prev, [type]: false }));
        }
      );
    } catch (error) {
       console.error(error);
       setUploadingState(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); 
    setMessage(null);

    // ==========================================
    // 1. PHONE VALIDATION GUARD
    // ==========================================
    if (formData.phone) {
      // Basic check for at least 10 digits (can be modified for international later)
      const phoneRegex = /^\d{10,}$/;
      if (!phoneRegex.test(formData.phone)) {
        setMessage({ type: 'error', text: "Please enter a valid mobile number (at least 10 digits)." });
        setSaving(false);
        return; 
      }
    }

    // ==========================================
    // 2. FIREBASE DATABASE SAVE
    // ==========================================
    try {
      // Destructure out the flat location fields so we don't save them at the root level
      const { country, state, city, zipCode, street, ...restData } = formData;
      
      const payload = { 
        ...restData, 
        // Build the nested, formatted location object
        location: {
          country: country?.toLowerCase().trim() || '',
          state: state?.trim() || '',
          city: city?.toLowerCase().trim() || '',
          zipCode: zipCode?.trim() || '',
          street: street?.trim() || ''
        },
        updated_at: new Date() 
      };
      
      await setDoc(doc(db, 'users', auth.currentUser.uid), payload, { merge: true });
      
      setMessage({ type: 'success', text: "Profile updated successfully!" });
      
      setTimeout(() => {
        router.push(formData.role === 'admin' ? '/admin' : `/dashboard/${formData.role === 'nurse' ? 'nurse' : 'patient'}`);
      }, 1500);

    } catch (error) {
      setMessage({ type: 'error', text: translateFirebaseError(error) });
    } finally {
      setSaving(false);
    } 
  };

  if (loading) {
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
            Securely Loading Profile...
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

  const inputClass = "w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none transition-all bg-gray-50 text-gray-900 font-medium text-sm";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2";
  const cardClass = "bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8";
  
  // ROLE DEFINITIONS
  const isNurse = formData.role === 'nurse';
  const isAdmin = formData.role === 'admin';

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans pb-20 pt-10">
      <main className="max-w-3xl mx-auto px-4 sm:px-6">
        
        <div className="mb-8">
          <button 
            onClick={() => router.push(isAdmin ? '/admin' : `/dashboard/${formData.role === 'nurse' ? 'nurse' : 'patient'}`)} 
            className="inline-flex items-center text-gray-600 hover:text-emerald-800 transition font-bold bg-white px-5 py-2.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to {isAdmin ? 'Admin Panel' : 'Dashboard'}
          </button>
        </div>

        <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900">{isSetup ? "Complete Your Profile" : "Profile Settings"}</h1>
            <p className="text-gray-500 mt-2 font-medium">
              {isAdmin ? "Manage your system administrator details." : (isSetup ? "Let's get your account fully configured to access Safe" : "Manage your personal and professional details.")}
            </p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-8 flex items-start ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-red-50 text-red-900 border border-red-100'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-3 mt-0.5" /> : <AlertCircle className="w-5 h-5 mr-3 mt-0.5" />}
            <span className="font-bold text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* CARD 1: IDENTITY */}
          <div className={cardClass}>
            <div className="flex flex-col sm:flex-row items-center gap-8 border-b border-gray-100 pb-8 mb-8">
              <div className="relative group shrink-0">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg relative">
                      {uploadingState['photo'] ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-emerald-600 w-8 h-8" /></div>
                      ) : (
                          <Image 
                            src={formData.avatar_url} 
                            alt="Profile" 
                            fill 
                            sizes="(max-width: 768px) 100vw, 150px" 
                            className="object-cover" 
                            unoptimized={formData.avatar_url.includes('http')} 
                          />
                      )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition">
                      <UploadCloud className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photo', 'avatar_url')} />
                  </label>
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                  <span className={`text-xs font-bold uppercase tracking-wider inline-flex items-center px-3 py-1 rounded-full mb-3 ${isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-100' : (isNurse ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}`}>
                      {isAdmin ? <ShieldCheck className="w-3 h-3 mr-1.5"/> : (isNurse ? <HeartPulse className="w-3 h-3 mr-1.5"/> : <User className="w-3 h-3 mr-1.5"/>)} 
                      {isAdmin ? 'System Admin' : (isNurse ? 'Care Provider' : 'Patient Account')}
                  </span>
                  <div className="grid grid-cols-1 gap-4">
                      <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className={`${inputClass} text-lg font-bold bg-white border-gray-300`} required placeholder="Full Name" />
                      <input type="email" value={formData.email} className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} disabled placeholder="Account Email" />
                  </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Mobile Number {isAdmin ? '' : '*'}</label>
                  {/* 🚨 UPDATED: Uses handlePhoneChange and maxLength */}
                  <input type="tel" name="phone" value={formData.phone} onChange={handlePhoneChange} maxLength={15} className={inputClass} required={!isAdmin} placeholder="e.g. 9800000000" />
                </div>
            </div>
          </div>

          {/* HIDDEN FOR ADMINS */}
          {!isAdmin && (
            <>
              {/* CARD 2: NEW GLOBAL LOCATION */}
              <div className={cardClass}>
                  <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center"><MapPin className="w-5 h-5 mr-2 text-gray-400" /> Location Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className={labelClass}>Country *</label>
                          <input required name="country" value={formData.country} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Nepal" />
                      </div>
                      <div>
                          <label className={labelClass}>State / Province *</label>
                          <input required name="state" value={formData.state} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Madhesh" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className={labelClass}>City *</label>
                          <input required name="city" value={formData.city} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Janakpur" />
                      </div>
                      <div>
                          <label className={labelClass}>Zip / Postal Code *</label>
                          <input required name="zipCode" value={formData.zipCode} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. 45600" />
                      </div>
                  </div>

                  <div>
                      <label className={labelClass}>Street Address *</label>
                      <input required name="street" value={formData.street} onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Station Road, Ward 1" />
                  </div>
              </div>

              {/* CARD 3: NURSE CREDENTIALS & EDUCATION */}
              {isNurse && (
                  <>
                    <div className={cardClass}>
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center"><Briefcase className="w-5 h-5 mr-2 text-gray-400" /> Professional Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <label className={labelClass}>License / NMC No. *</label>
                              <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Care Specialty *</label>
                              <select name="specialty" value={formData.specialty} onChange={handleChange} className={inputClass} required>
                                  <option value="">Select Specialty</option>
                                  <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                                  <option value="CNA / Caregiver">CNA / Caregiver</option>
                                  <option value="Elderly Care">Elderly Care</option>
                                  <option value="Post-Op Recovery">Post-Op Recovery</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Years of Experience *</label>
                              <input type="number" name="experience" value={formData.experience} onChange={handleChange} className={inputClass} required />
                            </div>
                            <div>
                              <label className={labelClass}>Hourly Rate (NPR) *</label>
                              <input type="number" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} className={inputClass} required />
                            </div>
                        </div>
                        <div>
                          <label className={labelClass}>Professional Bio</label>
                          <textarea name="bio" value={formData.bio} onChange={handleChange} className={`${inputClass} min-h-[100px]`} placeholder="Introduce yourself to families..." />
                        </div>
                    </div>

                    <div className={cardClass}>
                        <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center"><GraduationCap className="w-5 h-5 mr-2 text-gray-400" /> Education & Certificates</h3>
                        
                        <div className="space-y-6">
                          <div className="flex flex-col md:flex-row md:items-end gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex-1">
                              <label className={labelClass}>Schooling / SLC Details</label>
                              <input type="text" name="education_slc" value={formData.education_slc} onChange={handleChange} className={inputClass} placeholder="e.g. Nepal Model School, 2018" />
                            </div>
                            <div className="w-full md:w-auto">
                               <label className={`w-full md:w-auto flex justify-center items-center px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${formData.cert_slc_url ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                  {uploadingState['cert_slc'] ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : (formData.cert_slc_url ? <CheckCircle className="w-4 h-4 mr-2"/> : <UploadCloud className="w-4 h-4 mr-2"/>)}
                                  <span className="text-sm font-bold">{formData.cert_slc_url ? "Uploaded" : "Upload SLC Cert"}</span>
                                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'cert_slc', 'cert_slc_url')} />
                               </label>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-end gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex-1">
                              <label className={labelClass}>+2 / Higher Secondary Details</label>
                              <input type="text" name="education_plus2" value={formData.education_plus2} onChange={handleChange} className={inputClass} placeholder="e.g. Science Board, 2020" />
                            </div>
                            <div className="w-full md:w-auto">
                               <label className={`w-full md:w-auto flex justify-center items-center px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${formData.cert_plus2_url ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                  {uploadingState['cert_plus2'] ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : (formData.cert_plus2_url ? <CheckCircle className="w-4 h-4 mr-2"/> : <UploadCloud className="w-4 h-4 mr-2"/>)}
                                  <span className="text-sm font-bold">{formData.cert_plus2_url ? "Uploaded" : "Upload +2 Cert"}</span>
                                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'cert_plus2', 'cert_plus2_url')} />
                               </label>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-end gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex-1">
                              <label className={labelClass}>Diploma / Bachelor (Nursing)</label>
                              <input type="text" name="education_bachelor" value={formData.education_bachelor} onChange={handleChange} className={inputClass} placeholder="e.g. BSc Nursing, Purbanchal University" />
                            </div>
                            <div className="w-full md:w-auto">
                               <label className={`w-full md:w-auto flex justify-center items-center px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${formData.cert_bachelor_url ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-600 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                  {uploadingState['cert_bachelor'] ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : (formData.cert_bachelor_url ? <CheckCircle className="w-4 h-4 mr-2"/> : <UploadCloud className="w-4 h-4 mr-2"/>)}
                                  <span className="text-sm font-bold">{formData.cert_bachelor_url ? "Uploaded" : "Upload Degree"}</span>
                                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'cert_bachelor', 'cert_bachelor_url')} />
                               </label>
                            </div>
                          </div>
                       
                          <div className="pt-4 border-t border-gray-100">
                             <label className={labelClass}>Complete Professional CV (PDF)</label>
                             <label className={`mt-2 inline-flex items-center px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer transition ${formData.cv_url ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                 {uploadingState['cv'] ? <Loader2 className="w-5 h-5 animate-spin mr-3"/> : (formData.cv_url ? <CheckCircle className="w-5 h-5 mr-3"/> : <FileText className="w-5 h-5 mr-3"/>)}
                                 <span className="font-bold">{formData.cv_url ? "CV Uploaded Successfully" : "Click to upload CV (.pdf)"}</span>
                                 <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'cv', 'cv_url')} />
                             </label>
                          </div>

                          <div className="pt-4 border-t border-gray-100">
                             <label className={labelClass}>Nursing License (PDF)</label>
                             <label className={`mt-2 inline-flex items-center px-6 py-4 border-2 border-dashed rounded-xl cursor-pointer transition ${formData.license_url ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                 {uploadingState['license'] ? <Loader2 className="w-5 h-5 animate-spin mr-3"/> : (formData.license_url ? <CheckCircle className="w-5 h-5 mr-3"/> : <FileText className="w-5 h-5 mr-3"/>)}
                                 <span className="font-bold">{formData.license_url ? "License Uploaded Successfully" : "Click to upload License (.pdf)"}</span>
                                 <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'license', 'license_url')} />
                             </label>
                          </div>
                        </div>
                    </div>
                  </>
              )}

              {/* CARD 4: PATIENT SPECIFIC */}
              {!isNurse && (
                  <div className={cardClass}>
                      <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center"><Activity className="w-5 h-5 mr-2 text-gray-400" /> Medical Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className={labelClass}>Who needs care?</label>
                            <select name="careRecipient" value={formData.careRecipient} onChange={handleChange} className={inputClass}>
                                <option value="Self">Myself</option>
                                <option value="Parent">Parent / Elderly Relative</option>
                                <option value="Child">Child</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClass}>Mobility Status</label>
                            <select name="mobility" value={formData.mobility} onChange={handleChange} className={inputClass}>
                                <option value="Fully Mobile">Fully Mobile</option>
                                <option value="Uses Walker/Cane">Uses Walker / Cane</option>
                                <option value="Wheelchair">Wheelchair</option>
                                <option value="Bedridden">Bedridden</option>
                            </select>
                          </div>
                      </div>
                      <div className="pt-6 border-t border-gray-100">
                          <h4 className="text-sm font-bold text-red-600 mb-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Emergency Contact</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <input type="text" name="emergencyName" value={formData.emergencyName} onChange={handleChange} className={inputClass} placeholder="Name" />
                              <input type="text" name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} className={inputClass} placeholder="Relation" />
                              {/* 🚨 UPDATED: Uses handlePhoneChange and maxLength */}
                              <input type="tel" name="emergencyPhone" value={formData.emergencyPhone} onChange={handlePhoneChange} maxLength={15} className={inputClass} placeholder="Phone" />
                          </div>
                      </div>
                  </div>
              )}
            </>
          )} 

          {/* SUBMIT BUTTON */}
          <div className="pb-10">
            <button type="submit" disabled={saving || Object.values(uploadingState).some(v => v)} className="w-full bg-[#0a271f] text-white font-bold py-4 rounded-xl hover:bg-emerald-900 transition shadow-lg flex justify-center items-center text-lg disabled:opacity-70">
              {saving ? "Saving Profile..." : "Save Changes"}
            </button>
          </div>
        </form>
        
        {/* SECTION: SECURITY & PASSWORD */}
        {!isGoogleLogin && (
          <div className="mt-12 pt-12 border-t border-gray-200">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">Account Security</h2>
              <p className="text-gray-500 mt-2 font-medium">Update your password to keep your account safe.</p>
            </div>
            
            <div className="flex justify-center md:justify-start">
              <ChangePassword />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}