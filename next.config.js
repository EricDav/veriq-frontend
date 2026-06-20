/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "cdn.veriq.ng" },
      { protocol: "https", hostname: "upload.logistecx.online" },
      { protocol: "https", hostname: "veriqproperty.com" },
      { protocol: "https", hostname: "www.veriqproperty.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

module.exports = nextConfig;
