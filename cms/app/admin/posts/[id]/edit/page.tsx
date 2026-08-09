'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PostForm from '@/components/PostForm';
import { Loader2 } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  published_at: string | null;
}

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data) {
          setError(error?.message ?? 'Post not found');
        } else {
          setPost(data);
        }
      });
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </main>
    );
  }

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
