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

/** Contact links under the name, drawn on a 24 x 24 grid in the current colour. */
export function ContactIcon({
  name,
}: {
  name: "mail" | "github" | "linkedin";
}) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      {name === "mail" && (
        <>
          <rect
            x="3"
            y="5.5"
            width="18"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 6.5l8.5 6.5 8.5-6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </>
      )}
      {name === "github" && (
        <path
          fill="currentColor"
          d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1-1.4-1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.1-.2-4.3-1-4.3-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.5 1 2.6 0 3.7-2.2 4.5-4.3 4.7.3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"
        />
      )}
      {name === "linkedin" && (
        <path
          fill="currentColor"
          d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1.8 6.8V18h2.6V9.8H5.8zm1.3-4.1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM10.2 9.8V18h2.6v-4.3c0-1.1.2-2.2 1.6-2.2s1.4 1.3 1.4 2.3V18h2.6v-4.7c0-2.3-.5-4-3.2-4-1.3 0-2.1.7-2.5 1.4V9.8h-2.5z"
        />
      )}
    </svg>
  );
}
