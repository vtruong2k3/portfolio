import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Transpile three.js and R3F packages (required for App Router / RSC compat)
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default withNextIntl(nextConfig);
