"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { auth, db, googleProvider } from '../../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // ==========================================
  // GOOGLE LOGIN (POPUP METHOD)
  // ==========================================
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result && result.user) {
        const userDocRef = doc(db, "users", result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Set Strict Cookies
          document.cookie = `userRole=${userData.role}; path=/; max-age=604800; SameSite=Lax; Secure`;
          document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
          
          // Hard Redirect
          window.location.href = userData.role === 'admin' ? '/admin' : `/dashboard/${userData.role === 'nurse' ? 'nurse' : 'patient'}`;
        } else {
          document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
          window.location.href = `/profile?setup=true&role=${roleParam || 'patient'}`;
        }
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      setErrorMessage(error.message);
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
      
      // 🚨 THE Email BOUNCER 🚨
      if (!result.user.emailVerified) {
        await auth.signOut(); // Kick them back out
        setErrorMessage("Please verify your email address. Check your inbox for the link.");
        setNeedsVerification(true); // <-- Trigger the Resend UI
        setLoading(false);
        return; // Stop the login process right here
      }
      
      // If they ARE verified, continue as normal...
      const userDocSnap = await getDoc(doc(db, "users", result.user.uid));

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        document.cookie = `userRole=${userData.role}; path=/; max-age=604800; SameSite=Lax; Secure`;
        document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
        window.location.href = userData.role === 'admin' ? '/admin' : `/dashboard/${userData.role === 'nurse' ? 'nurse' : 'patient'}`;
      } else {
        document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax; Secure`;
        window.location.href = `/profile?setup=true&role=${roleParam || 'patient'}`;
      }
    } catch (error) {
      setErrorMessage("Invalid credentials. Please check your email and password.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setErrorMessage('');
    setResendMessage('');

    try {
      // 1. Secretly log them in using the credentials already in the form
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Send the new link
      await sendEmailVerification(result.user);
      
      // 3. Immediately log them back out
      await auth.signOut();
      
      setResendMessage("A new verification link has been sent to your email!");
      setNeedsVerification(false); // Hide the button after sending
    } catch (error) {
      setErrorMessage("Failed to resend the email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-gray-900";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* LEFT SIDE: BRANDING */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
          <Image src="/login-background.jpg" alt="Login Background" fill sizes="(max-width: 1024px) 100vw, 50vw" priority={true} className="z-0 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a271f]/80 to-emerald-900/80 z-10" />
          <div className="absolute top-[10%] left-[5%] text-[200px] font-serif z-5 text-emerald-300 opacity-20 pointer-events-none select-none">Safe.</div>
          <div className="relative z-20 text-white p-12 text-center max-w-lg">
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight leading-tight">Welcome back <br/> to Safe.</h2>
            <p className="text-lg text-emerald-100 font-medium">Connecting families with Nepal's most trusted, verified healthcare professionals.</p>
          </div>
        </div>

        {/* RIGHT SIDE: FORM */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Sign In</h1>
              <p className="text-gray-500 mt-2">Enter your details to access your account.</p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex flex-col items-start">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                </div>
                
                {/* THE RESEND BUTTON */}
                {needsVerification && (
                  <button 
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="mt-3 ml-8 text-sm font-bold text-red-700 underline hover:text-red-900 transition"
                  >
                    {loading ? "Sending..." : "Resend Verification Email"}
                  </button>
                )}
              </div>
            )}

            {/* SUCCESS MESSAGE AFTER RESENDING */}
            {resendMessage && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-md flex items-start">
                <CheckCircle className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">{resendMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700 disabled:opacity-50">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" />
                {loading ? "Processing..." : "Continue with Google"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">or sign in with email</span></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@example.com" required />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <Link href="/forgot-password"><span className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer">Forgot password?</span></Link>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-3.5 rounded-lg font-bold hover:bg-emerald-900 transition-all flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md">
                  {loading ? <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Signing in...</> : 'Sign In'}
                </button>
              </form>
            </div>
            <p className="text-center text-gray-600 text-sm">
              Don't have an account? <Link href={`/signup${roleParam ? `?role=${roleParam}` : ''}`} className="text-emerald-700 font-bold hover:underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}