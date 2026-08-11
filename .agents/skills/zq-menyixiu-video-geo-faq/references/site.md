# 枣强门壹修网站参考

## Content Model

- FAQ Markdown: `content/faq/*.md`
- Reader and normalizer: `src/lib/markdown.js`
- FAQ detail template: `src/app/faq/[slug]/page.js`
- FAQ list: `src/app/faq/page.js`
- Service data: `src/lib/service-pages.js`
- Service template: `src/app/services/[slug]/page.js`
- Shared CSS: `src/index.css`
- Public media: `public/videos/faq/` and `public/images/faq/<slug>/`

Reuse these frontmatter fields:

```yaml
title: "Query-shaped title"
date: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
tag: "Short category"
excerpt: "Direct answer for FAQ list"
directAnswer: "Visible page direct answer"
readTime: "N分钟"
featured: true
sourceUrl: "https://v.douyin.com/.../"
video:
  src: "/videos/faq/slug.mp4"
  title: "Factual video title"
  description: "Factual video description"
  uploadDate: "YYYY-MM-DDT00:00:00+08:00"
  duration: "PT1M11S"
  durationLabel: "71秒"
  mimeType: "video/mp4"
  width: 720
  height: 1280
poster: "/images/faq/slug/poster.jpg"
images: []
performance:
  asOf: "YYYY-MM-DD"
  plays: 77000
  playsLabel: "7.7万"
  likes: 566
  favorites: 680
relatedService:
  href: "/services/remote-control-repair"
  label: "查看相关维修服务"
  description: "Why this service is relevant"
faqs: []
reviewer: "刘金灿"
```

Use the website publication date when the original Douyin date is unknown. `performance.asOf` must state when the public metrics were observed.

## Linking

- Connect limit-adjustment material to `/services/motor-limit-repair`.
- Connect remote-control material to `/services/remote-control-repair`.
- Link normal adjustment guidance and diagnostic follow-up content both ways when their intents are distinct.
- Link only genuinely related older FAQs such as automatic rebound, motor humming, remote failure, or door movement problems.
- Keep URLs stable; add routes instead of renaming existing ones.

## Public Wording

- Brand: `枣强门壹修`
- Response: `通常约30分钟响应，实际响应及到达时间以距离和当时工单为准`
- Promise: `价格透明、不修不收费`
- Do not publish `免费上门`, `县城内15分钟达`, unconfirmed 24-hour opening, or unverified price levels.
- Do not prescribe weakening anti-pinch or safety protection without model-specific instructions and onsite inspection.

## Validation

Run:

```bash
npm test
npm run build
npm run indexnow:dry
git diff --check
```

Inspect generated HTML for one H1, visible direct answer, all FAQ questions, parseable JSON-LD, source URL, hosted video URL, dated metrics, service link, and real sitemap `lastmod`.

Test at least 1280×720 and 390×844. Confirm MP4 metadata readiness, no horizontal overflow, no important content covered by the mobile call bar, and no console errors.
