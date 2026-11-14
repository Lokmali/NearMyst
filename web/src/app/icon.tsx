import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const logoPromise = readFile(join(process.cwd(), "public/brand/logo-v2.png"));

/** Favicon / app icon — NearMyst brand mark (replaces default Next triangle). */
export default async function Icon() {
  const logo = await logoPromise;
  const src = `data:image/png;base64,${Buffer.from(logo).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0C0A08",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          width={512}
          height={512}
          alt=""
          style={{ objectFit: "cover" }}
        />
      </div>
    ),
    { ...size },
  );
}
