import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0b1325 0%, #14223c 58%, #0f182b 100%)",
          color: "#ffd84d",
          fontSize: 52,
          fontWeight: 800,
          letterSpacing: -1,
          textShadow: "0 4px 9px rgba(255, 216, 77, 0.28)",
        }}
      >
        TT
      </div>
    ),
    size
  );
}
