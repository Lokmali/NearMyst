import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NearMyst — Mystery packs on NEAR testnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#0A0A12",
          color: "#F5F5FA",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(124,108,255,0.35), transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(91,140,255,0.2), transparent 45%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 72,
              borderRadius: 24,
              background: "linear-gradient(180deg, #7C6CFF 0%, #5B8CFF 100%)",
            }}
          />
          <div style={{ fontSize: 36, fontWeight: 700 }}>NearMyst</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            Mystery packs.
            <br />
            On-chain odds.
          </div>
          <div style={{ fontSize: 28, color: "#A9A9BC", maxWidth: 720 }}>
            NEAR testnet demo — buy, wait one block, open, verify.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#70708A" }}>
          Built for NEAR HACKATHON · testnet only
        </div>
      </div>
    ),
    { ...size },
  );
}
