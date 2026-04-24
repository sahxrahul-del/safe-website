"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Star, MapPin, ShieldCheck, Clock, 
  Award, FileText, CalendarCheck, MessageCircle, CheckCircle, Loader2
} from 'lucide-react';

export default function NurseProfile() {
  const router = useRouter();
  const params = useParams(); 
  
  const [bookingState, setBookingState] = useState('idle');
  const [mockNurseData, setMockNurseData] = useState(null);

  // FETCH SPECIFIC NURSE FROM FIREBASE
  useEffect(() => {
    const fetchNurse = async () => {
      const docRef = doc(db, "providers", params.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // We shape the Firebase data to match your existing HTML variables!
        setMockNurseData({
          id: docSnap.id,
          name: `${data.firstName} ${data.lastName}`,
          role: data.role,
          rate: data.hourlyRate,
          rating: data.rating,
          reviews: data.reviews,
          location: data.location,
          avatar: '/default-avatar.png', // Placeholder until you add photo uploads
          bio: `Hi, I'm ${data.firstName}. I specialize in ${data.specialties?.[0] || 'patient care'}.`,
          experience: `${data.experience} Years`,
          education: [{ degree: 'Verified License', school: 'Safe Home Approved', year: 'Active' }],
          isAvailable: data.availableToday
        });
      }
    };
    fetchNurse();
  }, [params.id]);

  if (!mockNurseData) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>;
  const handleBooking = () => {
    setBookingState('loading');
    
    setTimeout(() => {
      setBookingState('success');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#fdfcf9] font-sans pb-20">
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        
        {/* Floating Back Button (Replaces the Navbar) */}
        <button 
          onClick={() => router.back()} 
          className="mb-6 flex items-center text-sm font-bold text-gray-400 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Matches
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN: Profile Details */}
          <div className="lg:w-2/3 space-y-8">
             
             {/* Hero Profile Card */}
             <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-emerald-900 to-[#0a271f] left-0"></div>
                
                <div className="relative mt-8 sm:mt-10 shrink-0">
                   <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                      <Image src={mockNurseData.avatar} alt={mockNurseData.name} width={128} height={128} className="object-cover" />
                   </div>
                   <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-2 border-white shadow-sm" title="Online & Available"></div>
                </div>

                <div className="mt-4 sm:mt-16 text-center sm:text-left flex-1">
                   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                      <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center justify-center sm:justify-start">
                           {mockNurseData.name} <ShieldCheck className="w-6 h-6 text-blue-500 ml-2" title="Background Checked" />
                        </h1>
                        <p className="text-emerald-700 font-bold mt-1">{mockNurseData.role}</p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end">
                         <p className="text-2xl font-black text-gray-900">Rs. {mockNurseData.rate}</p>
                         <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Per Hour</p>
                      </div>
                   </div>

                   <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm font-medium text-gray-600">
                      <p className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-gray-400"/> {mockNurseData.location}</p>
                      <p className="flex items-center"><Clock className="w-4 h-4 mr-1 text-gray-400"/> {mockNurseData.experience} Exp.</p>
                      <p className="flex items-center text-amber-600 font-bold"><Star className="w-4 h-4 mr-1 fill-current"/> {mockNurseData.rating} ({mockNurseData.reviews} Reviews)</p>
                   </div>
                </div>
             </div>

             {/* About Section */}
             <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-4">About Me</h2>
                <p className="text-gray-600 leading-relaxed">{mockNurseData.bio}</p>
             </div>

             {/* Education & Credentials */}
             <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-6">Credentials & Education</h2>
                <div className="space-y-6">
                   {mockNurseData.education.map((edu, idx) => (
                     <div key={idx} className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                           <Award className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                           <p className="font-bold text-gray-900">{edu.degree}</p>
                           <p className="text-sm text-gray-500">{edu.school} • Graduated {edu.year}</p>
                        </div>
                     </div>
                   ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
                   <FileText className="w-5 h-5 text-gray-400" />
                   <p className="text-sm font-bold text-gray-900 underline cursor-pointer hover:text-emerald-600">View Verified CV & License Document</p>
                </div>
             </div>

          </div>

          {/* RIGHT COLUMN: Sticky Booking Widget */}
          <div className="lg:w-1/3">
             <div className="bg-white rounded-3xl border border-gray-100 shadow-xl sticky top-8 overflow-hidden">
                
                {/* Header */}
                <div className="bg-[#0a271f] p-6 text-white">
                   <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider mb-1">Direct Booking</p>
                   <h3 className="text-2xl font-black">Hire {mockNurseData.name.split(' ')[0]}</h3>
                </div>

                <div className="p-6">
                   <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                      <span className="text-gray-500 font-bold">Standard Rate</span>
                      <span className="text-xl font-black text-gray-900">Rs. {mockNurseData.rate}<span className="text-sm text-gray-500 font-medium">/hr</span></span>
                   </div>

                   <ul className="space-y-3 mb-8 text-sm font-medium text-gray-600">
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-3 text-emerald-500"/> Background Checked</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-3 text-emerald-500"/> Verified Medical License</li>
                      <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-3 text-emerald-500"/> Responds within 1 hour</li>
                   </ul>

                   {/* DYNAMIC BUTTON STATES */}
                   {bookingState === 'idle' && (
                     <button 
                       onClick={handleBooking}
                       className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition flex justify-center items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                     >
                       <CalendarCheck className="w-5 h-5 mr-2" /> Send Care Request
                     </button>
                   )}

                   {bookingState === 'loading' && (
                     <button disabled className="w-full py-4 bg-gray-100 text-gray-500 font-black rounded-xl flex justify-center items-center">
                       <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Pinging Provider...
                     </button>
                   )}

                   {bookingState === 'success' && (
                     <div className="space-y-3 animate-in fade-in duration-500">
                       <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded-xl flex justify-center items-center">
                         <CheckCircle className="w-5 h-5 mr-2" /> Request Sent!
                       </div>
                       
                       {/* THE HIDDEN MESSAGE BUTTON REVEALED */}
                       <button className="w-full py-4 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-black rounded-xl transition flex justify-center items-center shadow-sm">
                         <MessageCircle className="w-5 h-5 mr-2" /> Message {mockNurseData.name.split(' ')[0]}
                       </button>
                     </div>
                   )}

                   {bookingState === 'idle' && (
                     <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-4">
                        You won't be charged yet
                     </p>
                   )}
                </div>

             </div>
          </div>

        </div>
      </main>
    </div>
  );
}