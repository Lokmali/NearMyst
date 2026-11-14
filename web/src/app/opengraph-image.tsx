import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "NearMyst — Mystery packs on NEAR testnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logoData = readFile(join(process.cwd(), "public/brand/logo-v2.png"));

export default async function OpenGraphImage() {
  const logo = await logoData;
  const logoSrc = `data:image/png;base64,${Buffer.from(logo).toString("base64")}`;

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
          background: "#0C0A08",
          color: "#F7F0E4",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(224,184,74,0.32), transparent 50%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={72}
            height={72}
            style={{ borderRadius: 16 }}
            alt=""
          />
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
            NearMyst
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            <div style={{ display: "flex" }}>Mystery packs.</div>
            <div style={{ display: "flex" }}>On-chain odds.</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#C4B5A0",
              maxWidth: 720,
            }}
          >
            NEAR testnet demo — buy, wait one block, open, verify.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#8A7D6C",
            position: "relative",
          }}
        >
          Built for NEAR HACKATHON · testnet only
        </div>
      </div>
    ),
    { ...size },
  );
}
