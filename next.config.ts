import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "zlib-sync", "discord.js", "@discordjs/ws"],
};

export default nextConfig;
