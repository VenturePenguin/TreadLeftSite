#!/usr/bin/env node
// Regenerates sitemap.xml + pre-baked static pages from Supabase:
//   snapshot/{slug}.html   — per-creator Fleet Cards (real files, HTTP 200)
//   blog/{slug}.html       — per-post article pages
//   blog.html              — /blog index of all posts
//   shoes.html             — leaderboard cards + KPIs + JSON-LD injected between markers
// Run: node scripts/generate-sitemap.js   (then commit + push to publish)

const { writeFileSync, readFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://vpeszlbrrqwsmnhqdtpf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BNR1EmmFbVi-Bs72NSnvzw_thlz3W6b';
const BASE = 'https://www.treadleft.app';
const ROOT = join(__dirname, '..');

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/shoes', changefreq: 'daily', priority: '0.8' },
  { loc: '/blog', changefreq: 'weekly', priority: '0.7' },
  { loc: '/release-notes', changefreq: 'weekly', priority: '0.6' },
  { loc: '/legal-privacy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/legal-terms', changefreq: 'monthly', priority: '0.3' },
];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstImage = html => (String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || null;
const money = v => '£' + Number(v || 0).toFixed(2);
const J = s => JSON.stringify(s ?? '');

async function fetchJson(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchRpc(name) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`RPC ${name} ${res.status}: ${await res.text()}`);
  return res.json();
}

const LOGO_SVG = `<svg class="w-8 h-8 text-brand-orange" viewBox="0 0 100 100" fill="currentColor">
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
</svg>`;

const NAV = (back) => `<nav class="fixed top-0 w-full bg-brand-light/80 backdrop-blur-md border-b border-brand-border z-50">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <a href="/" class="flex items-center gap-2">${LOGO_SVG}
            <span class="text-xl font-bold tracking-tight text-brand-navy">Tread<span class="text-brand-orange">Left</span></span>
        </a>
        <div class="flex items-center gap-5">
            <a href="/shoes" class="text-sm font-medium text-brand-slate hover:text-brand-orange transition inline-flex items-center gap-1.5">Shoe Leaderboard<span class="text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-brand-orange px-1.5 py-0.5 rounded-full">Live</span></a>
            ${back ? `<a href="/" class="text-sm font-medium text-brand-slate hover:text-brand-orange transition">← Back to home</a>` : ''}
        </div>
    </div>
</nav>`;

const FOOTER = `<footer class="bg-white py-12 border-t border-brand-border">
    <div class="container mx-auto px-6 text-center">
        <p class="text-brand-slate text-sm mb-4">&copy; 2026 TreadLeft. Built for runners, by runners.</p>
        <div class="flex justify-center gap-6">
            <a href="/release-notes" class="text-brand-slate hover:text-brand-orange transition text-sm">Release Notes</a>
            <a href="/legal-terms" class="text-brand-slate hover:text-brand-orange transition text-sm">Terms &amp; Conditions</a>
            <a href="/legal-privacy" class="text-brand-slate hover:text-brand-orange transition text-sm">Privacy Policy</a>
        </div>
    </div>
</footer>`;

const HEAD_COMMON = `<link rel="stylesheet" href="/css/tailwind.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="/favicon.png">
    <meta name="apple-itunes-app" content="app-id=6756678478">`;

// ─── Snapshot pages ─────────────────────────────────────────────────────────

function ringSvg(score) {
  const r = 36, c = 2 * Math.PI * r;
  const col = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return `<div class="ring-wrap"><svg width="92" height="92">
    <circle cx="46" cy="46" r="${r}" stroke="#e2e8f0" stroke-width="9" fill="none"/>
    <circle cx="46" cy="46" r="${r}" stroke="${col}" stroke-width="9" fill="none" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(100, Math.max(0, score)) / 100)).toFixed(1)}"/></svg>
    <div class="ring-label"><div class="ring-pct" style="color:${col}">${score}%</div><div class="ring-sub">Healthy</div></div></div>`;
}

function snapshotShoeRow(s) {
  const tier = s.status === 'critical' ? 'critical' : s.status === 'worn' ? 'worn' : 'fresh';
  return `<div><div class="shoe"><span class="dot ${tier}"></span>
    <span class="shoe-name">${esc(s.brand)} ${esc(s.model)}</span>
    <span class="shoe-km">${Math.round(s.mileage_km || 0)} km</span>
    <span class="shoe-cost">${money(s.cost_per_km)}/km</span></div>
    ${s.creator_notes ? `<div class="shoe-notes">${esc(s.creator_notes)}</div>` : ''}</div>`;
}

