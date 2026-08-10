import Link from 'next/link';
import Image from 'next/image';

export default function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-light/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-brand-navy">
          <Image src="/treadleft-logo.svg" alt="TreadLeft" width={28} height={34} className="h-8 w-auto" />
          TreadLeft Journal
        </Link>
        <a
          href="https://treadleft.app"
          className="text-sm font-medium text-brand-slate transition hover:text-brand-orange"
        >
          &larr; Back to TreadLeft
        </a>
      </div>
    </header>
  );
}
