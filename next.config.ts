import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, reactStrictMode: true, outputFileTracingIncludes: { '/api/narrator': ['./public/narrator/**/*'], '/api/sfx':['./public/sfx/**/*'] } };
export default config;
