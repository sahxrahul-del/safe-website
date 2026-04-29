export default function robots() {
  return {
    rules: {
      userAgent: '*', // The '*' means this applies to ALL bots (Google, Bing, etc.)
      allow: '/',     // They are allowed to see the homepage and public routes
      disallow: [
        '/admin/',          // 🛑 Blocks the entire admin section
        '/dashboard/',      // 🛑 Blocks all patient and provider dashboards
        '/profile/',        // 🛑 Blocks profile setup pages
        '/api/'             // 🛑 Blocks backend API routes
      ],
    },
    // Point the bots to your sitemap so they know exactly where to go!
    sitemap: 'https://www.usesafe.com/sitemap.xml', 
  }
}