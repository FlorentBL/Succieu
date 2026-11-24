import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Anciennes URL de la modération (liens des alertes déjà envoyées).
    return [
      { source: "/espace-bureau/moderation", destination: "/espace-bureau/actualites/moderation", permanent: true },
      { source: "/espace-bureau/moderation/:id", destination: "/espace-bureau/actualites/moderation/:id", permanent: true },
    ];
  },
};

export default nextConfig;
