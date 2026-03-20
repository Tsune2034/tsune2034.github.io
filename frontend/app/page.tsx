"use client";

import dynamic from "next/dynamic";

// SSRを無効化してhydration mismatch（Google翻訳などによるDOM書き換え）を防ぐ
const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-950" />,
});

export default function Page() {
  return <Dashboard />;
}
