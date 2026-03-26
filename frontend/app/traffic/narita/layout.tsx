import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "成田空港 渋滞情報 リアルタイム | 東関東道・国道51号 | KAIROX Traffic",
  description:
    "成田空港から都心・横浜・千葉方面の渋滞情報をリアルタイム確認。東関東自動車道、京葉道路、国道51号・357号の混雑状況。平日朝夕ラッシュ・週末の渋滞傾向も解説。",
  keywords: [
    "成田空港 渋滞", "成田空港 渋滞 今日", "東関東道 渋滞", "成田空港 渋滞 リアルタイム",
    "成田 都心 渋滞", "国道51号 渋滞", "京葉道路 渋滞", "成田空港 混雑",
  ],
  alternates: { canonical: "https://kairox.jp/traffic/narita" },
  openGraph: {
    title: "成田空港 リアルタイム渋滞情報 | KAIROX Traffic",
    description: "東関東道・京葉道路・国道51号の渋滞状況をリアルタイム表示。",
    url: "https://kairox.jp/traffic/narita",
    siteName: "KAIROX",
    type: "website",
  },
};

export default function NaritaTrafficLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
