import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Icon generation
export default function Icon() {
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
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          fontSize: 18,
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
