import { glyphs, isGlyphRange, MAP_FONTS } from "@/lib/trips/tiles";

/** One block of letters for the map's labels, passed on from OpenFreeMap. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stack: string; range: string }> },
) {
  const { stack, range } = await params;
  // MapLibre asks for a list of fonts. The style names one per label.
  const font = decodeURIComponent(stack).split(",")[0] ?? "";
  if (!MAP_FONTS.includes(font) || !isGlyphRange(range))
    return new Response(null, { status: 404 });
  return glyphs(font, range);
}
