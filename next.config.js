const { withGTConfig } = require("gt-next/config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

module.exports = withGTConfig(nextConfig);