function snapshotBody(lead) {
  const fs = lead.fleet_summary || {};
  const shoes = Array.isArray(lead.extracted_shoes) ? lead.extracted_shoes : [];
  return `
    <div class="eyebrow">Fleet Snapshot</div>
    <h1>${esc(lead.creator_name)}'s Rotation</h1>
    <p class="sub">Powered by TreadLeft — true shoe wear &amp; cost-per-km tracking</p>
    <div class="card">
      <div class="creator">
        <div>
          <div class="creator-name">${esc(lead.creator_name)}</div>
          <div class="creator-sub">${esc(lead.creator_handle || '')}${lead.video_title ? ' · ' + esc(lead.video_title) : ''}</div>
        </div>
      </div>
      <div class="stats">
        ${ringSvg(fs.health_score || 0)}
        <div><div class="stat-v">${fs.total_shoes || shoes.length}</div><div class="stat-l">Shoes</div></div>
        <div><div class="stat-v">${(fs.total_km || 0).toLocaleString()}</div><div class="stat-l">Total km</div></div>
        <div><div class="stat-v">${money(fs.avg_cost_per_km)}</div><div class="stat-l">Avg /km</div></div>
      </div>
      ${fs.best_roi_shoe ? `<div class="roi">🏆 Best ROI: ${esc(fs.best_roi_shoe)} at ${money(fs.best_roi_value)}/km</div>` : ''}
      <div>${shoes.map(snapshotShoeRow).join('')}</div>
      ${lead.vip_code ? `<div class="vip"><div><div class="vip-label">Lifetime Pro code</div><div class="vip-code">${esc(lead.vip_code)}</div></div><button class="dl-btn" style="border:0;cursor:pointer" onclick="claimRotation('${esc(lead.vip_code)}')">Claim This Rotation (1-Tap)</button></div>` : ''}
    </div>
    <div class="cta"><p>Claim imports your full rotation — shoes, mileage &amp; cost/km — plus lifetime Pro.</p><a href="/">Get TreadLeft</a></div>`;
}

