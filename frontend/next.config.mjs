/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export: emits an `out/` directory that any web server (e.g.
  // the gateway nginx) can serve. All pages must be prerenderable.
  output: "export",
  images: {
    // `next/image` optimization requires a running Node.js runtime; disable
    // it for the static export so URLs pass through unchanged.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "randomuser.me" },
    ],
  },
};

export default nextConfig;
