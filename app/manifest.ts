import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mood DJ",
    short_name: "Mood DJ",
    description: "Describe a vibe. Get the perfect playlist.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#1DB954",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        // Padded variant: Android's circular mask would clip the full-bleed art.
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
