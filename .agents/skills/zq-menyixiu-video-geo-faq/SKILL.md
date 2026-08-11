---
name: zq-menyixiu-video-geo-faq
description: Publish a 枣强门壹修 local-service short video as an evidence-led GEO/SEO FAQ in this Next.js repository. Use when adding a Douyin video FAQ, preparing a browser-compatible MP4/poster/evidence frames, adding FAQPage/Article/VideoObject JSON-LD, linking an FAQ to a service page, validating responsive video pages, or preparing a requested commit.
---

# 枣强门壹修视频 GEO FAQ

Turn one verified local-service video into a self-contained answer page that people, search engines, and AI systems can understand and cite.

## Before Editing

Read [references/site.md](references/site.md). It contains the site content model, routes, wording constraints, and required validation commands.

Inspect the repository and preserve unrelated changes. Read the full script or transcript, source URL, review notes, and dated public metrics. Probe the source video and inspect representative frames before writing.

## Workflow

1. Separate verified observations from promotional or absolute claims. Soften unsupported diagnoses and lead with stop-use, isolation, and power-off guidance for dangerous conditions.
2. Define one query-shaped H1 and a direct answer. Do not put volatile metrics in the title.
3. Prepare the hosted MP4, poster, and 3–5 evidence frames with `scripts/prepare_video_assets.py`. Use lowercase ASCII slugs and frame names. Do not pass `--force` until confirming the exact existing targets may be replaced.
4. Add one Markdown FAQ under `content/faq/`, using the established frontmatter fields rather than a parallel model.
5. Add or verify visible sub-FAQs and matching `BreadcrumbList`, `Article`, `FAQPage`, and `VideoObject` JSON-LD. Keep visible wording and structured data consistent.
6. Link the FAQ from its relevant service page and only genuinely related older FAQs. Add a reciprocal link when it helps users move between adjacent intents.
7. Add focused tests for new media, frontmatter, safety boundaries, and sitemap date. Run the complete validation set, inspect generated HTML, then check the page at 1280×720 and 390×844.
8. Commit or push only when the user explicitly requests it. Do not commit generated build output.

## Evidence and Safety Rules

- Store public plays, likes, and favorites as a dated snapshot via `performance.asOf`, and display that date beside the metrics.
- Keep the original platform URL in `sourceUrl`/`sameAs`; host a browser-compatible MP4 in `video.src`/`contentUrl`.
- Never invent the platform publication date. Use the website publish/update date and hosted-video upload date when the historical date is unknown.
- Do not state that a component is definitively broken unless the footage or inspection proves it. Use “可能”“需要检查”“确认后” when diagnosis remains conditional.
- Do not present adjustment of control sensitivity, safety edge, or anti-pinch settings as universal DIY advice.

## Media Preparation

Run from the repository root:

```bash
python3 .agents/skills/zq-menyixiu-video-geo-faq/scripts/prepare_video_assets.py \
  --input /absolute/path/source.mp4 \
  --public-dir "$PWD/public" \
  --slug descriptive-faq-slug \
  --poster-at 2.0 \
  --frame symptom-one=12.0 \
  --frame mechanism=31.5 \
  --frame safety-stop=55.0
```

Choose evidence frames after inspecting the finished video, not only the script.

## Completion Checklist

- Confirm duration, codec, dimensions, poster, and every image path.
- Confirm the direct answer, source link, metrics date, reviewer, service area, and phone are visible.
- Confirm visible FAQ questions match `FAQPage` entities.
- Confirm `VideoObject` has valid `contentUrl`, thumbnail, duration, upload date, and `sameAs`.
- Confirm sitemap uses the real update date and build files remain uncommitted.
- Report whether IndexNow was only dry-run or was actually submitted after deployment.
