"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { auth, db, googleProvider } from '../../lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);

  // ==========================================
  // GOOGLE LOGIN 
  // ==========================================
  const handleGoogleLogin = async () => {
    setErrorMessage(''); setPopupBlocked(false); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        const userDocRef = doc(db, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let safeRole = 'patient'; // Default fallback

        // If they bypass signup and log straight in with Google
        if (!userDocSnap.exists()) {
           await setDoc(userDocRef, {
            email: result.user.email, full_name: result.user.displayName, avatar_url: result.user.photoURL,
            role: 'patient', accountStatus: 'approved', isVerified: false, created_at: serverTimestamp()
          });
        } else {
           safeRole = userDocSnap.data().role || 'patient';
        }

        document.cookie = `userRole=${safeRole}; path=/; max-age=604800; SameSite=Lax; Secure`;
        document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
        window.location.href = safeRole === 'admin' ? '/admin' : `/dashboard/${safeRole === 'nurse' ? 'nurse' : 'patient'}`;
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
  // EMAIL LOGIN
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage(''); setResendMessage(''); setNeedsVerification(false);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      if (!result.user.emailVerified) {
        await auth.signOut(); 
        setErrorMessage("Please verify your email address. Check your inbox for the link.");
        setNeedsVerification(true); 
        setLoading(false);
        return; 
      }
      
      const userDocSnap = await getDoc(doc(db, "users", result.user.uid));
      const safeRole = userDocSnap.exists() ? (userDocSnap.data().role || 'patient') : 'patient';

      document.cookie = `userRole=${safeRole}; path=/; max-age=604800; SameSite=Lax; Secure`;
      document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
      window.location.href = safeRole === 'admin' ? '/admin' : `/dashboard/${safeRole === 'nurse' ? 'nurse' : 'patient'}`;
      
    } catch (error) {
      setErrorMessage("Invalid credentials. Please check your email and password.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true); setErrorMessage(''); setResendMessage('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      await auth.signOut();
      setResendMessage("A new verification link has been sent to your email!");
      setNeedsVerification(false); 
    } catch (error) {
      setErrorMessage("Failed to resend the email.");
    } finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none transition-all bg-gray-50 text-gray-900";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
          <Image src="/login-background.jpg" alt="Login Background" fill sizes="(max-width: 1024px) 100vw, 50vw" priority className="z-0 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a271f]/80 to-emerald-900/80 z-10" />
          <div className="absolute top-[10%] left-[5%] text-[200px] font-serif z-5 text-emerald-300 opacity-20 pointer-events-none select-none">Safe</div>
          <div className="relative z-20 text-white p-12 text-center max-w-lg">
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight leading-tight">Welcome back <br/> to Safe</h2>
            <p className="text-lg text-emerald-100 font-medium">Connecting families with Nepal's most trusted, verified healthcare professionals.</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sign In</h1>
              <p className="text-gray-500 mt-2">Enter your details to access your account.</p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex flex-col items-start">
                <div className="flex items-center"><AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" /><p className="text-sm text-red-700 font-medium">{errorMessage}</p></div>
                {needsVerification && <button onClick={handleResendVerification} disabled={loading} className="mt-3 ml-8 text-sm font-bold text-red-700 underline hover:text-red-900 transition">{loading ? "Sending..." : "Resend Verification Email"}</button>}
              </div>
            )}
            {resendMessage && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-md flex items-start"><CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" /><p className="text-sm text-emerald-700 font-medium">{resendMessage}</p></div>
            )}

            <div className="space-y-4">
              <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700 disabled:opacity-50">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" /> Continue with Google
              </button>

              {popupBlocked && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start mt-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium leading-tight">Popup blocked. Please disable your adblocker or use email below.</p>
                </div>
              )}

              <div className="relative mt-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">or sign in with email</span></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required /></div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <Link href="/forgot-password"><span className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">Forgot password?</span></Link>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-3.5 rounded-lg font-bold hover:bg-emerald-900 transition-all flex justify-center items-center shadow-md">{loading ? <Loader2 className="animate-spin mr-2" /> : 'Sign In'}</button>
              </form>
            </div>
            <p className="text-center text-gray-600 text-sm">Don't have an account? <Link href="/signup" className="text-emerald-700 font-bold hover:underline">Create an account</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}