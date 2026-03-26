import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "羽田空港 渋滞情報 リアルタイム | 首都高・湾岸線 | KAIROX Traffic",
  description:
    "羽田空港から都心・横浜方面の渋滞情報をリアルタイム確認。首都高速湾岸線・1号羽田線・国道15号の混雑状況。平日朝夕ラッシュ・週末の渋滞傾向も解説。",
  keywords: [
    "羽田空港 渋滞", "羽田空港 渋滞 今日", "首都高 渋滞", "羽田空港 渋滞 リアルタイム",
    "羽田 都心 渋滞", "湾岸線 渋滞", "1号羽田線 渋滞", "羽田空港 混雑",
  ],
  alternates: { canonical: "https://kairox.jp/traffic/haneda" },
  openGraph: {
    title: "羽田空港 リアルタイム渋滞情報 | KAIROX Traffic",
    description: "首都高湾岸線・1号羽田線・国道15号の渋滞状況をリアルタイム表示。",
    url: "https://kairox.jp/traffic/haneda",
    siteName: "KAIROX",
    type: "website",
  },
};

export default function HanedaTrafficLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
