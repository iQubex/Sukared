# Luavex 2.0 public crawl readiness

Local frontend preparation only. Nothing was deployed, and backend/auth/API behavior was not changed.

## Public URLs and source maintenance

- Landing canonical: `https://luavex.pntr.dev/`
- Release-history canonical: `https://luavex.pntr.dev/releases.html`
- Sitemap: `https://luavex.pntr.dev/sitemap.xml`
- Both pages include readable initial HTML, one H1, normal links and public-safe release copy.
- Landing and release history snapshots are generated from the existing frontend copy/data. After editing those sources, run `node generate_public_pages.js`, then `node test_frontend_seo.js`. Commit/deploy the generated HTML together with its sources when deployment is separately authorized.
- No hash URLs, private pages, invented timestamps or auth/API URLs are in the sitemap.

The app continues to use hash routing. Hashes are not separate server resources and robots.txt cannot distinguish `/#/workspace` from `/`. Public releases therefore have a real static URL; no router migration was performed. The app applies `noindex, follow` to non-landing views. Legacy path entry documents also have noindex. Robots rules discourage crawling private/auth/API paths, but are not access control and cannot guarantee removal of already-known URLs.

## Metadata and social previews

Landing title: **Luavex 2.0 — Lua & Luau Obfuscator**

Description: **Protect your Lua and Luau scripts with Luavex 2.0. Create protected builds in the browser and explore the latest release notes.**

English language, black theme color, self-canonicals, complete OG and Twitter summary cards are present. The existing blue icon is the preview image (1254 × 1254 PNG); it is a square brand preview, not a new wide marketing image. Favicon references and the existing Google verification token are retained. No manifest existed and none was added.

Landing JSON-LD uses WebSite and SoftwareApplication (softwareVersion 2.0). Release history uses WebPage. No ratings, prices, reviews, customer counts or unsupported organization claims were added.

## Performance and hygiene observations

- Essential content paints from HTML without waiting for the app/Monaco scripts. External application scripts now defer while preserving their execution order.
- Existing fonts still use display=swap. Third-party font and editor-loader latency can still affect visual readiness; this task did not change their dependencies.
- Existing logo image dimensions are explicit; no new images/libraries or animations were added.
- The existing icon is 900,728 bytes; the wordmark sprite is 333,126 bytes. Smaller future favicon/social derivatives could reduce transfer cost, but neither branding asset was changed.
- Starfield implementation is unchanged: one guarded RAF loop, hidden-tab pause, reduced-motion/settings handling and DPR cap 2. Lifecycle tests pass; release history runs no application or animation scripts.
- No production LCP/CLS/INP or CPU score is claimed. Those require post-deploy measurement in the target environment.
- Local unknown URLs return a true HTTP 404 with the supplied 404 page. Static-host catch-all rewrites may still produce soft 404s; verify production response status rather than assuming the local result applies there.

## Exact post-deploy Search Console checklist

1. Open `https://luavex.pntr.dev/`, `/releases.html`, `/robots.txt`, `/sitemap.xml` and `/assets/luavex-icon-blue.png` while signed out. Confirm HTTP 200 and correct HTML/text/XML/image content types. Confirm any existing SPA fallback does not rewrite these files to index.html. Check an unknown URL returns 404. Do not change auth/API proxy rules.
2. In Google Search Console add/select the URL-prefix property **https://luavex.pntr.dev/**. Choose HTML-tag verification, confirm the already-present verification tag is in the deployed head, then click Verify. If using a Domain property instead, follow Search Console's DNS verification instructions; HTML-tag verification does not verify a Domain property.
3. Under Sitemaps submit **https://luavex.pntr.dev/sitemap.xml**. Confirm successful fetch and only the two public canonical URLs.
4. Inspect **https://luavex.pntr.dev/** and **https://luavex.pntr.dev/releases.html** separately. Run Test Live URL; inspect rendered HTML/content, crawl permission, indexing permission, HTTP status and the declared canonical. After indexing, compare Google's selected canonical with the declared one.
5. If live checks pass, request indexing for those two URLs. Do not request workspace/auth/API or hash application URLs. Indexing and ranking are not guaranteed.
6. Monitor Page indexing for robots exclusions, noindex, duplicate canonical selection and soft 404s. Check both public URLs stay allowed and private paths stay excluded from the sitemap. Review the Core Web Vitals report once field data is available.
7. Verify a real link preview can fetch the existing icon and correct page-specific title/description; cached previews may need refresh.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure), [sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [URL Inspection](https://support.google.com/webmasters/answer/9012289).

Remaining production verification: host static-file precedence, true 404 behavior, Search Console ownership/submission and live preview fetches. No local SEO test blocker remains. NO DEPLOY.
