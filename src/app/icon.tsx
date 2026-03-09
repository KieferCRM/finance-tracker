import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 110,
          fontWeight: 800,
          letterSpacing: -2,
          textShadow: "0 6px 14px rgba(255, 216, 77, 0.28)",
        }}
      >
        TT
      </div>
    ),
    size
  );
}
