import Link from 'next/link';

export default function BlogHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange text-white">
            T
          </span>
          TreadLeft Journal
        </Link>
        <a
          href="https://treadleft.app"
          className="text-sm font-medium text-slate-600 transition hover:text-brand-orange"
        >
          &larr; Back to TreadLeft
        </a>
      </div>
    </header>
  );
}
