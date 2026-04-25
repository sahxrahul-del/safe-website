import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer"; 

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning 
        className="bg-[#fdfcf9] antialiased min-h-screen flex flex-col"
      >
        <Navbar />
         
       <div className="flex-grow flex flex-col">
          {children}
        </div>
      
        <Footer /> 
        
      </body>
    </html>
  );
}