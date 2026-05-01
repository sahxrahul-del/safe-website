"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, MapPin, Loader2, User, HeartPulse, Briefcase } from 'lucide-react';
import { auth, db, googleProvider } from '../../lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Signup() {
  const router = useRouter();

  // 🚨 The Master Toggle State (Defaults to patient)
  const [userType, setUserType] = useState('patient'); 
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Updated initial state with the new 5-tier location fields
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', phone: '', 
    country: '', state: '', city: '', zipCode: '', street: '',
    licenseNumber: '', specialty: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  // ==========================================
  // GOOGLE SIGNUP
  // ==========================================
  const handleGoogleLogin = async () => {
    setErrorMessage(''); setPopupBlocked(false); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const userRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
          await setDoc(userRef, {
            email: result.user.email,
            full_name: result.user.displayName,
            avatar_url: result.user.photoURL,
            role: userType, 
            accountStatus: userType === 'nurse' ? 'pending' : 'approved',
            isVerified: false,
            // Initialize empty location object to maintain DB schema consistency
            location: { country: '', state: '', city: '', zipCode: '', street: '' },
            created_at: serverTimestamp()
          });
        }

        document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
        document.cookie = `userRole=${userType}; path=/; max-age=604800; SameSite=Lax; Secure`;
        window.location.href = `/dashboard/${userType === 'nurse' ? 'nurse' : 'patient'}`;
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        setPopupBlocked(true);
      } else {
        setErrorMessage(error.message);
      }
      setLoading(false);
    }
  };

  // ==========================================
  // EMAIL SIGNUP
  // ==========================================
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match."); setLoading(false); return;
    }
    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters."); setLoading(false); return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Write database record instantly with structured location object
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: formData.email,
        full_name: formData.fullName,
        phone: formData.phone,
        
        // The new 5-tier location object (lowercase country/city for perfect querying)
        location: {
          country: formData.country.toLowerCase().trim(),
          state: formData.state.trim(),
          city: formData.city.toLowerCase().trim(),
          zipCode: formData.zipCode.trim(),
          street: formData.street.trim()
        },

        role: userType,
        // Save these ONLY if they are a nurse
        licenseNumber: userType === 'nurse' ? formData.licenseNumber : null,
        specialty: userType === 'nurse' ? formData.specialty : null,
        
        accountStatus: userType === 'nurse' ? 'pending' : 'approved',
        isVerified: false,
        created_at: serverTimestamp()
      });

      await sendEmailVerification(userCred.user);
      await auth.signOut();
      setShowVerification(true);
    } catch (error) {
       setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";
  const inputClass = "w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-400";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="max-w-2xl mx-auto mt-8 px-4 sm:px-6">
        
        {!showVerification && (
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center text-gray-500 hover:text-emerald-900 transition font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Link>
          </div>
        )}

        {showVerification ? (
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 text-center animate-in zoom-in-95 duration-300">
            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Check your Email</h2>
            <p className="text-gray-500 mb-8 text-lg">We've sent a secure verification link to <br/><span className="font-bold text-gray-900">{formData.email}</span></p>
            <Link href="/login" className="w-full block bg-[#0a271f] text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-900 transition shadow-lg">I have verified my email →</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0a271f]">Join Safe Home</h1>
              <p className="text-gray-500 mt-3 text-lg">Select your account type to get started</p>
            </div>

            {/* THE MASTER TOGGLE */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setUserType('patient')} 
                className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${userType === 'patient' ? 'border-emerald-600 bg-emerald-50/50 shadow-md' : 'border-white bg-white shadow-sm hover:border-gray-200'}`}
              >
                <div className={`p-3 rounded-full mb-3 ${userType === 'patient' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  <User className="w-6 h-6" />
                </div>
                <span className={`font-bold ${userType === 'patient' ? 'text-emerald-900' : 'text-gray-500'}`}>Family / Patient</span>
                {userType === 'patient' && <div className="absolute top-3 right-3 text-emerald-600"><CheckCircle className="w-5 h-5 fill-current" /></div>}
              </button>

              <button 
                onClick={() => setUserType('nurse')} 
                className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${userType === 'nurse' ? 'border-emerald-600 bg-emerald-50/50 shadow-md' : 'border-white bg-white shadow-sm hover:border-gray-200'}`}
              >
                <div className={`p-3 rounded-full mb-3 ${userType === 'nurse' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className={`font-bold ${userType === 'nurse' ? 'text-emerald-900' : 'text-gray-500'}`}>Care Provider</span>
                {userType === 'nurse' && <div className="absolute top-3 right-3 text-emerald-600"><CheckCircle className="w-5 h-5 fill-current" /></div>}
              </button>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
              <button onClick={handleGoogleLogin} className="w-full mb-4 flex items-center justify-center gap-3 border border-gray-300 py-3.5 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" /> Sign up with Google
              </button>

              {popupBlocked && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start mb-6">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium leading-tight">Popup blocked. Please disable your adblocker or use email.</p>
                </div>
              )}

              <div className="relative mb-8 mt-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">Or continue with email</span></div>
              </div>

              {errorMessage && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-start text-sm font-medium">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />{errorMessage}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-6">
                
                {/* 🚨 DYNAMIC FORM FIELDS (Only shows if Nurse is selected) */}
                {userType === 'nurse' && (
                  <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-emerald-900 flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>License Number *</label>
                            <input required name="licenseNumber" onChange={handleChange} type="text" className={inputClass} placeholder="NMC Number" />
                        </div>
                        <div>
                            <label className={labelClass}>Care Specialty *</label>
                            <select required name="specialty" onChange={handleChange} className={inputClass}>
                                <option value="">Select Specialty</option>
                                <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                                <option value="CNA / Caregiver">CNA / Caregiver</option>
                                <option value="Elderly Care">Elderly Care</option>
                                <option value="Post-Op Recovery">Post-Op Recovery</option>
                            </select>
                        </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Full Name *</label><input required name="fullName" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Ram Bahadur" /></div>
                    <div><label className={labelClass}>Phone *</label><input required name="phone" onChange={handleChange} type="tel" className={inputClass} placeholder="e.g. 9800000000" /></div>
                </div>

                {/* THE NEW GLOBAL LOCATION SYSTEM */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-800 flex items-center mb-4 text-sm uppercase tracking-wider"><MapPin className="w-4 h-4 mr-2 text-emerald-600"/> Your Location</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={labelClass}>Country *</label>
                            <input required name="country" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Nepal" />
                        </div>
                        <div>
                            <label className={labelClass}>State / Province *</label>
                            <input required name="state" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Madhesh" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={labelClass}>City *</label>
                            <input required name="city" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Janakpur" />
                        </div>
                        <div>
                            <label className={labelClass}>Zip / Postal Code *</label>
                            <input required name="zipCode" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. 45600" />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Street Address *</label>
                        <input required name="street" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. Station Road, Ward 1" />
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div><label className={labelClass}>Email Address *</label><input required name="email" onChange={handleChange} type="email" className={inputClass} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Password *</label>
                            <div className="relative"><input required name="password" onChange={handleChange} type={showPassword ? "text" : "password"} className={`${inputClass} pr-10`} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                        </div>
                        <div><label className={labelClass}>Confirm Password *</label><input required name="confirmPassword" onChange={handleChange} type="password" className={inputClass} /></div>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-4 rounded-xl font-bold hover:bg-emerald-900 transition shadow-lg flex justify-center items-center text-lg">{loading ? <Loader2 className="animate-spin mr-2" /> : 'Create Account'}</button>
              </form>
              <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">Already have an account? <Link href="/login" className="text-emerald-700 font-bold hover:underline">Sign In</Link></p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}