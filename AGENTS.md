# 项目协作规则

这里是枣强门壹修的维修内容与运营主仓。查一条作品先读[作品索引](content/INDEX.md)。找制作源、交付包和网站子仓读[项目地图](docs/project-map.md)。

## 按任务选择入口

| 用户要做什么 | 从哪里开始 | 交付到哪里 |
| --- | --- | --- |
| 选题、写一版可配音的口稿 | [口稿写法](docs/口稿模板.md) | 对应作品目录的草稿 |
| “先存一下”、归档视频或给旧作品补链接 | [men-skill-douyin-archive](.agents/skills/men-skill-douyin-archive/SKILL.md) | 主仓的原件、归档记录和索引，可记录待补项 |
| 画门体动作、制作竖屏原理插镜 | [men-skill-mechanism-video](.agents/skills/men-skill-mechanism-video/SKILL.md) | 对应选题的可编辑工程和剪映素材 |
| 看后台数据、整理截图、更新复盘 | [men-skill-douyin-review](.agents/skills/men-skill-douyin-review/SKILL.md) | 作品目录里的带日期复盘 |
| 把已有素材整理成网站视频 FAQ | [men-skill-video-geo-faq](.agents/skills/men-skill-video-geo-faq/SKILL.md) | Web 子仓内的文章、媒体和相关入口 |
| “存档并发布”、更新常见故障并推送验收 | [men-skill-material-push](.agents/skills/men-skill-material-push/SKILL.md) | 视频、抖音链接、完整口稿齐备后，发布 Web 子仓，提交主仓归档和指针，检查线上页面 |
| 把一次现场维修写成网站案例 | [添加维修案例说明](website/zq-menyixiu-web/docs/添加维修案例说明.md) | Web 子仓的案例记录、配图和相应入口 |

历史对话里的 `men-material-push` 对应现在的 `men-skill-material-push`，`zq-menyixiu-video-geo-faq` 对应 `men-skill-video-geo-faq`。明确调用完整发布技能即按其约定执行。单独归档、制作或复盘按本次指定的交付范围处理。

项目技能统一维护在 `.agents/skills/men-skill-*/`，迭代时沿用原名。修改技能的约定和验证方法见[项目地图](docs/project-map.md#维护项目技能)。

## 浏览器操作

涉及网页查询、淘宝商品核对、登录页面或浏览器自动化时，先阅读并遵循 [Playwright 使用规则](docs/rules/playwright.md)。

- 默认使用 Playwright MCP 的无窗口模式（`--headless`），不得突然弹出浏览器或抢走用户正在使用的软件焦点。
- 需要人工登录、验证码或可见窗口时，先提醒用户；用户已明确要求现在打开或登录的，按其授权执行。
- 配置文件已加入 `--headless` 不代表当前 MCP 进程已经生效；不得用旧的有窗口会话试探性打开网页。
- 浏览器登录资料留在本机专用 profile 中，不写入项目或提交到 Git。
