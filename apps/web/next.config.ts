import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The web container is capped at 400 MB (RQ-MEM-06). A standalone build keeps
  // the runtime image small enough for that to be comfortable.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // Prisma must not be bundled into server components; it loads native engines.
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
