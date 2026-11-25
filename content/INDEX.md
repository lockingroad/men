# 门壹修作品索引

按作品 ID 找口稿、平台来源、复盘和网站稿。每期沿用同一个 ID；补链接或改稿时更新原行。网站栏链接到 Web 子模块中的文章，公开路径为 `/faq/<文件名去掉 .md>`。表中“未记录”表示当前归档里没有这项记录。

## 口播作品

| 作品 ID · 主题 | 口稿或脚本 | 平台来源与复盘 | 网站稿 |
| --- | --- | --- | --- |
| `remote-2.1` · 拷贝码交叉对拷与一控两门 | [口稿](遥控%202.1/遥控2.1复盘.md) | [抖音](https://v.douyin.com/cnXhSRFLEFM/) · [数据摘录](遥控%202.1/遥控2.1内容.md) | [拷贝码对拷](../website/zq-menyixiu-web/content/faq/remote-copy-code-guide.md) |
| `remote-3.0` · 遥控丢失后清除旧学习码、重新配对 | [口稿与拍摄脚本](遥控3.0/遥控3.0内容.md) | [创作者后台来源及复盘](遥控3.0/遥控3.0复盘.md) | 未找到对应作品页 |
| `remote-4.0` · 新遥控器上下按键反了 | [拍摄脚本](遥控4.0/遥控4.0内容.md) | [抖音，取自网站稿](https://v.douyin.com/fVRpYKxrJME/) · 复盘未记录 | [按键反向](../website/zq-menyixiu-web/content/faq/remote-button-reversed.md) |
| `limit-1.0` · 关门留缝与限位调节 | [口稿](限位器1.0/限位器1.0内容.md) | [抖音](https://v.douyin.com/pQu5oOQaNd0/) · [复盘](限位器1.0/限位器1.0复盘.md) | [关门留缝](../website/zq-menyixiu-web/content/faq/roller-door-limit-adjustment.md) |
| `limit-3.0` · 限位调整无效、跑位或溜车 | [拍摄脚本](限位器3.0/限位器3.0%20内容.md) | [抖音](https://v.douyin.com/2RjY6RITNes/) · [数据摘录](限位器3.0/限位器3.0复盘.md) | [限位故障排查](../website/zq-menyixiu-web/content/faq/roller-door-limit-adjustment-not-working.md) |
| `backup-power-1` · 停电时用储备电源开门 | [口稿](储备电源version1/储备电源v1.md) | [抖音](https://v.douyin.com/G-z7M2rZWEU/) · [同文件内的复盘](储备电源version1/储备电源v1.md#数据复盘) | [储备电源快接头](../website/zq-menyixiu-web/content/faq/roller-door-backup-power.md) |
| `motor-1` · 雪后电机只响不动 | [口稿](电机1/电机1.md) | [抖音](https://v.douyin.com/DXMBU8TJd-4/) · 复盘未记录 | [雪后只响不动](../website/zq-menyixiu-web/content/faq/roller-door-motor-brake-freezing.md) |
| `controller-plug-1` · 控制器插头误插 | [亲历背景与优化稿](控制器插头避坑version1/控制器插头避坑v1.md) | [抖音](https://v.douyin.com/PSl4LMKcYyA/) · 复盘未记录 | [控制器插头](../website/zq-menyixiu-web/content/faq/roller-door-controller-plug-mistakes.md) |
| `appv1` · 手机 App 能否直接开卷帘门 | [用户原稿、原视频名与 SHA-256](appv1/appv1.md) | [抖音](https://v.douyin.com/HYqCegsU89Q/) · 复盘未记录 | [手机 App 与 433 MHz 遥控器](../website/zq-menyixiu-web/content/faq/phone-app-433mhz-roller-door.md) |

**找原片。** 先查口稿所在目录。`appv1` 的原视频已在主仓 Git 单独跟踪。其余七条有网站稿的作品在本机各有视频，主仓按视频忽略规则处理；Web 子模块另存发布用的 [FAQ 视频](../website/zq-menyixiu-web/public/videos/faq/)。`remote-3.0` 目录中未找到本地视频，现有作品来源是需登录的创作者后台详情页。

## 专题工程与资料

| ID · 主题 | 工作入口 | 交付或用途 |
| --- | --- | --- |
| `roller-winding-1` · 卷绕原理动画 | [模型、构建与验收说明](卷帘门卷绕动画version1/制作说明.md) | 12 秒动画小样；部分模型供 `appv1` 的外卷插镜复用。 |
| `esp32-433` · ESP32 与 CC1101 硬件研究 | [购买清单](esp32/购买清单.md) · [组装指南](esp32/组装指南.md) | 内部研究资料；公开引用时逐项核对设备及证据。 |

`appv1` 的手机与遥控器对照插镜在 [app_research](../app_research/使用说明.md) 继续编辑。剪映选片和定版素材从 [resource_1.0](../resource_1.0/README.md) 取用；逐件来源、校验值和恢复方式见 [交付清单](../resource_1.0/素材清单.csv)。
