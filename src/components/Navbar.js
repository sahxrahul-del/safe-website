"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Menu, X, Bell, UserCircle, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Authentication & Role State
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null); 
  
  // UI State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [notifications, setNotifications] = useState([]);

  // 1. LISTEN FOR AUTH & ROLE
  useEffect(() => {
    // 🚨 1. Declare the cleanup variable
    let unsubNotifications = () => {};

    // 🚨 2. The magic silencer
    const handleSilentError = (error) => {
      if (error.code === 'permission-denied') return;
      console.error("Navbar listener error:", error);
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.photoURL) setAvatarUrl(currentUser.photoURL);

        // Fetch User Database Role & Photo
        const pDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (pDoc.exists()) {
          const data = pDoc.data();
          setUserData(data);
          
          if (data.photoURL || data.avatar_url) {
            setAvatarUrl(data.photoURL || data.avatar_url);
          }

          // 2. LISTEN FOR YOUTUBE-STYLE NOTIFICATIONS
          const role = data.role?.toLowerCase();
          
          // 🚨 3. Assign to unsubNotifications AND add handleSilentError
          if (role === 'patient' || role === 'family') {
            const q = query(collection(db, "care_requests"), where("patientId", "==", currentUser.uid), where("status", "==", "matched"));
            unsubNotifications = onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))), handleSilentError);
          } else {
            const q = query(collection(db, "care_requests"), where("targetNurseId", "==", currentUser.uid), where("status", "==", "direct_request"));
            unsubNotifications = onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))), handleSilentError);
          }
        }
      } else {
        // 🚨 4. Kill the listener immediately on logout
        unsubNotifications(); 
        setUser(null);
        setUserData(null);
        setAvatarUrl(null);
        setNotifications([]);
      }
    });

    // 🚨 5. Final React cleanup
    return () => {
      unsubscribe();
      unsubNotifications();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      // 🚨 DESTROY THE COOKIES 🚨
      document.cookie = "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Lax";
      document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Lax";

      window.location.href = '/';
      
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleDropdown = (menu) => {
    setActiveDropdown(activeDropdown === menu ? null : menu);
  };

  const logoLink = !user ? '/' : (userData?.role?.toLowerCase() === 'patient' || userData?.role?.toLowerCase() === 'family' ? '/dashboard/patient' : '/dashboard/nurse');

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 w-full">
      <div className="w-full px-4 md:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* LEFT: BRAND LOGO */}
          <div className="flex items-center shrink-0">
            <Link href={logoLink} className="text-2xl font-black text-emerald-700 font-serif tracking-tight">
              Safe
            </Link>
          </div>

          {/* RIGHT/CENTER: DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-6">
            
            {/* --- GUEST VIEW (NOT LOGGED IN) --- */}
            {!user && (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-gray-600 hover:text-emerald-700 font-bold transition px-4 py-2">
                  Log In
                </Link>
                <Link href="/signup" className="bg-[#0a271f] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition shadow-sm text-sm">
                  Sign Up
                </Link>
              </div>
            )}

            {/* --- LOGGED IN VIEW --- */}
            {user && userData && (
              <>
                <Link href={logoLink} className={`text-sm font-bold transition mr-2 ${pathname.includes('dashboard') ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-900'}`}>
                  Dashboard
                </Link>

                {/* PATIENT ONLY: Post Request Button */}
                {(userData.role?.toLowerCase() === 'patient' || userData.role?.toLowerCase() === 'family') && (
                  <Link href="/dashboard/post-case" className="px-5 py-2.5 bg-[#0a271f] text-white font-bold rounded-xl hover:bg-black transition shadow-sm text-sm">
                    Post Request
                  </Link>
                )}
                
                {/* YOUTUBE-STYLE NOTIFICATION BELL */}
                <div className="relative">
                  <button onClick={() => toggleDropdown('notifications')} className="relative p-2 text-gray-400 hover:text-emerald-600 bg-gray-50 rounded-full transition">
                    <Bell className="w-5 h-5" />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                    )}
                  </button>

                  {activeDropdown === 'notifications' && (
                    <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-gray-900 text-sm">Notifications</h3>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md uppercase tracking-widest">{notifications.length} New</span>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm font-medium">You're all caught up!</div>
                        ) : (
                          notifications.map(notif => (
                            <Link
                              key={notif.id}
                              href={userData?.role?.toLowerCase() === 'patient' || userData?.role?.toLowerCase() === 'family' ? '/dashboard/patient' : `/cases/${notif.id}`}
                              onClick={() => setActiveDropdown(null)}
                              className="block px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-0 transition group"
                            >
                              <p className="text-sm font-black text-gray-900 mb-1 group-hover:text-emerald-700 transition">
                                {userData?.role?.toLowerCase() === 'patient' || userData?.role?.toLowerCase() === 'family' ? 'Provider Matched! 🎉' : 'New Direct Request!'}
                              </p>
                              <p className="text-xs text-gray-500 truncate font-medium">
                                {userData?.role?.toLowerCase() === 'patient' || userData?.role?.toLowerCase() === 'family' ? `${notif.nurseName} accepted your case.` : `${notif.patientName} invited you to a case.`}
                              </p>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* USER AVATAR MENU */}
                <div className="relative pl-2 border-l border-gray-100">
                  <button onClick={() => toggleDropdown('user')} className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden text-emerald-700 font-bold">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        (userData.name || userData.full_name || "U").charAt(0)
                      )}
                    </div>
                  </button>

                  {activeDropdown === 'user' && (
                    <div className="absolute right-0 top-full mt-4 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-black text-gray-900 truncate">{userData.name || userData.full_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{userData.role}</p>
                      </div>
                      <Link href="/profile" onClick={() => setActiveDropdown(null)} className="flex items-center px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                        <UserCircle className="w-4 h-4 mr-2 text-gray-400" /> Edit Profile
                      </Link>
                        <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition text-left">
                        <LogOut className="w-4 h-4 mr-2" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>

              </>
            )}
          </div>

          {/* MOBILE HAMBURGER ICON */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-gray-500 hover:text-emerald-700 p-2">
              {isMobileOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 shadow-xl absolute w-full animate-in slide-in-from-top-2">
          <div className="px-4 pt-2 pb-6 space-y-1">
            
            {!user ? (
              <div className="flex flex-col gap-2 mt-4">
                <Link href="/login" onClick={() => setIsMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-gray-900 hover:bg-gray-50 rounded-xl text-center border border-gray-200">
                  Log In
                </Link>
                <Link href="/signup" onClick={() => setIsMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-white bg-[#0a271f] hover:bg-black rounded-xl text-center shadow-md">
                  Sign Up
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center p-4 mb-4 bg-gray-50 rounded-xl mt-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mr-3 overflow-hidden shadow-sm border-2 border-white">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover"/> : (userData?.name || "U").charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{userData?.name || userData?.full_name}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{userData?.role}</p>
                  </div>
                </div>
                
                <Link href={logoLink} onClick={() => setIsMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-gray-900 hover:bg-gray-50 rounded-xl">Dashboard</Link>
                
                {(userData.role?.toLowerCase() === 'patient' || userData.role?.toLowerCase() === 'family') && (
                  <Link href="/dashboard/post-case" onClick={() => setIsMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl">Post New Request</Link>
                )}

                <Link href="/profile" onClick={() => setIsMobileOpen(false)} className="block px-4 py-3 text-base font-bold text-gray-900 hover:bg-gray-50 rounded-xl">Edit Profile</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-base font-bold text-red-600 hover:bg-red-50 rounded-xl">Sign Out</button>
              </>
            )}

          </div>
        </div>
      )}
    </nav>
  );
}