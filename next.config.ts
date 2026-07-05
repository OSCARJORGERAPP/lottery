import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Requerido por el job `build` del CI de la academia (Dockerfile standalone)
  output: "standalone",
};

export default nextConfig;
