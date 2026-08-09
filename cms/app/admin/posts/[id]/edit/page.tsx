import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import PostForm from '@/components/PostForm';

interface EditPostPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: EditPostPageProps): Promise<Metadata> {
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title')
    .eq('id', params.id)
    .single();

  return {
    title: post ? `Edit: ${post.title}` : 'Edit Post',
  };
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !post) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Edit Blog Post</h1>
      <PostForm
        postId={post.id}
        initialData={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          status: post.status,
          published_at: post.published_at,
        }}
      />
    </main>
  );
}
