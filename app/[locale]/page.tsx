import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ViewfinderHome } from "@/components/viewfinder/viewfinder-home";
import { getAllPosts } from "@/lib/posts";

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
  const posts = (await getAllPosts(locale)).map((p) => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
  }));

  return <ViewfinderHome posts={posts} />;
}
