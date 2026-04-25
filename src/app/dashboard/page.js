"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function DashboardMasterRouter() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // .toLowerCase() fixes the case sensitivity bug!
          const userRole = docSnap.data().role?.toLowerCase() || '';

          if (userRole === 'nurse' || userRole === 'provider') {
            router.push('/dashboard/nurse');
          } else {
            router.push('/dashboard/patient');
          }
        } else {
          router.push('/setup-profile');
        }
      } catch (error) {
        console.error("Routing error:", error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcf9]">
      <Loader2 className="animate-spin text-emerald-700 w-10 h-10" />
      <span className="ml-3 text-emerald-700 font-bold">Verifying role...</span>
    </div>
  );
}