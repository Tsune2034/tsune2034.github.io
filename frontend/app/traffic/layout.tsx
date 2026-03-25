import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "成田空港・羽田空港 リアルタイム渋滞情報 | KAIROX Traffic",
  description:
    "成田空港・羽田空港発着の主要ルート（東関東道・首都高・国道357号）をリアルタイム渋滞情報で確認。実配送GPSデータとGoogleトラフィックを組み合わせた関東エリアの交通状況マップ。",
  keywords: [
    "成田空港 渋滞", "羽田空港 渋滞", "東関東道 渋滞", "首都高 渋滞",
    "成田空港 渋滞 今日", "羽田空港 渋滞 リアルタイム", "空港 ルート 渋滞",
    "関東 交通情報", "KAIROX"
  ],
  openGraph: {
    title: "成田・羽田 リアルタイム渋滞マップ | KAIROX Traffic",
    description: "実配送GPSデータから生成した空港ルート渋滞情報。東関東道・首都高・国道357号をリアルタイム表示。",
    type: "website",
  },
};

export default function TrafficLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
