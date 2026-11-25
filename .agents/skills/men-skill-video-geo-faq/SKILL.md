---
name: men-skill-video-geo-faq
description: 为枣强门壹修已有视频制作或更新网站 GEO FAQ，包括托管视频、证据帧、结构化数据、服务入口和本地验收。用于编辑 FAQ、增补抖音来源或准备发布内容。
---

# 枣强门壹修视频 FAQ

先读主仓库 `AGENTS.md` 和本 skill 的[网站模型与验收](references/site.md)。素材在主仓库 `content/`；FAQ Markdown、媒体、模板、npm 命令均在 Web 子模块 `website/zq-menyixiu-web/`。独立调用默认完成本地页面与验证，commit/push 依用户授权；从完整发布入口调用时，交回该入口处理两个仓库。

## 从视频写成问题页

- 阅读原稿、抖音原链接、已有复盘及带日期的表现数据，探测源视频并检查代表画面。标题直接写访客的问题，开头给出答案，再写必要原因和处理建议。区分视频实际展示、技术推断和需现场确认的情况。对危险故障先提示停用、隔离或断电；具体诊断、报价和时效要有依据。必要时核对官方资料，服务口径采用网站配置。
- 在子模块的 `content/faq/<slug>.md` 使用已有 frontmatter。保留稳定 slug，`sourceUrl` 对应用户提供的抖音入口，`video.src` 对应实际托管 MP4；动画、屏幕演示可填写 `video.label: "原理讲解"`。不确定的抖音发布时间留空。网站发布／更新时间、托管视频上传时间、`performance.asOf` 各按自身事实填写。指标仅在来源和快照日期可核实时展示。
- 新增 FAQ 时将 slug 加入子模块 `src/lib/config.js` 的 `HOME_FAQ_SLUGS`，确保首页与「常见故障」列表均有可访问的新页面入口，并用相关服务的 `relatedFaqs` 或既有入口关联；只给确有关系的旧 FAQ 补链接，保留原先有效的入口及 URL。页面可见问题与 `FAQPage` 一致，`Article.citation`、`VideoObject.sameAs` 均指向原始抖音链接。只补链接时更新页面来源与相关校验，复用原视频和既有日期。

## 媒体

先用 `ffprobe` 和代表帧选择封面及少量能支持正文的画面，执行本 skill 自带的 `scripts/prepare_video_assets.py`。以下示例在 **men 主仓库根目录** 执行，输入文件、slug 和时间点须按本条素材替换。若 skill 安装在其他位置，脚本路径改用本 skill 目录下的实际路径。编码探测、图片检查和播放器验证均以实际成品为准。脚本以 H.264 生成网页 MP4，已有音频转为 AAC。使用 `--force` 前核实确切覆盖目标。

```bash
python3 .agents/skills/men-skill-video-geo-faq/scripts/prepare_video_assets.py \
  --input "content/<素材目录>/<原视频>.mp4" \
  --public-dir "$PWD/website/zq-menyixiu-web/public" \
  --slug "<slug>" \
  --poster-at "<封面秒数>" \
  --frame "<画面名>=<秒数>"
```

## 本地验收

按[网站参考的验证步骤](references/site.md)在子模块执行全套现有命令，检查生成 HTML、JSON-LD、sitemap 日期、媒体参数及每个图片 URL；页面应显示直答、来源、署名、相关服务和联系方式，展示指标时附采集日期。针对新媒体、链接或内容边界补足必要校验。新增页面或布局变化时，按主仓库 `docs/rules/playwright.md` 使用无窗口浏览器检查桌面和手机尺寸，确认视频可播放、图片完整、页面无横向溢出或错误、底部拨号栏未遮挡必要内容。补链接时检查生成页面和相应来源字段。交付实际 FAQ 路径、媒体与验证结果，并标明 IndexNow 预检或获授权后的实际提交状态。
