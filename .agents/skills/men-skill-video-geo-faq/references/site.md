# 枣强门壹修网站参考

以下文件路径和命令均相对于 men 主仓库的 `website/zq-menyixiu-web/` 子模块。素材原件及作品索引位于主仓库 `content/`。

## Content Model

- FAQ Markdown: `content/faq/*.md`
- Reader and normalizer: `src/lib/markdown.js`
- FAQ detail template: `src/app/faq/[slug]/page.js`
- FAQ list: `src/app/faq/page.js`
- Homepage FAQ selection and service wording: `src/lib/config.js` (including `HOME_FAQ_SLUGS`)
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

Use `date` for website publication, `updated` for the website revision, and `video.uploadDate` for the hosted video's upload. Record the original Douyin publication date only when the source provides it. Include `performance` only for observed metrics and set `performance.asOf` to the observation date.

## Linking

- Connect limit-adjustment material to `/services/motor-limit-repair`.
- Connect remote-control material to `/services/remote-control-repair`.
- Link normal adjustment guidance and diagnostic follow-up content both ways when their intents are distinct.
- Link only genuinely related older FAQs such as automatic rebound, motor humming, remote failure, or door movement problems.
- Keep URLs stable; add routes instead of renaming existing ones.

## Public Wording

- Read the current brand, response wording and service promises from `BRAND_NAME`, `SERVICE_RESPONSE_TEXT`, `SERVICE_RESPONSE_NOTE` and `SERVICE_PROMISES` in `src/lib/config.js`.
- Do not publish `免费上门`, `县城内15分钟达`, unconfirmed 24-hour opening, or unverified price levels.
- Do not prescribe weakening anti-pinch or safety protection without model-specific instructions and onsite inspection.

## Validation

Run in the Web submodule:

```bash
npm test
npm run build
npm run indexnow:dry
git diff --check
```

Inspect generated HTML for one H1, visible direct answer, all FAQ questions, parseable JSON-LD, source URL, hosted video URL, dates for any metrics shown, service link, and real sitemap `lastmod`.

For a new page or changed layout, use headless Playwright at 1280×720 and 390×844. For a link-only update, inspect the generated source link and structured data. Confirm MP4 metadata readiness, no horizontal overflow, no important content covered by the mobile call bar, and no console errors.
