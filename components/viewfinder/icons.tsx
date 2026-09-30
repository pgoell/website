import type { MenuIcon as MenuIconName } from "@/lib/viewfinder/menu";

/** Camera menu tab icons, drawn on a 24 x 24 grid in the current colour. */
export function MenuIcon({
  name,
  size = 24,
  color = "currentColor",
}: {
  name: MenuIconName;
  size?: number;
  color?: string;
}) {
  const c = color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {name === "star" && (
        <path
          d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"
          fill={c}
        />
      )}
      {name === "cam" && (
        <>
          <path
            d="M3 8h4l2-3h6l2 3h4v11H3z"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <circle cx="12" cy="13" r="3.5" fill={c} />
        </>
      )}
      {name === "pen" && (
        <path
          d="M4 20l1-5L16 4l4 4L9 19z"
          fill="none"
          stroke={c}
          strokeWidth="2"
        />
      )}
      {name === "play" && (
        <>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="1"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <path d="M10 8.5v7l6-3.5z" fill={c} />
        </>
      )}
      {name === "book" && (
        <>
          <path
            d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <path d="M12 6v14" stroke={c} strokeWidth="2" />
        </>
      )}
      {name === "disc" && (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="2.5" fill={c} />
        </>
      )}
      {name === "dice" && (
        <>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <circle cx="9" cy="9" r="1.6" fill={c} />
          <circle cx="15" cy="15" r="1.6" fill={c} />
          <circle cx="15" cy="9" r="1.6" fill={c} />
          <circle cx="9" cy="15" r="1.6" fill={c} />
        </>
      )}
      {name === "box" && (
        <>
          <path
            d="M3 9h18v10H3z M8 9V6h8v3"
            fill="none"
            stroke={c}
            strokeWidth="2"
          />
          <path d="M3 13h18" stroke={c} strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