function bakeSnapshotPage(lead, template) {
  const slug = lead.snapshot_slug;
  const fs = lead.fleet_summary || {};
  const shoes = Array.isArray(lead.extracted_shoes) ? lead.extracted_shoes : [];
  const url = `${BASE}/snapshot/${slug}`;
  const title = `${lead.creator_name}'s Running Shoe Rotation, Mileage & Cost/km | TreadLeft`;
  const desc = `See ${lead.creator_name}'s ${shoes.length}-shoe running rotation (${Math.round(fs.total_km || 0).toLocaleString()}km tracked, ${money(fs.avg_cost_per_km)}/km avg, ${fs.health_score || 0}/100 Fleet Health) extracted by TreadLeft.`;

  let html = template;
  // Head meta — replace static fallbacks with per-lead values
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  html = html.replace(/(<link rel="canonical"[^>]*href=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(id="og-title"[^>]*content=")[^"]*(")|(content=")[^"]*(" id="og-title")/, (m, a, b, c, d) => a ? `${a}${esc(title)}${b}` : `${c}${esc(title)}${d}`);
  html = html.replace(/(id="og-desc"[^>]*content=")[^"]*(")/, `$1${esc(desc)}$2`);
  html = html.replace(/(id="og-url"[^>]*content=")[^"]*(")/, `$1${url}$2`);
  html = html.replace(/(id="tw-title"[^>]*content=")[^"]*(")/, `$1${esc(title)}$2`);
  html = html.replace(/(id="tw-desc"[^>]*content=")[^"]*(")/, `$1${esc(desc)}$2`);

  // ItemList JSON-LD
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `${lead.creator_name}'s Running Shoe Rotation`,
    url,
    itemListElement: shoes.map((s, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Thing', name: `${s.brand} ${s.model}`, brand: { '@type': 'Brand', name: s.brand },
        url,
        description: s.creator_notes || `${Math.round(s.mileage_km || 0)} km tracked at ${money(s.cost_per_km)}/km`,
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Mileage', value: Math.round(s.mileage_km || 0), unitText: 'km' },
          { '@type': 'PropertyValue', name: 'Cost per km', value: Number(s.cost_per_km || 0).toFixed(2), unitText: 'GBP/km' },
        ],
      },
    })),
  })}</script>`;
  html = html.replace('</head>', `  ${ld}\n</head>`);

  // Baked initial render (client JS re-fetches live data and replaces #app)
  html = html.replace(
    /<div class="wrap" id="app">[\s\S]*?<\/div>\s*\n/,
    `<div class="wrap" id="app">${snapshotBody(lead)}\n  </div>\n`
  );
  return html;
}

// ─── Blog pages ─────────────────────────────────────────────────────────────

const POST_BODY_CSS = `<style>
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
    </style>`;

function relatedBlock(post, posts) {
  const others = posts.filter(p => p.slug !== post.slug).slice(0, 3);
  return `<div class="bg-white border border-brand-border rounded-3xl p-6 mt-10">
      <p class="text-xs font-bold uppercase tracking-wider text-brand-slate mb-4">Related on TreadLeft</p>
      <div class="space-y-3">
          <a href="/shoes" class="block text-sm font-semibold text-brand-orange hover:underline">Explore the 50+ Shoe Durability Leaderboard →</a>
          ${others.map(p => `<a href="/blog/${p.slug}" class="block text-sm font-semibold text-brand-navy hover:text-brand-orange transition">${esc(p.title)}</a>`).join('\n          ')}
      </div>
  </div>`;
}

function blogPage(post, posts) {
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
    ${HEAD_COMMON}
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${J(post.title)},
      "description": ${J(post.excerpt || post.title)},
      "url": "${url}",
      "datePublished": "${date}",
      ${img ? `"image": "${esc(img)}",` : ''}
      "author": { "@type": "Organization", "name": "TreadLeft", "url": "${BASE}/" },
      "publisher": { "@type": "Organization", "name": "TreadLeft", "url": "${BASE}/" }
    }
    </script>
    ${POST_BODY_CSS}
</head>
<body class="bg-brand-light text-brand-navy font-sans antialiased">
    ${NAV(true)}

    <main class="pt-32 pb-24">
        <article class="container mx-auto px-6 max-w-3xl">
            <p class="text-xs font-bold uppercase tracking-wider text-brand-orange mb-4">TreadLeft Journal${date ? ' · ' + date : ''}</p>
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">${title}</h1>
            ${post.excerpt ? `<p class="text-lg text-brand-slate mb-8">${esc(post.excerpt)}</p>` : ''}
            <div class="post-body">${post.content || ''}</div>
            ${relatedBlock(post, posts)}
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

    ${FOOTER}
</body>
</html>
`;
}

function blogIndexPage(posts) {
  const cards = posts.map((p, i) => {
    const date = (p.published_at || '').slice(0, 10);
    const img = firstImage(p.content);
    return `<a href="/blog/${p.slug}" class="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:-translate-y-1 transition duration-300 flex flex-col">
            ${img ? `<div class="aspect-[16/9] w-full overflow-hidden bg-slate-100"><img src="${esc(img)}" alt="${esc(p.title)}" class="h-full w-full object-cover" loading="lazy"></div>` : ''}
            <div class="p-7 flex flex-col flex-1">
                ${i === 0 ? '<span class="inline-block px-2 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-semibold mb-3 self-start">Latest</span>' : ''}
                <h2 class="text-xl font-bold text-brand-navy mb-2 group-hover:text-brand-orange transition line-clamp-2">${esc(p.title)}</h2>
                <p class="text-brand-slate text-sm leading-relaxed line-clamp-3 flex-1">${esc(p.excerpt || '')}</p>
                <p class="text-xs text-slate-400 mt-4">${date}</p>
            </div>
        </a>`;
  }).join('\n        ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TreadLeft Journal — Running Shoe Durability, Cost/km &amp; Rotation Guides</title>
    <meta name="description" content="Guides and data analysis on running shoe lifespan, true cost per kilometre, rotations and injury prevention — from the TreadLeft team.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${BASE}/blog">
    <meta property="og:type" content="website">
    <meta property="og:title" content="TreadLeft Journal — Running Shoe Durability &amp; Cost/km Guides">
    <meta property="og:description" content="Guides and data analysis on running shoe lifespan, cost per kilometre, rotations and injury prevention.">
    <meta property="og:url" content="${BASE}/blog">
    ${HEAD_COMMON}
</head>
<body class="bg-brand-light text-brand-navy font-sans antialiased">
    ${NAV(true)}

    <main class="pt-32 pb-24">
        <div class="container mx-auto px-6 max-w-5xl">
            <div class="mb-12">
                <p class="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">TreadLeft Journal</p>
                <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Shoe science, minus the marketing.</h1>
                <p class="text-lg text-brand-slate max-w-2xl">Real-world durability data, rotation strategy and cost-per-km economics for runners.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${cards}
            </div>
        </div>
    </main>

    ${FOOTER}
</body>
</html>
`;
}

// ─── Shoes leaderboard injection ────────────────────────────────────────────

function leaderboardRowHtml(r, i) {
  const details = r.quote_details || [];
  const creators = r.creators || [];
  const slugs = r.creator_slugs || [];
  const avgKm = r.avg_mileage_km || 0;
  const cost = Number(r.avg_cost_per_km || 0);
  const costCls = cost <= 0.35 ? 'text-emerald-600' : cost <= 0.80 ? 'text-amber-600' : 'text-slate-500';
  const earlyMiles = cost > 0.80 && avgKm < 150;
  const kmBar = Math.min(100, Math.round((avgKm / 800) * 100));
  const hasRange = r.mention_count > 1 && r.min_mileage_km !== r.max_mileage_km;
  const deal = r.best_deal_gbp ? Number(r.best_deal_gbp) : null;
  const pill = (c, j) => slugs[j]
    ? `<a href="/snapshot/${encodeURIComponent(slugs[j])}" class="bg-brand-light text-brand-slate text-[10px] px-2 py-0.5 rounded-full hover:bg-brand-orange/10 hover:text-brand-orange transition">${esc(c)}</a>`
    : `<span class="bg-brand-light text-brand-slate text-[10px] px-2 py-0.5 rounded-full">${esc(c)}</span>`;
  return `<div class="bg-white border border-brand-border rounded-2xl px-5 py-4 mb-3 shadow-sm">
      <div class="grid grid-cols-2 sm:grid-cols-[1.7fr_.9fr_.8fr_1fr] gap-x-3 gap-y-2 items-baseline">
        <span class="col-span-2 sm:col-span-1">
          <span class="inline-flex w-6 h-6 rounded-lg bg-orange-50 text-brand-orange text-[11px] font-extrabold items-center justify-center mr-2">${i + 1}</span>
          <span class="font-bold text-[15px]">${esc(r.brand)} ${esc(r.model)}</span>
          ${deal && avgKm ? `<span class="block mt-1"><a href="${esc(r.deal_url || '#')}" target="_blank" rel="noopener sponsored" class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full hover:bg-emerald-100 transition"><i data-lucide="tag" class="w-3 h-3"></i>Deal: £${deal.toFixed(0)} <span class="font-normal">(drops to £${(deal / avgKm).toFixed(2)}/km)</span></a></span>` : ''}
        </span>
        <span class="flex items-center gap-1.5 flex-wrap">
          <span class="bg-blue-50 text-brand-blue font-bold text-[11px] px-2 py-0.5 rounded-full">${r.mention_count}×</span>
          ${creators.slice(0, 2).map((c, j) => pill(c, j)).join('')}
          ${creators.length > 2 ? `<span class="bg-brand-light text-brand-slate text-[10px] px-2 py-0.5 rounded-full">+${creators.length - 2}</span>` : ''}
        </span>
        <span class="text-brand-slate text-[13px]">${Math.round(avgKm)} km
          <span class="block mt-1 h-1 w-16 bg-brand-light rounded-full overflow-hidden"><span class="block h-full bg-brand-orange rounded-full" style="width:${kmBar}%"></span></span>
          ${hasRange ? `<span class="block text-[10px] text-brand-slate/60 mt-0.5">Range: ${r.min_mileage_km}–${r.max_mileage_km} km</span>` : ''}
        </span>
        <span class="font-bold ${costCls} text-sm">£${cost.toFixed(2)}/km${earlyMiles ? ' <span class="block font-normal text-[10px] text-brand-slate/70">early miles</span>' : ''}</span>
      </div>
      ${details.length ? `<button class="text-brand-orange text-[11px] font-semibold mt-2 hover:underline" onclick="quotesOpen[${i}]=!quotesOpen[${i}];renderBoard()">▸ ${details.length} creator entr${details.length > 1 ? 'ies' : 'y'}</button>` : ''}
    </div>`;
}

function injectShoesPage(consensus) {
  const path = join(ROOT, 'shoes.html');
  let html = readFileSync(path, 'utf8');
  if (!html.includes('SEO-LEADERBOARD-START')) { console.warn('shoes.html markers missing — skipping injection'); return; }

  const rowsHtml = consensus.map((r, i) => leaderboardRowHtml(r, i)).join('\n            ');
  html = html.replace(/<!-- SEO-LEADERBOARD-START -->[\s\S]*?<!-- SEO-LEADERBOARD-END -->/,
    `<!-- SEO-LEADERBOARD-START -->\n            ${rowsHtml}\n            <!-- SEO-LEADERBOARD-END -->`);

  const totalMentions = consensus.reduce((s, r) => s + (r.mention_count || 0), 0);
  const avgCost = consensus.reduce((s, r) => s + Number(r.avg_cost_per_km || 0), 0) / Math.max(consensus.length, 1);
  const kpisHtml = [[consensus.length, 'Shoe Models Ranked'], [totalMentions, 'Creator Mentions'], ['£' + avgCost.toFixed(2), 'Avg Cost/km']]
    .map(([v, l]) => `<div class="bg-white border border-brand-border rounded-2xl px-4 py-3 text-center shadow-sm">
    <div class="text-xl font-extrabold text-brand-navy">${v}</div>
    <div class="text-[10px] font-bold uppercase tracking-wider text-brand-slate mt-0.5">${l}</div></div>`).join('');
  html = html.replace(/<!-- SEO-KPIS-START -->[\s\S]*?<!-- SEO-KPIS-END -->/, `<!-- SEO-KPIS-START -->${kpisHtml}<!-- SEO-KPIS-END -->`);

  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Real-World Running Shoe Durability & Cost/km Leaderboard',
    url: `${BASE}/shoes`,
    itemListElement: consensus.map((r, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Thing', name: `${r.brand} ${r.model}`, brand: { '@type': 'Brand', name: r.brand },
        url: `${BASE}/shoes`,
        description: `${r.mention_count} creator mention${r.mention_count > 1 ? 's' : ''} — avg ${Math.round(r.avg_mileage_km || 0)} km tracked at £${Number(r.avg_cost_per_km || 0).toFixed(2)}/km real-world cost.`,
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Average mileage', value: Math.round(r.avg_mileage_km || 0), unitText: 'km' },
          { '@type': 'PropertyValue', name: 'Cost per km', value: Number(r.avg_cost_per_km || 0).toFixed(2), unitText: 'GBP/km' },
          { '@type': 'PropertyValue', name: 'Creator mentions', value: r.mention_count || 0 },
        ],
      },
    })),
  })}</script>`;
  html = html.replace(/<!-- SEO-SHOES-JSONLD-START -->[\s\S]*?<!-- SEO-SHOES-JSONLD-END -->/,
    `<!-- SEO-SHOES-JSONLD-START -->\n    ${ld}\n    <!-- SEO-SHOES-JSONLD-END -->`);

  writeFileSync(path, html);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  const [leads, posts, consensus] = await Promise.all([
    fetchJson('creator_seeding_leads?select=creator_name,creator_handle,subscriber_count,video_title,extracted_shoes,fleet_summary,rotation_confidence,snapshot_slug,vip_code,updated_at&status=neq.dismissed&snapshot_slug=not.is.null'),
    fetchJson('blog_posts?select=title,slug,excerpt,content,published_at,created_at&status=eq.published&order=published_at.desc'),
    fetchRpc('get_creator_shoe_consensus'),
  ]);
  const validPosts = posts.filter(p => p.slug);
  const validLeads = leads.filter(l => l.snapshot_slug);

  // 1. Static snapshot pages — real files => HTTP 200, no 404 fallback
  const snapshotTpl = readFileSync(join(ROOT, 'snapshot.html'), 'utf8');
  mkdirSync(join(ROOT, 'snapshot'), { recursive: true });
  for (const lead of validLeads) {
    writeFileSync(join(ROOT, 'snapshot', `${lead.snapshot_slug}.html`), bakeSnapshotPage(lead, snapshotTpl));
  }

  // 2. Static blog pages + /blog index
  mkdirSync(join(ROOT, 'blog'), { recursive: true });
  for (const post of validPosts) {
    writeFileSync(join(ROOT, 'blog', `${post.slug}.html`), blogPage(post, validPosts));
  }
  writeFileSync(join(ROOT, 'blog.html'), blogIndexPage(validPosts));

  // 3. Inject pre-baked leaderboard + KPIs + JSON-LD into shoes.html
  injectShoesPage(Array.isArray(consensus) ? consensus : []);

  // 4. Sitemap
  const urls = [
    ...STATIC_PAGES.map(p => ({ ...p, lastmod: today })),
    ...validPosts.map(p => ({
      loc: `/blog/${p.slug}`,
      lastmod: (p.published_at || p.created_at || '').slice(0, 10) || today,
      changefreq: 'monthly', priority: '0.7',
    })),
    ...validLeads.map(l => ({
      loc: `/snapshot/${l.snapshot_slug}`,
      lastmod: (l.updated_at || '').slice(0, 10) || today,
      changefreq: 'weekly', priority: '0.7',
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
  console.log(`sitemap.xml: ${STATIC_PAGES.length} static + ${validPosts.length} blog + ${validLeads.length} snapshot URLs`);
  console.log(`generated: ${validPosts.length} blog pages + blog.html + ${validLeads.length} snapshot pages + shoes.html injection`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
