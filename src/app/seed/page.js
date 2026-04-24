"use client";

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Database, Zap } from 'lucide-react';

// --- RANDOM DATA ARRAYS ---
const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
const locations = ["Kathmandu, Ward 1", "Lalitpur", "Bhaktapur", "Pokhara", "Kathmandu, Baneshwor", "Patan", "Kathmandu, Thamel"];
const roles = ["Registered Nurse (RN)", "Licensed Practical Nurse (LPN)", "Certified Caregiver", "Home Health Aide (HHA)", "Physical Therapist"];
const careTypes = ["In-Home Care", "Post-Surgical", "Companionship", "Facility Shift", "Elder Care", "Pediatric Care"];
const specialtiesList = ["Wound Care", "Dementia Support", "Mobility Assistance", "Medication Mgmt", "Post-op Recovery", "Palliative Care"];

// Helper function to get a random item from an array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Helper to get a random number between min and max
const getRandomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function MegaSeeder() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, message]);
  };

  const handleMegaSeed = async () => {
    setLoading(true);
    setLogs([]);
    addLog("🚀 Starting Mega-Seed Process...");

    try {
      // 1. GENERATE 20 NURSES
      addLog("Generating 20 unique Nurse profiles...");
      for (let i = 0; i < 20; i++) {
        // Grab 2 random specialties
        const specs = [getRandom(specialtiesList), getRandom(specialtiesList)];
        
        await addDoc(collection(db, "providers"), {
          firstName: getRandom(firstNames),
          lastName: getRandom(lastNames).charAt(0) + ".", // e.g., "Smith" -> "S."
          role: getRandom(roles),
          experience: getRandomNum(1, 15),
          rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1), // Random rating 4.0 to 5.0
          reviews: getRandomNum(5, 120),
          hourlyRate: getRandomNum(800, 2500), // NPR pricing
          location: getRandom(locations),
          specialties: [...new Set(specs)], // Removes duplicates
          availableToday: Math.random() > 0.5, // 50% chance of being available
          verified: true,
          // This API generates a random human face placeholder!
          avatarUrl: `https://i.pravatar.cc/150?u=${Math.random()}`, 
          createdAt: serverTimestamp()
        });
      }
      addLog("✅ 20 Nurses successfully added!");

      // 2. GENERATE 15 CARE REQUESTS
      addLog("Generating 15 active Care Requests...");
      for (let i = 0; i < 15; i++) {
        const statuses = ["searching", "searching", "matched", "completed"]; // Weighted towards searching
        
        await addDoc(collection(db, "care_requests"), {
          careType: getRandom(careTypes),
          roleNeeded: getRandom(roles),
          location: getRandom(locations),
          urgency: getRandom(["Flexible", "This Week", "Urgent"]),
          details: "This is an auto-generated test case from the Mega-Seeder script.",
          status: getRandom(statuses),
          createdAt: serverTimestamp()
        });
      }
      addLog("✅ 15 Care Requests successfully added!");
      addLog("🎉 MEGA-SEED COMPLETE! Go check your dashboard.");

    } catch (error) {
      console.error(error);
      addLog("❌ ERROR: Something went wrong. Check console.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-black mb-2 text-gray-900">The Mega-Seeder</h1>
        <p className="text-gray-500 mb-8 font-medium">This will instantly inject 20 Providers and 15 Care Requests into your live Firestore database.</p>
        
        <button 
          onClick={handleMegaSeed}
          disabled={loading}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-xl transition flex justify-center items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Database className="w-6 h-6 mr-3"/>}
          {loading ? "Injecting Data..." : "Run Mega-Seed"}
        </button>

        {/* LOG TERMINAL */}
        {logs.length > 0 && (
          <div className="mt-8 bg-gray-900 text-green-400 p-6 rounded-xl text-left text-sm font-mono h-48 overflow-y-auto shadow-inner">
            {logs.map((log, index) => (
              <p key={index} className="mb-2">{`> ${log}`}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}