import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowRight } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';

export const metadata: Metadata = {
  title: 'TreadLeft Blog',
  description: 'Running tips, shoe guides, and training insights from TreadLeft.',
};

export const dynamic = 'force-dynamic';

export default async function BlogIndexPage() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl bg-brand-light px-4 py-12 text-red-600">
        <p>Failed to load posts: {error.message}</p>
      </main>
    );
  }

  const [featured, ...rest] = posts ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-brand-light text-brand-navy">
      <BlogHeader />

      <section className="py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy md:text-5xl">TreadLeft Journal</h1>
          <p className="mt-3 text-lg text-brand-slate">
            Running tips, shoe guides, and training insights.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {!posts || posts.length === 0 ? (
          <p className="text-center text-brand-slate">No published posts yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <article
                key={post.id}
                className="flex h-full flex-col rounded-2xl border border-brand-border bg-white p-8 shadow-sm transition hover:shadow-md"
              >
                {index === 0 && (
                  <span className="mb-3 inline-block rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                    Latest
                  </span>
                )}
                <h2 className="mb-3 text-xl font-extrabold tracking-tight text-brand-navy line-clamp-2 md:text-2xl">
                  <Link href={`/posts/${post.slug}`} className="hover:text-brand-orange">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="mb-5 line-clamp-3 flex-1 text-brand-slate">{post.excerpt}</p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  {post.published_at && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-brand-slate">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <Link
                    href={`/posts/${post.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
