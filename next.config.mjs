/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // upload de imagens (produtos/barbeiros) no Supabase Storage
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
