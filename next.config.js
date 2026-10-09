/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: '/hard', destination: '/training', permanent: true }];
  },
};

module.exports = nextConfig;
