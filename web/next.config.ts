import type { NextConfig } from "next";

/** Separate distDir for build/start so `next build` never clobbers a running `next dev` .next. */
const distDir = process.env.NEXT_DIST_DIR || ".next";

const nextConfig: NextConfig = {
  distDir,
  transpilePackages: [
    "@near-wallet-selector/core",
    "@near-wallet-selector/modal-ui",
    "@near-wallet-selector/react-hook",
    "@near-wallet-selector/my-near-wallet",
    "@near-wallet-selector/meteor-wallet",
    "@near-wallet-selector/here-wallet",
    "@near-wallet-selector/hot-wallet",
    "@near-wallet-selector/intear-wallet",
    "@near-wallet-selector/near-mobile-wallet",
    "@near-wallet-selector/sender",
    "@near-wallet-selector/nightly",
    "@near-wallet-selector/ledger",
    "@near-wallet-selector/wallet-utils",
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
