import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KAIROX Traffic | 成田・羽田 空港ルート リアルタイム渋滞情報",
  description:
    "成田空港・羽田空港発着の主要ルートをリアルタイム渋滞情報で確認。KAIROXが実際の配送走行データから生成した関東エリアの交通状況マップ。",
  keywords: ["成田空港 渋滞", "羽田空港 渋滞", "関東 交通情報", "空港 ルート", "KAIROX"],
  openGraph: {
    title: "KAIROX Traffic — 成田・羽田 リアルタイム渋滞マップ",
    description: "実配送データから生成した空港ルート渋滞情報",
    type: "website",
  },
};

export default function TrafficLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
