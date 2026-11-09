#!/usr/bin/env node
// Regenerates sitemap.xml with static pages + every public Fleet Snapshot slug.
// Run: node scripts/generate-sitemap.js   (then commit + push to publish)

const { writeFileSync } = require('fs');
const { join } = require('path');

const SUPABASE_URL = 'https://vpeszlbrrqwsmnhqdtpf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BNR1EmmFbVi-Bs72NSnvzw_thlz3W6b';
const BASE = 'https://www.treadleft.app';

const STATIC_PAGES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/shoes', changefreq: 'daily', priority: '0.8' },
  { loc: '/release-notes', changefreq: 'weekly', priority: '0.6' },
  { loc: '/legal-privacy', changefreq: 'monthly', priority: '0.3' },
  { loc: '/legal-terms', changefreq: 'monthly', priority: '0.3' },
];

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/creator_seeding_leads?select=snapshot_slug,updated_at&status=neq.dismissed&snapshot_slug=not.is.null`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const leads = await res.json();

  const urls = [
    ...STATIC_PAGES.map(p => ({ ...p, lastmod: today })),
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

  writeFileSync(join(__dirname, '..', 'sitemap.xml'), xml);
  console.log(`sitemap.xml written: ${STATIC_PAGES.length} static + ${leads.length} snapshot URLs`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
