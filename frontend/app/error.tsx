"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="bg-gray-900 border border-red-800 rounded-xl p-6 max-w-2xl w-full space-y-4">
        <h2 className="text-red-400 font-bold text-lg">エラーが発生しました</h2>
        <pre className="text-xs text-gray-300 bg-gray-800 rounded p-4 overflow-auto whitespace-pre-wrap">
          {error?.message ?? "不明なエラー"}
          {"\n\n"}
          {error?.stack ?? ""}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
