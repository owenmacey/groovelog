/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "ioredis", "bullmq", "postgres"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.spotifycdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "coverartarchive.org",
        pathname: "/**",
      },
    ],
  },
  transpilePackages: ["@groovelog/api", "@groovelog/db", "@groovelog/validators"],
};

module.exports = nextConfig;
