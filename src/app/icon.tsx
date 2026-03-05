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
          background: "linear-gradient(145deg, #101214 0%, #1f242b 100%)",
          color: "#b7ff3c",
          fontSize: 110,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        TT
      </div>
    ),
    size
  );
}
