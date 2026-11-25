import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Ancien chemin de la modération (avant son entrée dans le menu du hub).
    return [
      { source: "/espace-bureau/actualites/moderation", destination: "/espace-bureau/moderation", permanent: true },
      { source: "/espace-bureau/actualites/moderation/:id", destination: "/espace-bureau/moderation/:id", permanent: true },
    ];
  },
};

export default nextConfig;
