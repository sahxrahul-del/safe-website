/** @type {import('next').Config} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' }, // For default avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // For Google Login photos
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' } // For Firebase uploads
    ],
  },
};

export default nextConfig;