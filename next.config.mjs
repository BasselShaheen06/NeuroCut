/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. (TypeScript will still catch real bugs!)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;