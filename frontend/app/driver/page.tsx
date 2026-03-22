"use client";

import dynamic from "next/dynamic";
import { t } from "../i18n";

const DriverView = dynamic(() => import("../DriverView"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-950" />,
});

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
              KAIROX
            </span>
            <span className="text-xs text-gray-600">Driver Portal</span>
          </div>
        </div>
        <DriverView tr={t.ja} />
      </div>
    </div>
  );
}
