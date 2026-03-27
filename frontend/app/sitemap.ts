import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kairox.jp";
  const now = new Date();
  return [
    { url: `${base}/narita`,         lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/traffic`,        lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
    { url: `${base}/traffic/narita`, lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/traffic/haneda`, lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
  ];
}
