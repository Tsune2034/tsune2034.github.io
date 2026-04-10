import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KAIROX — Japan Luggage Freedom | 手ぶら旅",
  description:
    "成田空港・新千歳空港から手ぶら旅。AIが最適ルートで荷物をホテルへ届ける急行配送サービス。4言語対応。Luggage delivery from Narita & Chitose Airport.",
  openGraph: {
    title: "KAIROX — Japan Luggage Freedom",
    description: "成田・北海道 手ぶら旅。荷物を先にホテルへ届ける急行配送サービス。",
    url: "https://kairox.jp/lp",
    siteName: "KAIROX",
    type: "website",
    images: [{ url: "/lp/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KAIROX — Japan Luggage Freedom",
    description: "成田・北海道 手ぶら旅。荷物を先にホテルへ届ける急行配送サービス。",
  },
};

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
