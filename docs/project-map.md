# 门壹修项目地图

门壹修用枣强本地维修经历制作短视频，并把适合长期查找的知识和案例放到网站。按作品找材料看[作品索引](../content/INDEX.md)，按用户请求选技能看[任务入口](../AGENTS.md)，两仓提交和同步看[Git 速查](../README.md)。

## 哪份文件可以改

| 要找的资料 | 维护位置 | 使用方式 |
| --- | --- | --- |
| 一期作品的身份、口稿、抖音链接、复盘与 FAQ 对应关系 | [作品索引](../content/INDEX.md) → 对应的 `content/` 作品目录 | 标题或文件名变动后沿用原作品 ID。正文、指标和媒体参数写回作品记录，索引只维护入口和必要状态。 |
| 手头实物、完整原稿、视频和出处 | [appv1 归档示例](../content/appv1/appv1.md) | 保留作者交来的原文和原件。整理给网站的表达、后来补的链接、采集数据的日期分别记录。 |
| 正在制作的动画 | [手机遥控插镜制作说明](../app_research/使用说明.md)、[卷绕模型与制作说明](../content/卷帘门卷绕动画version1/制作说明.md) | 从该期工程的配置、源码和实拍参照修改。两个工程之间有相对路径依赖。 |
| 已交给剪映的定版素材 | [手机遥控素材包](../resource_1.0/README.md)、[逐文件清单](../resource_1.0/素材清单.csv) | 用清单选片、确认来源及恢复方式。包内的可编辑工程是交付时的快照。修订时回制作源或复制该快照，另存新交付。 |
| 技术资料与选题假设 | [ESP32 配件与组装记录](../content/esp32/)、[抖音运营思考](../抖音运营思考/)、[GEO 计划](../geo/) | 查看记录日期与出处。选题假设可指导下一次验证。写入公开文章的结论须有对应证据。 |
| 网站可公开的内容 | [Web 子仓](../website/zq-menyixiu-web/README.md) | FAQ 正文进 `content/faq/`，案例进 `src/lib/config.js`，服务页资料进 `src/lib/service-pages.js`。这些路径以 **Web 子仓** 为根。 |

例如“改手机遥控那期动画”可从 [appv1 原稿](../content/appv1/appv1.md) 找到要说明的动作，进入[外卷门制作工程](../app_research/使用说明.md)改图并导出，再按[剪映交付清单](../resource_1.0/素材清单.csv)核对版本。“改这期网页的回答”则直接编辑[对应 FAQ](../website/zq-menyixiu-web/content/faq/phone-app-433mhz-roller-door.md)，保留归档原稿。

## 媒体如何找回

不同作品的媒体保存方式有差异。主仓默认忽略常见视频格式，完整归档的原件可以按文件设精确例外，如 [appv1 的归档规则](../content/appv1/.gitignore)。用 `git ls-files -- <文件>` 检查实际跟踪状态，用 `git check-ignore -v -- <文件>` 查看忽略来源。新的媒体记录应注明可恢复的仓库路径、本机原件位置、已知备份或具体重建入口。网页播放版可能已经转码，重建视频也可能因编码器版本产生不同的字节。找回同一原件以存档的 SHA-256 为准。

## 维护项目技能

1. 在 `.agents/skills/men-skill-<用途>/` 维护对应技能。目录名、`SKILL.md` 的 `name` 和 `agents/openai.yaml` 默认提示里的调用名保持一致。功能迭代沿用已有名称和目录。Git 历史记录每次修订。
2. 把修正写在执行该步骤的技能里。例如媒体输出位置由视频 FAQ 技能维护，完整发布技能调用它。一个新作品的核对结论留在作品文档。新建或更名时，同步更新[任务入口](../AGENTS.md)、调用它的其他技能、脚本路径和默认提示。
3. 用 `skill-creator` 附带的 `quick_validate.py` 检查技能格式。下面的示例从主仓根运行，Python 环境需有 PyYAML，其他安装位置可替换验证器路径。

   ```bash
   validator="${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py"
   python3 "$validator" .agents/skills/men-skill-douyin-archive
   ```

   如果默认 Python 缺少 PyYAML，本机有 uv 时可用 `uv run --no-project --with pyyaml python "$validator" .agents/skills/men-skill-douyin-archive` 在独立环境中运行同一检查。

4. 再用一个真实请求验证改动。例如“只归档，链接稍后补”应落到同一作品，补链接后仍用原 ID。“改手机遥控插镜”应找到当前外卷门工程并保留 1.0 交付包。调整 FAQ 的转码入口时，检查媒体写进 Web 的 `public/`。核对技能之间的分工时，可以使用本地样例验证，发布操作按具体业务请求执行。
