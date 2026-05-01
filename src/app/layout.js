import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; 
import CustomCursor from "@/components/CustomCursor";

export const metadata = {
  title: "Safe Home",
  description: "Verified Professionals. Right when you need them.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning 
        className="bg-[#fdfcf9] antialiased min-h-screen flex flex-col"
      >
        {/* The green dot that follows the mouse */}
        <CustomCursor />

        {/* Global Navigation */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col">
          {children}
        </main>

        {/* Global Footer */}
        <Footer /> 
      </body>
    </html>
  );
}