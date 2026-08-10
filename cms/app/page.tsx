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

export const revalidate = 60;

export default async function BlogIndexPage() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl bg-slate-950 px-4 py-12 text-red-400">
        <p>Failed to load posts: {error.message}</p>
      </main>
    );
  }

  const [featured, ...rest] = posts ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <BlogHeader />

      <section className="py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">TreadLeft Journal</h1>
          <p className="mt-3 text-lg text-slate-400">
            Running tips, shoe guides, and training insights.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {!posts || posts.length === 0 ? (
          <p className="text-center text-slate-400">No published posts yet.</p>
        ) : (
          <>
            <article className="mb-12 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg transition hover:border-white/20">
              <div className="p-8 md:p-10">
                <span className="mb-3 inline-block rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-orange">
                  Latest
                </span>
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  <Link href={`/posts/${featured.slug}`} className="hover:text-brand-orange">
                    {featured.title}
                  </Link>
                </h2>
                {featured.excerpt && (
                  <p className="mb-5 max-w-2xl text-slate-400">{featured.excerpt}</p>
                )}
                <div className="flex items-center justify-between">
                  {featured.published_at && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                      <Calendar className="h-4 w-4" />
                      {new Date(featured.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <Link
                    href={`/posts/${featured.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Read article
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>

            {rest.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <article
                    key={post.id}
                    className="flex flex-col rounded-xl border border-white/10 bg-slate-900 p-6 shadow-lg transition hover:border-white/20"
                  >
                    <h3 className="mb-2 text-lg font-bold text-white">
                      <Link href={`/posts/${post.slug}`} className="hover:text-brand-orange">
                        {post.title}
                      </Link>
                    </h3>
                    {post.excerpt && (
                      <p className="mb-4 line-clamp-3 flex-1 text-sm text-slate-400">{post.excerpt}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      {post.published_at && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(post.published_at).toLocaleDateString()}
                        </span>
                      )}
                      <Link
                        href={`/posts/${post.slug}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange hover:underline"
                      >
                        Read
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
