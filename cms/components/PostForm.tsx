'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PostEditor from './PostEditor';
import { Loader2, Save, Eye, ArrowLeft } from 'lucide-react';

interface PostFormProps {
  postId?: string;
  initialData?: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: 'draft' | 'published';
    published_at?: string | null;
  };
}

const emptyPost = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  status: 'draft' as const,
  published_at: null as string | null,
};

export default function PostForm({ postId, initialData }: PostFormProps) {
  const router = useRouter();
  const [post, setPost] = useState(initialData ?? emptyPost);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setPost(initialData);
  }, [initialData]);

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);

  const handleChange = useCallback(
    (field: keyof typeof post, value: string) => {
      setPost((prev) => {
        const next = { ...prev, [field]: value };
        if (field === 'title' && !postId) {
          next.slug = generateSlug(value);
        }
        return next;
      });
    },
    [postId]
  );

  const handleContentChange = useCallback((content: string) => {
    setPost((prev) => ({ ...prev, content }));
  }, []);

  const save = async (publish = false) => {
    if (!post.title.trim() || !post.slug.trim()) {
      setMessage('Title and slug are required.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      title: post.title.trim(),
      slug: post.slug.trim(),
      excerpt: post.excerpt.trim(),
      content: post.content,
      status: publish ? 'published' : (post.status === 'published' ? 'published' : 'draft'),
      published_at: publish || post.status === 'published'
        ? (post.published_at ?? new Date().toISOString())
        : null,
      updated_at: new Date().toISOString(),
    };

    try {
      let error;
      if (postId) {
        ({ error } = await supabase
          .from('blog_posts')
          .update(payload)
          .eq('id', postId));
      } else {
        ({ error } = await supabase.from('blog_posts').insert({
          ...payload,
          created_at: new Date().toISOString(),
        }));
      }

      if (error) throw error;

      setMessage(publish ? 'Post published!' : 'Post saved as draft.');
      if (!postId) {
        router.push('/admin/posts');
      } else {
        router.refresh();
      }
    } catch (err) {
      const errorMessage =
        (err as any)?.message ??
        (err as any)?.error_description ??
        (err as any)?.hint ??
        (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('Save failed:', err);
      setMessage(`Save failed: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      className="space-y-6"
    >
      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.startsWith('Save failed') || message.startsWith('Title')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={post.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="e.g. How to choose your first running shoe"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
            Slug
          </label>
          <input
            id="slug"
            type="text"
            value={post.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            placeholder="how-to-choose-your-first-running-shoe"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="excerpt" className="mb-1 block text-sm font-medium text-slate-700">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={post.excerpt}
          onChange={(e) => handleChange('excerpt', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          placeholder="Short summary for SEO / cards"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Content</label>
        <PostEditor value={post.content} onChange={handleContentChange} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </button>

        <button
          type="button"
          onClick={() => save(true)}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-brand-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Publish
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </form>
  );
}
