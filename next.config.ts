import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  htmlLimitedBots: /.*/,
  skipTrailingSlashRedirect: true,
  experimental: { globalNotFound: true },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/media/**", search: "?crop=portrait" },
    ],
  },
  outputFileTracingIncludes: {
    "/og/[locale]/[kind]/[file]": ["./assets/fonts/og/*.ttf"],
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin/:path*", headers: noindex },
      { source: "/api/:path*", headers: noindex },
      { source: "/md/:path*", headers: noindex },
      {
        source: "/((?!_next/|api/|admin/|media/|og/|md/).*)",
        headers: [{ key: "Link", value: '</llms.txt>; rel="describedby"; type="text/plain"' }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
