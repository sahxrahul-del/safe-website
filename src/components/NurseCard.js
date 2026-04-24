export default function NurseCard({ name, specialty, rate, rating, reviews }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="w-20 h-20 bg-emerald-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-gray-600 shadow-sm">
        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-2xl">{name[0]}</span>
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h3>
      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-2 uppercase tracking-wider">{specialty}</p>
      
      <div className="flex items-center gap-1 mb-4">
        <div className="text-yellow-400 text-sm tracking-tighter">★★★★★</div>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 ml-1">{rating}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">({reviews})</span>
      </div>

      <p className="text-gray-600 dark:text-gray-300 font-semibold mb-6">Rs. {rate} <span className="text-sm font-normal text-gray-400">/ hr</span></p>
      
      <button className="w-full bg-[#0a271f] dark:bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-800 dark:hover:bg-emerald-500 transition-colors shadow-md">
        View Profile
      </button>
    </div>
  );
}