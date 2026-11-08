import { getLocale } from "next-intl/server";
import { SiteFrame } from "@/components/site/site-frame";
import { getAllPosts } from "@/lib/posts";
import { GAMES, TOOLS } from "@/lib/site/catalog";

/** Blog, games and tools sit on the same camera screen as the legal pages. */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const posts = await getAllPosts(locale);

  return (
    <SiteFrame
      counts={{
        writing: posts.length,
        games: GAMES.length,
        tools: TOOLS.length,
      }}
    >
      {children}
    </SiteFrame>
  );
}
