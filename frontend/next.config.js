/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NiiVue and WASM-based decoders need these headers relaxed off for local dev;
  // keep this app local-only (no external deployment).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
