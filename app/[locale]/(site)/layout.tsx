import { getLocale } from "next-intl/server";
import { SiteFrame } from "@/components/site/site-frame";
import { getAllPosts } from "@/lib/posts";
import { GAMES, TOOLS } from "@/lib/site/catalog";
import { getTrips } from "@/lib/trips/db";

/** Blog, games, tools and trips sit on the same camera screen as the legal pages. */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const [posts, trips] = await Promise.all([getAllPosts(locale), getTrips()]);

  return (
    <SiteFrame
      counts={{
        writing: posts.length,
        games: GAMES.length,
        tools: TOOLS.length,
        trips: trips.length,
      }}
    >
      {children}
    </SiteFrame>
  );
}
