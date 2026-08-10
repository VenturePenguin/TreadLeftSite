import Link from 'next/link';
import Image from 'next/image';

export default function BlogHeader() {
  return (
    <header className="bg-transparent">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white">
          <Image src="/treadleft-logo.svg" alt="TreadLeft" width={28} height={34} className="h-8 w-auto" />
          TreadLeft Journal
        </Link>
        <a
          href="https://treadleft.app"
          className="text-sm font-medium text-slate-400 transition hover:text-white"
        >
          &larr; Back to TreadLeft
        </a>
      </div>
    </header>
  );
}
