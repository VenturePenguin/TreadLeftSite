import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Calendar, ArrowLeft } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    return { title: 'Post not found' };
  }

  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

export const revalidate = 60;

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      <BlogHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        <article className="rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-lg md:p-12">
          <header className="mb-8">
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight leading-tight text-white md:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-slate-400">{post.excerpt}</p>
            )}
            {post.published_at && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
          </header>

          <div
            className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-brand-orange"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
