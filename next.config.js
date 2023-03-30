/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    SEARCH_RELAYS: "",
    REGULAR_RELAYS: "",
  },
};

module.exports = nextConfig;
