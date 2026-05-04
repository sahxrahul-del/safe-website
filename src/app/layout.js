import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; 
import CustomCursor from "@/components/CustomCursor";
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: "Safe",
  description: "Verified Professionals. Right when you need them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning 
        className="bg-[#fdfcf9] antialiased min-h-screen flex flex-col"
      >
        <CustomCursor />
        <Navbar />

        {/* 🚨 THE FIX: Changed 'flex-grow' to 'flex-1 w-full' */}
        <main className="flex-1 flex flex-col w-full relative">
          {children}
        </main>

        <Footer /> 
        <Analytics />
      </body>
    </html>
  );
}