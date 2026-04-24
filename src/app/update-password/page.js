"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { confirmPasswordReset } from 'firebase/auth';

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode'); // Firebase uses this secret code from the URL

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(null);

    if (!oobCode) {
        setMessage({ type: 'error', text: "Invalid or missing reset code. Please request a new link." });
        setLoading(false); return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match." });
      setLoading(false); return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: "Password must be at least 6 characters." });
      setLoading(false); return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setMessage({ type: 'success', text: "Password updated successfully! Redirecting to login..." });
      setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: "Reset failed. The link may have expired." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <main className="max-w-md mx-auto mt-10 px-6">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-[#0a271f]" />
            </div>
            <h1 className="text-2xl font-extrabold text-center text-gray-900 mb-2">Set New Password</h1>
            <p className="text-gray-600 text-center mb-8 text-sm font-medium">Please create a new password for your account.</p>

            {message && (
              <div className={`p-4 rounded-lg mb-6 flex flex-col items-start ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                <div className="flex items-center">
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none text-gray-900 font-medium" required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-800 transition">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Confirm Password</label>
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none text-gray-900 font-medium" required 
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-3 rounded-lg font-bold hover:bg-emerald-900 transition flex justify-center items-center disabled:opacity-70 mt-6">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Update Password'}
                </button>
            </form>
        </div>
      </main>
    </div>
  );
}

export default function UpdatePassword() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-900 w-10 h-10"/></div>}>
            <UpdatePasswordContent />
        </Suspense>
    );
}