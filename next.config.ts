import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // The seller valuation landing page is a self-contained static file in
      // public/sell/. Next will not serve public/<dir>/index.html at a clean
      // URL on its own, so map /sell (and the ad-friendly /valuation alias)
      // onto it. Keeping it as one file means the page has no build step and
      // can be edited or replaced without touching the app.
      { source: "/sell", destination: "/sell/index.html" },
      { source: "/valuation", destination: "/sell/index.html" },
    ];
  },
};

export default nextConfig;
