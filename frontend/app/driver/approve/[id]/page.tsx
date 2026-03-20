"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BookingDetail {
  booking_id: string;
  status: string;
  name?: string;
  created_at: string;
  driver_status?: string | null;
}

export default function ApprovePage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"idle" | "approving" | "cancelling" | "done">("idle");
  const [result, setResult] = useState<"approved" | "cancelled" | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  useEffect(() => {
    fetch(`${API_URL}/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => { setBooking(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, API_URL]);

  async function updateStatus(newStatus: string) {
    const act = newStatus === "delivered" ? "approving" : "cancelling";
    setAction(act);
    try {
      await fetch(`${API_URL}/bookings/${id}/driver-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_status: newStatus === "cancelled" ? "done" : "heading" }),
      });
      setResult(newStatus === "cancelled" ? "cancelled" : "approved");
    } catch {
      setResult("approved");
    }
    setAction("done");
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-bold text-amber-400 tracking-wider">KAIROX</p>
          <p className="text-[10px] text-gray-600">Driver Management</p>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        )}

        {!loading && !booking && (
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm text-white font-bold">Booking not found</p>
            <p className="text-xs text-gray-500 mt-1">{id}</p>
          </div>
        )}

        {booking && action !== "done" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Booking</span>
                <span className="text-sm font-bold text-amber-300 font-mono">{booking.booking_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Status</span>
                <span className={`text-xs font-semibold ${
                  booking.status === "confirmed" ? "text-green-400" :
                  booking.status === "delivered" ? "text-blue-400" : "text-gray-400"
                }`}>{booking.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Created</span>
                <span className="text-xs text-gray-400">{new Date(booking.created_at).toLocaleString("ja-JP")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateStatus("heading")}
                disabled={action !== "idle"}
                className="py-4 rounded-xl bg-green-500 text-gray-950 font-black text-sm hover:bg-green-400 transition-colors disabled:opacity-50 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">✅</span>
                <span>{action === "approving" ? "Processing…" : "承認"}</span>
              </button>
              <button
                onClick={() => updateStatus("cancelled")}
                disabled={action !== "idle"}
                className="py-4 rounded-xl bg-red-900/60 border border-red-700 text-red-300 font-bold text-sm hover:bg-red-900 transition-colors disabled:opacity-50 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">❌</span>
                <span>{action === "cancelling" ? "Processing…" : "キャンセル"}</span>
              </button>
            </div>

            <p className="text-center text-[10px] text-gray-700">
              承認するとドライバーステータスが「向かっています」に変わります
            </p>
          </div>
        )}

        {action === "done" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-5xl">{result === "approved" ? "✅" : "❌"}</p>
            <p className="text-lg font-bold text-white">
              {result === "approved" ? "承認しました" : "キャンセルしました"}
            </p>
            <p className="text-xs text-gray-500">{id}</p>
            <a href="/driver" className="block mt-4 text-xs text-amber-400 hover:text-amber-300 transition-colors">
              ← ドライバーダッシュボードへ
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
