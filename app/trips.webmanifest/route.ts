// The Trips phone app. Linked only from the trip pages, so the home page never
// offers an install. The scope is the whole site because the trip pages live
// under two prefixes (/en/trips, /de/trips) and the share target sits at
// /share; the service worker still keeps only trip pages and the map.
export function GET() {
  return Response.json(
    {
      id: "/trips",
      name: "Trips",
      short_name: "Trips",
      start_url: "/trips",
      scope: "/",
      display: "standalone",
      background_color: "#050606",
      theme_color: "#050606",
      // Puts the installed app in the phone's share sheet. Android only:
      // Safari has no share target.
      share_target: {
        action: "/share",
        method: "GET",
        params: { title: "title", text: "text", url: "url" },
      },
      icons: [
        { src: "/trips/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/trips/icon-512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/trips/icon-maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
