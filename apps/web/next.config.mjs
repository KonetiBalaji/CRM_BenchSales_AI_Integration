/** @type {import(''next'').NextConfig} */
const enableStandalone = process.env.NEXT_ENABLE_STANDALONE !== "false" && process.platform !== "win32";

const nextConfig = enableStandalone
  ? {
      output: "standalone"
    }
  : {};

export default nextConfig;