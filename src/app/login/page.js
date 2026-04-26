//login
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, db, googleProvider } from '../../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role'); // Checks if they clicked "For Nurses" in Navbar

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

const handleGoogleLogin = async () => {
    setErrorMessage('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // CHECK DATABASE: Does this Google account already have a profile?
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      
      if (userDocSnap.exists()) {        
        const userData = userDocSnap.data();
        
        // 🚨 NEW: SET COOKIES FOR MIDDLEWARE 🚨
        document.cookie = `userRole=${userData.role}; path=/; max-age=${60 * 60 * 24 * 7};`;
        document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7};`;

        // SMART ROUTING BASED ON ROLE
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'nurse' || userData.role === 'provider') {
          router.push('/dashboard/nurse');
        } else {
          router.push('/dashboard/patient');
        }
      } else {
        router.push(`/profile?setup=true&role=${roleParam || 'patient'}`);
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      setErrorMessage(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // CHECK DATABASE for Email users too!
      const userDocRef = doc(db, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // 🚨 NEW: SET COOKIES FOR MIDDLEWARE 🚨
        document.cookie = `userRole=${userData.role}; path=/; max-age=${60 * 60 * 24 * 7};`;
        document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7};`;

        // SMART ROUTING BASED ON ROLE
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'nurse' || userData.role === 'provider') {
          router.push('/dashboard/nurse');
        } else {
          router.push('/dashboard/patient');
        }
      } else {
        router.push(`/profile?setup=true&role=${roleParam || 'patient'}`);
      }
    } catch (error) {
      console.error("Actual Login Error:", error);
      setErrorMessage("Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };
    
  const inputClass = "w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white text-gray-900";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* --- LEFT SIDE: BRANDING with Watermark Logo --- */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
          
          {/* 1. REPLACE THIS URL with your image path (e.g., "/login-bg.jpg") */}
          <Image 
            src="/login-background.jpg" 
            alt="Login Background" 
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={true}
            className="z-0 object-cover"
          />
          
          {/* 2. Gradient Overlay for Text Readability (Optional, adjusting opacity for visibility) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a271f]/80 to-emerald-900/80 z-10" />
          
          {/* 3. --- LARGE WATERMARK LOGO (Dynamic placement/size) --- */}
          <div className="absolute top-[10%] left-[5%] text-[200px] font-serif z-5 text-emerald-300 opacity-20 pointer-events-none select-none">
            Safe.
          </div>

          {/* 4. Text Content (Above everything else) */}
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
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-gray-700">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" width={20} height={20} alt="Google" className="w-5 h-5" />
                Continue with Google
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