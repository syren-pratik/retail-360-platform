/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Ensure cache JSON files written by generators are bundled into serverless functions
  outputFileTracingIncludes: {
    '/api/**': ['./cache/**'],
  },
};

export default nextConfig;
