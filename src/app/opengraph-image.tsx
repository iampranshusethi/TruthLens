import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The preview card shown when a TruthLens link is shared (LinkedIn, WhatsApp, X).
export const alt = "TruthLens: know what you're signing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");
const semibold = await readFile(join(fontDir, "Geist-SemiBold.ttf"));
const regular = await readFile(join(fontDir, "Geist-Regular.ttf"));

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf7f2",
          padding: "72px 80px",
          fontFamily: "Geist",
          color: "#1e1b18",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: "#5ed6b4" }} />
          TruthLens
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>
            Know what you&apos;re&nbsp;
            <div style={{ display: "flex", position: "relative" }}>
              <div
                style={{ position: "absolute", left: -8, right: -8, bottom: 6, height: 38, background: "#bdefdd", borderRadius: 4 }}
              />
              <div style={{ display: "flex", position: "relative" }}>signing.</div>
            </div>
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#7a7067", maxWidth: 900, lineHeight: 1.35 }}>
            Rental agreements, insurance policies and contracts, explained clause by clause. Every point traced back
            to your document.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24 }}>
          {[
            ["#d4532b", "#fce4dc", "#8a2e14", "2 risks"],
            ["#c98a12", "#fbefd5", "#7a4e08", "8 cautions"],
            ["#3f8f63", "#e3f4ea", "#1f5b3d", "6 fair"],
          ].map(([dot, bg, ink, label]) => (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 10, background: bg, color: ink, padding: "10px 20px", borderRadius: 999 }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 999, background: dot }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
