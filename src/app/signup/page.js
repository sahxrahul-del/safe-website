"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, AlertCircle, CheckCircle, Eye, EyeOff, Loader2, HeartPulse } from 'lucide-react';
import { auth, googleProvider } from '../../lib/firebase';
import { createUserWithEmailAndPassword, signInWithPopup, sendEmailVerification } from 'firebase/auth';

export default function Signup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') === 'nurse' ? 'nurse' : 'patient';

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', phone: '', location: '',
    licenseNumber: '', specialty: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  // ==========================================
  // GOOGLE SIGNUP (POPUP METHOD)
  // ==========================================
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result && result.user) {
        document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
        document.cookie = `userRole=${role}; path=/; max-age=604800; SameSite=Lax; Secure`;
        window.location.href = `/profile?setup=true&role=${role}`;
      }
    } catch (error) {
      console.error("Google Signup Error:", error);
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

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
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 🚨 REMOVED: Do not set cookies here for Email/Password!
      
      // 1. Send the email
      await sendEmailVerification(userCredential.user);
      
      // 2. 🚨 KICK THEM OUT: Force them to log in properly later
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Processing...</p>
        </div>
      </div>
    );
  }

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
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Check your Email</h2>
            <p className="text-gray-500 mb-8 text-lg">We've sent a secure verification link to <br/><span className="font-bold text-gray-900">{formData.email}</span></p>
            <Link href={`/login?role=${role}`} className="w-full block bg-[#0a271f] text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-900 transition shadow-lg">I have verified my email →</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0a271f]">Join Safe as a <span className="font-serif italic font-normal text-emerald-600">{role === 'nurse' ? 'Care Provider' : 'Patient'}</span></h1>
              <p className="text-gray-500 mt-3 text-lg">Create your account to get started</p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
              <button onClick={handleGoogleLogin} className="w-full mb-8 flex items-center justify-center gap-3 border border-gray-300 py-3.5 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" /> Sign up with Google
              </button>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">Or continue with email</span></div>
              </div>

              {errorMessage && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-start text-sm font-medium">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />{errorMessage}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-6">
                {role === 'nurse' && (
                  <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-4">
                    <h3 className="font-bold text-emerald-900 flex items-center"><HeartPulse className="w-4 h-4 mr-2"/> Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>License Number *</label><input required name="licenseNumber" onChange={handleChange} type="text" className={inputClass} /></div>
                        <div><label className={labelClass}>Care Specialty *</label><select required name="specialty" onChange={handleChange} className={inputClass}><option value="">Select Specialty</option><option value="Registered Nurse">Registered Nurse (RN)</option><option value="Caregiver">CNA / Caregiver</option><option value="Other">Other</option></select></div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Full Name *</label><input required name="fullName" onChange={handleChange} type="text" className={inputClass} /></div>
                    <div><label className={labelClass}>Phone *</label><input required name="phone" onChange={handleChange} type="tel" className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>City / Location *</label><input required name="location" onChange={handleChange} type="text" className={inputClass} /></div>
                <div className="space-y-4 pt-2">
                    <div><label className={labelClass}>Email Address *</label><input required name="email" onChange={handleChange} type="email" className={inputClass} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className={labelClass}>Password *</label>
                            <div className="relative"><input required name="password" onChange={handleChange} type={showPassword ? "text" : "password"} className={`${inputClass} pr-10`} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                        </div>
                        <div><label className={labelClass}>Confirm Password *</label><input required name="confirmPassword" onChange={handleChange} type="password" className={inputClass} /></div>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-4 rounded-xl font-bold hover:bg-emerald-900 transition shadow-lg hover:shadow-xl flex items-center justify-center">{loading ? <Loader2 className="animate-spin mr-2" /> : 'Create Account'}</button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}