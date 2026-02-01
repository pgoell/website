import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Apple icon generation
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Using dark background color from theme
        background: "#38383a",
        borderRadius: "32px",
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: 700,
          color: "white",
          fontFamily: "Quicksand, system-ui, sans-serif",
          letterSpacing: "0.01em",
        }}
      >
        PK
      </div>
    </div>,
    {
      ...size,
    },
  );
}
