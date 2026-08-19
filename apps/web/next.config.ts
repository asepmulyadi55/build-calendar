import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Legal pages are authored as MDX so they can be edited without touching JSX
  // (P1-US-103).
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // The web container is capped at 400 MB (RQ-MEM-06). A standalone build keeps
  // the runtime image small enough for that to be comfortable.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  // Prisma must not be bundled into server components; it loads native engines.
  serverExternalPackages: ['@prisma/client'],

  // `calendar-core` writes its internal imports with `.js` extensions so the
  // renderer can compile the same source and run it under Node, which requires
  // explicit extensions (ESM). TypeScript and Vitest resolve those back to `.ts`
  // on their own; webpack does not, so it is told to.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },

  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mdx', '.json'],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
