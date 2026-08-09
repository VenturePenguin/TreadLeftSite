import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowRight } from 'lucide-react';

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
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-red-600">Failed to load posts: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900">TreadLeft Journal</h1>
        <p className="mt-2 text-slate-600">Running tips, shoe guides, and training insights.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts && posts.length > 0 ? (
          posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="mb-2 text-xl font-bold text-slate-900">
                <Link href={`/posts/${post.slug}`} className="hover:text-brand-blue">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && (
                <p className="mb-4 line-clamp-3 flex-1 text-sm text-slate-600">{post.excerpt}</p>
              )}
              <div className="mt-auto flex items-center justify-between">
                {post.published_at && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.published_at).toLocaleDateString()}
                  </span>
                )}
                <Link
                  href={`/posts/${post.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
                >
                  Read
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))
        ) : (
          <p className="col-span-full text-center text-slate-500">No published posts yet.</p>
        )}
      </div>
    </main>
  );
}
