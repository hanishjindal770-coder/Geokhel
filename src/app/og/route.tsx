import { ImageResponse } from "next/og";

// Link preview image for WhatsApp and other apps.
export function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("score");
  const score = raw && /^\d{1,4}$/.test(raw) && Number(raw) <= 1000 ? Number(raw) : null;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0e1714", color: "#e7efe9", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800 }}>
          <span>Geo</span><span style={{ color: "#f08a24" }}>Khel</span>
        </div>
        <div style={{ fontSize: score === null ? 48 : 64, marginTop: 24, fontWeight: 700 }}>
          {score === null ? "Five Indian sports moments a day." : `Can you beat ${score}/1000?`}
        </div>
        <div style={{ fontSize: 34, marginTop: 20, color: "#9bb0a4" }}>Tap where each one happened on the map of India.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
