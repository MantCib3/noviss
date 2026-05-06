/**
 * NOVISS Blog Static Page Generator
 *
 * Reads posts.json and outputs a static HTML file for each post at:
 *   blog/<slug>/index.html
 *
 * Each page has its own <title>, meta description, OG/Twitter tags, and
 * JSON-LD — making every article individually indexable by search engines.
 *
 * Run:  node generate-blog.js
 * Then: commit the blog/ folder alongside the rest of the site.
 *
 * Also regenerates sitemap.xml to include all blog post URLs.
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL   = 'https://noviss-osint.com';
const POSTS_FILE = path.join(__dirname, 'posts.json');
const BLOG_DIR   = path.join(__dirname, 'blog');
const SITEMAP    = path.join(__dirname, 'sitemap.xml');
const CSP        = `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; base-uri 'self'; form-action 'none';`;

const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));

// ── Helpers ──────────────────────────────────────────────────────────────────

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-AU', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
        timeZone: 'UTC',
    });
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildPage(post) {
    const url         = `${BASE_URL}/blog/${post.slug}/`;
    const title       = `${esc(post.title)} | NOVISS OSINT`;
    const description = esc(post.lead);
    const image       = esc(post.image);
    const imageAlt    = esc(post.imageAlt);
    const dateDisplay = formatDate(post.dateISO);
    const bodyHtml    = post.body.map(p => `        <p>${esc(p)}</p>`).join('\n');

    const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type':    'Article',
        headline:   post.title,
        description: post.lead,
        datePublished: post.dateISO,
        author: { '@type': 'Organization', name: 'NOVISS Team' },
        publisher: {
            '@type': 'Organization',
            name:    'NOVISS OSINT',
            url:     BASE_URL,
        },
        image:      post.image,
        url,
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${CSP}">
    <title>${title}</title>

    <!-- SEO -->
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${url}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">

    <!-- Open Graph -->
    <meta property="og:type"        content="article">
    <meta property="og:url"         content="${url}">
    <meta property="og:title"       content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image"       content="${image}">
    <meta property="og:image:alt"   content="${imageAlt}">
    <meta property="og:site_name"   content="NOVISS OSINT">
    <meta property="og:locale"      content="en_AU">
    <meta property="article:published_time" content="${esc(post.dateISO)}">

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:url"         content="${url}">
    <meta name="twitter:title"       content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image"       content="${image}">
    <meta name="twitter:image:alt"   content="${imageAlt}">

    <!-- Performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&family=Bebas+Neue&display=swap">
    <link rel="stylesheet" href="/styles.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
${jsonLd}
    </script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">NOVISS</a>
            <ul class="nav-menu">
                <li><a href="/#core-service">What We Do</a></li>
                <li><a href="/#pricing-cards">Pricing</a></li>
                <li><a href="/#process">How It Works</a></li>
                <li><a href="/#faq">FAQ</a></li>
                <li><a href="/#contact">Contact</a></li>
                <li><a href="/#blog">Blog</a></li>
            </ul>
        </div>
    </nav>

    <main class="article-static">
        <div class="article-static-inner">
            <a href="/#blog" class="article-back-btn">&larr; Back</a>

            <div class="article-tag-pill">${esc(post.tag)}</div>
            <h1 class="article-static-title">${esc(post.title)}</h1>

            <div class="article-meta-row">
                <span class="article-date">${dateDisplay} &middot; ${esc(post.readingTime)}</span>
            </div>

            <img
                src="${image}"
                alt="${imageAlt}"
                class="article-image"
                loading="eager"
            >

            <div class="article-body">
${bodyHtml}
            </div>
        </div>
    </main>
</body>
</html>`;
}

// ── Generate pages ────────────────────────────────────────────────────────────

let generated = 0;
for (const post of posts) {
    const dir = path.join(BLOG_DIR, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), buildPage(post), 'utf8');
    console.log(`  ✓  blog/${post.slug}/index.html`);
    generated++;
}

// ── Regenerate sitemap.xml ────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const postUrls = posts.map(p => `
    <url>
        <loc>${BASE_URL}/blog/${p.slug}/</loc>
        <lastmod>${p.date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${BASE_URL}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>${postUrls}
</urlset>
`;

fs.writeFileSync(SITEMAP, sitemap, 'utf8');
console.log(`  ✓  sitemap.xml updated`);

console.log(`\nDone — ${generated} article${generated !== 1 ? 's' : ''} generated.\n`);
