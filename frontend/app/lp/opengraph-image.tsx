import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KAIROX — Japan Luggage Freedom";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #080C18 0%, #111827 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* glow */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700, height: 350,
          background: "rgba(245,158,11,0.12)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }} />

        {/* Logo */}
        <div style={{ color: "#F59E0B", fontSize: 96, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>
          KAIROX
        </div>

        {/* Tagline */}
        <div style={{ color: "white", fontSize: 38, fontWeight: 700, marginTop: 20 }}>
          Japan Luggage Freedom
        </div>

        {/* Sub */}
        <div style={{ color: "#6B7280", fontSize: 26, marginTop: 16 }}>
          成田・北海道 手ぶら旅　✈ 空港→ホテル直送
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 20, marginTop: 40 }}>
          {["Narita Airport", "New Chitose Airport", "4 Languages", "AI Routing"].map(b => (
            <div key={b} style={{
              border: "1px solid rgba(245,158,11,0.4)",
              background: "rgba(245,158,11,0.1)",
              color: "#FCD34D",
              borderRadius: 12,
              padding: "10px 20px",
              fontSize: 20,
              fontWeight: 600,
            }}>
              {b}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
