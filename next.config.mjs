/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Allows Firebase Storage images
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Allows Google Login profile pictures
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc', // Allows our Mega-Seeder fake placeholder faces
      }
    ],
  },
};

export default nextConfig;