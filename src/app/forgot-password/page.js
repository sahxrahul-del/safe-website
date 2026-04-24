"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Firebase natively handles the secure token generation and emailing
      await sendPasswordResetEmail(auth, email);
      setMessage({
        type: 'success',
        text: 'Password reset link sent! Check your email.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to send reset email. Please ensure the email is correct.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <main className="max-w-md mx-auto mt-10 px-6">
        <Link href="/login" className="flex items-center text-gray-600 mb-6 hover:text-gray-900 transition font-bold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#0a271f]" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Forgot Password?</h1>
            <p className="text-gray-600 mb-8 text-sm font-medium">
                No worries, we'll send you reset instructions.
            </p>

            {message && (
              <div className={`p-4 rounded-lg mb-6 flex items-start text-left ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />}
                <span className="text-sm font-bold">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
                <div className="text-left">
                    <label className="block text-sm font-bold text-gray-900 mb-1">Email Address</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none text-gray-900 placeholder-gray-500 font-medium"
                        required 
                    />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-3 rounded-lg font-bold hover:bg-emerald-900 transition flex justify-center items-center disabled:opacity-70 mt-6">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Link'}
                </button>
            </form>
        </div>
      </main>
    </div>
  );
}