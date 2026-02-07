/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/icon.svg', permanent: false },
      { source: '/favicon.png', destination: '/icon.svg', permanent: false },
    ];
  },
};

module.exports = nextConfig;



