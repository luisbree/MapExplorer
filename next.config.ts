import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add experimental flags
  experimental: {
    // This option allows requests from specified origins during development.
    // It's a security measure to prevent cross-site request forgery.
    // We're adding a wildcard to allow any subdomain from cloudworkstations.dev.
    allowedDevOrigins: ["*.cloudworkstations.dev"],

    // This option excludes specified packages from the server-side bundle.
    // It's necessary for packages like 'handlebars' that use unsupported Node.js APIs.
    serverComponentsExternalPackages: ['@google/earthengine', 'handlebars'],
  },
};

export default nextConfig;
