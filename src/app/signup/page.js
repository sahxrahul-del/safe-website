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
  
  // Strictly read the role from the URL. No more toggle state!
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

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push(`/profile?setup=true&role=${role}`);
    } catch (error) {
      setErrorMessage(error.message);
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
await sendEmailVerification(userCredential.user);
// Force redirect to profile to complete setup
router.push(`/profile?setup=true&role=${role}`);
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
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100 text-center">
            <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Check your Email</h2>
            <p className="text-gray-500 mb-8 text-lg">
              We've sent a secure verification link to <br/><span className="font-bold text-gray-900">{formData.email}</span>
            </p>
            <p className="text-sm text-gray-400 mb-8">Please click the link in your email to activate your account.</p>
            <Link href="/login" className="w-full block bg-[#0a271f] text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-900 transition shadow-lg">
                I have verified my email -
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0a271f]">
                Join Safe as a <span className="font-serif italic font-normal text-emerald-600">
                  {role === 'nurse' ? 'Care Provider' : 'Patient'}
                </span>
              </h1>
              <p className="text-gray-500 mt-3 text-lg">Create your account to get started</p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
              <button onClick={handleGoogleLogin} className="w-full mb-8 flex items-center justify-center gap-3 border border-gray-300 py-3.5 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" />
                Sign up with Google
              </button>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">Or continue with email</span></div>
              </div>

              {errorMessage && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg flex items-start text-sm font-medium">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-6">
                
                {/* Dynamically render nurse fields ONLY if role is nurse */}
                {role === 'nurse' && (
                  <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-4">
                    <h3 className="font-bold text-emerald-900 flex items-center"><HeartPulse className="w-4 h-4 mr-2"/> Professional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>License Number <span className="text-red-500">*</span></label>
                            <input required name="licenseNumber" onChange={handleChange} type="text" className={inputClass} placeholder="e.g. RN12345" />
                        </div>
                        <div>
                            <label className={labelClass}>Care Specialty <span className="text-red-500">*</span></label>
                            <select required name="specialty" onChange={handleChange} className={inputClass}>
                                <option value="">Select Specialty</option>
                                <option value="Registered Nurse">Registered Nurse (RN)</option>
                                <option value="Caregiver">CNA / Caregiver</option>
                                <option value="Elderly Care">Elderly Care</option>
                                <option value="Post-Op">Post-Op Recovery</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                        <input required name="fullName" onChange={handleChange} type="text" className={inputClass} placeholder="Ram Sharma" />
                    </div>
                    <div>
                        <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                        <input required name="phone" onChange={handleChange} type="tel" className={inputClass} placeholder="9800000000" />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>City / Location <span className="text-red-500">*</span></label>
                    <input required name="location" onChange={handleChange} type="text" className={inputClass} placeholder="Kathmandu, Nepal" />
                </div>

                <div className="space-y-4 pt-2">
                    <div>
                        <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                        <input required name="email" onChange={handleChange} type="email" className={inputClass} placeholder="you@example.com" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input required name="password" onChange={handleChange} type={showPassword ? "text" : "password"} className={`${inputClass} pr-10`} placeholder="Min 6 chars" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Confirm Password <span className="text-red-500">*</span></label>
                            <input required name="confirmPassword" onChange={handleChange} type="password" className={inputClass} placeholder="Re-type password" />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-4 rounded-xl font-bold hover:bg-emerald-900 transition shadow-lg hover:shadow-xl disabled:opacity-70 text-lg flex items-center justify-center">
                   {loading ? <Loader2 className="animate-spin mr-2" /> : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                  Already have an account? <Link href={`/login?role=${role}`} className="text-emerald-700 font-bold hover:underline">Sign In</Link>
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}