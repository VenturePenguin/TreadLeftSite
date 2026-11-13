#!/usr/bin/env node
// Regenerates sitemap.xml + static blog/{slug}.html pages from Supabase.
// Run: node scripts/generate-sitemap.js   (then commit + push to publish)

const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://vpeszlbrrqwsmnhqdtpf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BNR1EmmFbVi-Bs72NSnvzw_thlz3W6b';
const BASE = 'https://www.treadleft.app';
const ROOT = join(__dirname, '..');

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/shoes', changefreq: 'daily', priority: '0.8' },
  { loc: '/release-notes', changefreq: 'weekly', priority: '0.6' },
  { loc: '/legal-privacy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/legal-terms', changefreq: 'monthly', priority: '0.3' },
];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstImage = html => (String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || null;

async function fetchJson(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function blogPage(post) {
  const title = esc(post.title);
  const desc = esc(post.excerpt || post.title);
  const url = `${BASE}/blog/${post.slug}`;
  const img = firstImage(post.content);
  const date = (post.published_at || post.created_at || '').slice(0, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | TreadLeft Journal</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="TreadLeft">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${url}">
    ${img ? `<meta property="og:image" content="${esc(img)}">` : `<meta property="og:image" content="${BASE}/favicon.png">`}
    <meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="stylesheet" href="/css/tailwind.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(post.title)},
      "description": ${JSON.stringify(post.excerpt || post.title)},
      "url": "${url}",
      "datePublished": "${date}",
      ${img ? `"image": "${esc(img)}",` : ''}
      "author": { "@type": "Organization", "name": "TreadLeft", "url": "${BASE}/" },
      "publisher": { "@type": "Organization", "name": "TreadLeft", "url": "${BASE}/" }
    }
    </script>
    <style>
      .post-body { font-size: 1.05rem; line-height: 1.8; color: #475569; }
      .post-body h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 2rem 0 0.75rem; letter-spacing: -0.01em; }
      .post-body h3 { font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.5rem; }
      .post-body p { margin: 0 0 1.25rem; }
      .post-body img { border-radius: 1rem; margin: 1.5rem auto; max-width: 100%; height: auto; }
      .post-body ul, .post-body ol { margin: 0 0 1.25rem 1.5rem; }
      .post-body ul { list-style: disc; } .post-body ol { list-style: decimal; }
      .post-body li { margin-bottom: 0.5rem; }
      .post-body a { color: #f97316; } .post-body a:hover { text-decoration: underline; }
      .post-body blockquote { border-left: 3px solid #f97316; padding-left: 1rem; font-style: italic; margin: 1.5rem 0; }
      .post-body strong { color: #0f172a; }
    </style>
</head>
<body class="bg-brand-light text-brand-navy font-sans antialiased">
    <nav class="fixed top-0 w-full bg-brand-light/80 backdrop-blur-md border-b border-brand-border z-50">
        <div class="container mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" class="flex items-center gap-2">
                <svg class="w-8 h-8 text-brand-orange" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="45" y="10" width="30" height="8" rx="4" /><circle cx="35" cy="24" r="4" />
                    <rect x="42" y="20" width="24" height="8" rx="4" /><rect x="70" y="20" width="15" height="8" rx="4" />
                    <rect x="30" y="32" width="30" height="8" rx="4" /><rect x="64" y="32" width="22" height="8" rx="4" />
                    <rect x="25" y="44" width="20" height="8" rx="4" /><circle cx="50" cy="48" r="4" />
                    <rect x="58" y="44" width="24" height="8" rx="4" /><rect x="28" y="56" width="35" height="8" rx="4" />
                    <rect x="67" y="56" width="14" height="8" rx="4" /><rect x="22" y="68" width="24" height="8" rx="4" />
                    <rect x="50" y="68" width="28" height="8" rx="4" />
                    <g transform="rotate(-15 40 95)"><rect x="25" y="85" width="25" height="8" rx="4" />
                    <circle cx="56" cy="89" r="4" /><rect x="30" y="97" width="18" height="8" rx="4" />
                    <circle cx="54" cy="101" r="4" /><rect x="35" y="109" width="16" height="8" rx="4" /></g>
                </svg>
                <span class="text-xl font-bold tracking-tight text-brand-navy">Tread<span class="text-brand-orange">Left</span></span>
            </a>
            <div class="flex items-center gap-5">
                <a href="/shoes" class="text-sm font-medium text-brand-slate hover:text-brand-orange transition inline-flex items-center gap-1.5">Shoe Leaderboard<span class="text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-brand-orange px-1.5 py-0.5 rounded-full">Live</span></a>
                <a href="/" class="text-sm font-medium text-brand-slate hover:text-brand-orange transition">← Back to home</a>
            </div>
        </div>
    </nav>

    <main class="pt-32 pb-24">
        <article class="container mx-auto px-6 max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-wider text-brand-orange mb-4">TreadLeft Journal${date ? ' · ' + date : ''}</p>
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">${title}</h1>
            ${post.excerpt ? `<p class="text-lg text-brand-slate mb-8">${esc(post.excerpt)}</p>` : ''}
            <div class="post-body">${post.content || ''}</div>
        </article>

        <div class="container mx-auto px-6 max-w-3xl mt-14">
            <div class="bg-brand-navy text-white rounded-3xl p-8 text-center">
                <h2 class="text-xl font-bold mb-2">Track your own shoe mileage &amp; true £/km</h2>
                <p class="text-slate-300 text-sm mb-6">TreadLeft syncs with Strava and tracks every kilometre on every pair — automatically.</p>
                <div class="flex justify-center gap-3 flex-wrap">
                    <a href="https://apps.apple.com/app/treadleft/id6756678478" target="_blank" rel="noopener" class="px-5 py-2.5 bg-white text-brand-navy text-sm font-bold rounded-full hover:bg-slate-100 transition">iOS App</a>
                    <a href="https://play.google.com/store/apps/details?id=com.davidburns.treadleftapp" target="_blank" rel="noopener" class="px-5 py-2.5 bg-white/10 border border-white/30 text-white text-sm font-bold rounded-full hover:bg-white/20 transition">Android App</a>
                    <a href="/shoes" class="px-5 py-2.5 bg-brand-orange text-white text-sm font-bold rounded-full hover:bg-orange-600 transition">Shoe Leaderboard</a>
                </div>
            </div>
        </div>
    </main>

    <footer class="bg-white py-12 border-t border-brand-border">
        <div class="container mx-auto px-6 text-center">
            <p class="text-brand-slate text-sm mb-4">&copy; 2026 TreadLeft. Built for runners, by runners.</p>
            <div class="flex justify-center gap-6">
                <a href="/release-notes" class="text-brand-slate hover:text-brand-orange transition text-sm">Release Notes</a>
                <a href="/legal-terms" class="text-brand-slate hover:text-brand-orange transition text-sm">Terms &amp; Conditions</a>
                <a href="/legal-privacy" class="text-brand-slate hover:text-brand-orange transition text-sm">Privacy Policy</a>
            </div>
        </div>
    </footer>
</body>
</html>
`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const [leads, posts] = await Promise.all([
    fetchJson('creator_seeding_leads?select=snapshot_slug,updated_at&status=neq.dismissed&snapshot_slug=not.is.null'),
    fetchJson('blog_posts?select=title,slug,excerpt,content,published_at,created_at&status=eq.published&order=published_at.desc'),
  ]);

  // Static blog pages
  const blogDir = join(ROOT, 'blog');
  mkdirSync(blogDir, { recursive: true });
  for (const post of posts) {
    if (!post.slug) continue;
    writeFileSync(join(blogDir, `${post.slug}.html`), blogPage(post));
  }

  const urls = [
    ...STATIC_PAGES.map(p => ({ ...p, lastmod: today })),
    ...posts.filter(p => p.slug).map(p => ({
      loc: `/blog/${p.slug}`,
      lastmod: (p.published_at || p.created_at || '').slice(0, 10) || today,
      changefreq: 'monthly',
      priority: '0.7',
    })),
    ...leads.map(l => ({
      loc: `/snapshot/${l.snapshot_slug}`,
      lastmod: (l.updated_at || '').slice(0, 10) || today,
      changefreq: 'weekly',
      priority: '0.7',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  writeFileSync(join(ROOT, 'sitemap.xml'), xml);
  console.log(`sitemap.xml: ${STATIC_PAGES.length} static + ${posts.length} blog + ${leads.length} snapshot URLs`);
  console.log(`blog/: ${posts.length} static pages generated`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
