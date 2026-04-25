"use client";

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // NEW: State for toggling password visibility
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

  const toggleVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters.");
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user is logged in.");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess("Your password has been successfully updated!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (err) {
      console.error(err);
      setError(err.code === 'auth/wrong-password' ? "Current password is incorrect." : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const inputContainerClass = "relative";
  const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-emerald-500 font-medium text-gray-900";
  const eyeIconClass = "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition cursor-pointer";

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold">{success}</div>}

      <form onSubmit={handleChangePassword} className="space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
          <div className={inputContainerClass}>
            <input
              type={showPassword.current ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
            />
            <button type="button" onClick={() => toggleVisibility('current')} className={eyeIconClass}>
              {showPassword.current ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
          <div className={inputContainerClass}>
            <input
              type={showPassword.new ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              required
            />
            <button type="button" onClick={() => toggleVisibility('new')} className={eyeIconClass}>
              {showPassword.new ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
          <div className={inputContainerClass}>
            <input
              type={showPassword.confirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
            />
            <button type="button" onClick={() => toggleVisibility('confirm')} className={eyeIconClass}>
              {showPassword.confirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[#0a271f] text-white py-4 rounded-xl font-bold hover:bg-emerald-800 transition disabled:opacity-70 mt-2">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}