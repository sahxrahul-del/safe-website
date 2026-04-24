"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
// IMPORTING FIREBASE:
import { db } from '@/lib/firebase'; // <-- Make sure this path matches your setup!
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PostCareRequest() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    careType: 'In-Home Care',
    roleNeeded: 'Registered Nurse (RN)',
    location: '',
    urgency: 'This Week',
    details: ''
  });

  const careTypes = ['In-Home Care', 'Post-Surgical', 'Companionship', 'Facility Shift'];
  const urgencies = [
    { label: 'Flexible', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { label: 'This Week', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { label: 'Urgent', color: 'bg-red-50 text-red-700 hover:bg-red-100' }
  ];

  // THE REAL FIREBASE SUBMIT FUNCTION:
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // This sends the data to your Firestore Database!
      await addDoc(collection(db, "care_requests"), {
        ...formData,
        status: "searching", // We add a status to track the booking phase
        createdAt: serverTimestamp(), // Google automatically stamps the exact time
      });

      setSubmitting(false);
      setSuccess(true);
      
      // Route them to matches
      setTimeout(() => {
        router.push('/dashboard/patient');
      }, 2500);

    } catch (error) {
      console.error("Error posting case: ", error);
      alert("Failed to post request. Check your database connection.");
      setSubmitting(false);
    }
  };

  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3";
  const inputClass = "w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-600 outline-none transition-all bg-[#fbfaf8] text-gray-900 font-medium text-base";

  // SUCCESS STATE
  if (success) {
    return (
      <div className="min-h-screen bg-[#fdfcf9] flex flex-col items-center justify-center p-6">
        <div className="text-center animate-in zoom-in duration-500">
          <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 font-serif mb-4">Case Posted!</h2>
          <p className="text-lg text-gray-500 font-medium mb-10">Routing you to your perfect matches...</p>
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans flex justify-center items-center py-12 px-6">
      
      {/* WIDE DESKTOP CONTAINER */}
      <div className="max-w-6xl w-full bg-white rounded-[3rem] shadow-sm border border-gray-100 p-8 lg:p-16 flex flex-col lg:flex-row gap-12 lg:gap-24 relative">
        
        {/* Back Button */}
        <button onClick={() => router.back()} className="absolute top-8 left-8 lg:top-12 lg:left-12 flex items-center text-gray-400 hover:text-gray-900 transition font-bold text-sm">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </button>

        {/* LEFT COLUMN */}
        <div className="lg:w-5/12 flex flex-col justify-between mt-12 lg:mt-8">
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">New Care Request</p>
            <h1 className="text-5xl lg:text-6xl font-serif text-gray-900 leading-[1.1] mb-6">
              What kind of <br/>care do you <span className="text-emerald-600 italic">need?</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed">
              Describe your need and we'll instantly match you with verified, available professionals in your neighborhood.
            </p>
          </div>
        </div> 

        {/* RIGHT COLUMN */}
        <div className="lg:w-7/12">
          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* CARE TYPE */}
            <div>
              <label className={labelClass}>Care Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {careTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, careType: type})}
                    className={`py-4 px-6 rounded-2xl text-base font-bold transition-all text-left ${
                      formData.careType === type 
                        ? 'bg-[#0a271f] text-white shadow-md' 
                        : 'bg-[#fbfaf8] text-gray-700 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* ROLE & LOCATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Professional Role Needed</label>
                <select 
                  value={formData.roleNeeded} 
                  onChange={(e) => setFormData({...formData, roleNeeded: e.target.value})}
                  className={inputClass}
                >
                  <option value="Registered Nurse (RN)">Registered Nurse (RN)</option>
                  <option value="Licensed Practical Nurse (LPN)">Licensed Practical Nurse (LPN)</option>
                  <option value="Certified Caregiver">Certified Caregiver</option>
                  <option value="Physical Therapist">Physical Therapist</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input 
                  type="text" 
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className={inputClass} 
                  placeholder="e.g. Kathmandu, Ward 4" 
                />
              </div>
            </div>

            {/* URGENCY */}
            <div>
              <label className={labelClass}>Urgency</label>
              <div className="flex flex-col sm:flex-row gap-4">
                {urgencies.map(urgency => (
                  <button
                    key={urgency.label}
                    type="button"
                    onClick={() => setFormData({...formData, urgency: urgency.label})}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all border ${
                      formData.urgency === urgency.label 
                        ? `${urgency.color} border-transparent shadow-sm ring-2 ring-offset-2 ring-${urgency.color.split('-')[1]}-200` 
                        : 'bg-[#fbfaf8] text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DETAILS */}
            <div>
              <label className={labelClass}>Details</label>
              <textarea 
                required
                value={formData.details}
                onChange={(e) => setFormData({...formData, details: e.target.value})}
                className={`${inputClass} min-h-[140px] resize-none`} 
                placeholder="Post-op care for mom after hip replacement. Need overnight coverage for 3-5 days..." 
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full bg-[#0a271f] text-white font-bold text-xl py-6 rounded-2xl flex items-center justify-center transition hover:bg-black disabled:opacity-70 shadow-lg"
            >
              {submitting ? <Loader2 className="w-7 h-7 animate-spin" /> : "Find My Match →"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}