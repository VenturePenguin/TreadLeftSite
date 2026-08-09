'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('Auth check failed:', error);
      }
      const isLogin = pathname === '/admin/login';
      if (!session && !isLogin) {
        router.replace('/admin/login');
      } else if (session && isLogin) {
        router.replace('/admin/posts');
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const isLogin = pathname === '/admin/login';
      if (event === 'SIGNED_OUT' && !isLogin) {
        router.replace('/admin/login');
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && isLogin) {
        router.replace('/admin/posts');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Checking authentication…</p>
      </main>
    );
  }

  return <>{children}</>;
}
