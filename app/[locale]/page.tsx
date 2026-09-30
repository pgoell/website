import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ViewfinderHome } from "@/components/viewfinder/viewfinder-home";
import { getAllPosts } from "@/lib/posts";
import { getGithubStats } from "@/lib/stats/github";
import { getSpotifyTop } from "@/lib/stats/spotify";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: "Pascal Göllner", description: t("metaDescription") };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [allPosts, github, spotify] = await Promise.all([
    getAllPosts(locale),
    getGithubStats(),
    getSpotifyTop(),
  ]);
  const posts = allPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
  }));

  return <ViewfinderHome posts={posts} github={github} spotify={spotify} />;
}
