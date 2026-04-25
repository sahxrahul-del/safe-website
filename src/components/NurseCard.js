import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';

// Added default values in the parameters just in case they are undefined!
export default function NurseCard({ 
  id, 
  name = "Verified Provider", 
  specialty = "Care Professional", 
  rate = "Negotiable", 
  rating = "New", 
  reviews = 0,
  location = "Nepal",
  photo = null
}) {
  
  // Safely get the first initial. If name is somehow still empty, default to "P"
  const initial = name ? name.charAt(0).toUpperCase() : "P";

  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow relative overflow-hidden group">
      
      {/* Avatar / Photo */}
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm overflow-hidden text-emerald-700 font-extrabold text-2xl z-10 shrink-0">
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      
      {/* Name & Specialty */}
      <h3 className="text-xl font-black text-gray-900 mb-1 z-10 truncate w-full px-2">{name}</h3>
      <p className="text-emerald-600 font-bold text-sm mb-4 z-10 truncate w-full">{specialty}</p>
      
      {/* Stats Grid */}
      <div className="w-full grid grid-cols-2 gap-2 mb-6 border-t border-gray-50 pt-4 z-10">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rate</p>
          <p className="font-black text-gray-900">Rs. {rate}<span className="text-xs text-gray-500 font-medium">/hr</span></p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rating</p>
          <p className="font-black text-gray-900 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 mr-1" /> {rating} 
            <span className="text-xs text-gray-500 font-medium ml-1">({reviews})</span>
          </p>
        </div>
      </div>
      
      {/* Location */}
      <div className="w-full flex items-center justify-center text-xs font-bold text-gray-500 mb-6 bg-gray-50 py-2 rounded-lg z-10">
        <MapPin className="w-3.5 h-3.5 mr-1" /> {location}
      </div>

      {/* Action Button */}
      <Link 
        href={id ? `/nurses/${id}` : `/find-providers`} 
        className="w-full bg-[#fdfcf9] border-2 border-gray-100 text-gray-900 py-3 rounded-xl font-bold hover:border-emerald-600 hover:text-emerald-700 transition z-10"
      >
        View Profile
      </Link>
      
      {/* Decorative hover background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-50/50 opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
    </div>
  );
}