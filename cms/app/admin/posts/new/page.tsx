import PostForm from '@/components/PostForm';

export const metadata = {
  title: 'New Blog Post',
};

export default function NewPostPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Create Blog Post</h1>
      <PostForm />
    </main>
  );
}
