import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default async function BlogIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = await getAllPosts(locale);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Blog</h1>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/${locale}/blog/${post.slug}`}
              className="hover:underline"
            >
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-semibold">{post.title}</h2>
                <span className="text-sm text-muted-foreground">
                  {post.date}
                </span>
              </div>
              <p className="text-muted-foreground">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
