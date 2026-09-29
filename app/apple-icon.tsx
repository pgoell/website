import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// Static copy of app/icon.svg (cursor visible, no animation)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#121212"/><path fill="#fff" d="M3 9h2v14H3zM5 9h4v2H5zM9 11h2v6H9zM5 17h4v2H5zM15 9h6v2h-6zM13 11h2v6h-2zM19 11h2v10h-2zM15 17h4v2h-4zM13 21h6v2h-6z"/><rect x="23" y="9" width="5" height="10" fill="#009c7b"/></svg>`;

// Apple icon generation
export default function AppleIcon() {
  return new ImageResponse(
    // biome-ignore lint/performance/noImgElement: Satori renders plain img only
    <img
      src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
      width={size.width}
      height={size.height}
      alt=""
    />,
    {
      ...size,
    },
  );
}
