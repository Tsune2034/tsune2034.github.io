"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TikTokStudioContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const openId = searchParams.get("open_id");
  const error = searchParams.get("error");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (success === "1") setIsLoggedIn(true);
  }, [success]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !caption) return;
    setUploading(true);
    // Simulate upload for demo
    await new Promise((r) => setTimeout(r, 2000));
    setUploading(false);
    setUploaded(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <a href="/narita" className="text-gray-400 hover:text-gray-600 text-sm">← KAIROX</a>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-900">TikTok Studio</span>
        <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
          KAIROX Content Studio
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {!isLoggedIn ? (
          /* Login Screen */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.54V6.78a4.85 4.85 0 01-1.06-.09z"/>
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">KAIROX TikTok Studio</h1>
            <p className="text-gray-500 text-sm mb-2">
              @channel.yari チャンネルの動画をKAIROXから直接投稿・管理できます
            </p>
            <p className="text-gray-400 text-xs mb-8">
              Content Posting API powered by TikTok for Developers
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm mb-6">
                認証エラー: {error}。もう一度お試しください。
              </div>
            )}

            <a
              href="/api/auth/tiktok"
              className="inline-flex items-center gap-3 bg-black text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.54V6.78a4.85 4.85 0 01-1.06-.09z"/>
              </svg>
              TikTokでログイン
            </a>

            <p className="text-xs text-gray-400 mt-6">
              KAIROX スタッフ専用ツール。TikTok利用規約に準拠しています。
            </p>
          </div>
        ) : (
          /* Upload Screen */
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-green-700 text-sm">
              <span>✅</span>
              <span>TikTok認証完了 — open_id: {openId}</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">動画を投稿する</h2>

              {!uploaded ? (
                <div className="space-y-5">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      動画ファイル <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => document.getElementById("video-input")?.click()}>
                      {selectedFile ? (
                        <div className="text-sm text-gray-700">
                          <span className="text-2xl">🎬</span>
                          <p className="mt-2 font-medium">{selectedFile.name}</p>
                          <p className="text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <span className="text-3xl">📹</span>
                          <p className="mt-2 text-sm">クリックして動画を選択</p>
                          <p className="text-xs mt-1">MP4, MOV / 最大500MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="video-input"
                      type="file"
                      accept="video/mp4,video/mov,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      キャプション <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="旅行者へのメッセージを入力... #KAIROX #Japan #手ぶら旅行"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={2200}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{caption.length} / 2200</p>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !caption || uploading}
                    className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.54V6.78a4.85 4.85 0 01-1.06-.09z"/>
                        </svg>
                        TikTokに投稿する
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-5xl">🎉</span>
                  <h3 className="text-lg font-bold text-gray-900 mt-4">投稿完了！</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    動画が @channel.yari に投稿されました
                  </p>
                  <button
                    onClick={() => { setUploaded(false); setSelectedFile(null); setCaption(""); }}
                    className="mt-6 text-sm text-blue-600 hover:underline"
                  >
                    別の動画を投稿する
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TikTokStudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <TikTokStudioContent />
    </Suspense>
  );
}
