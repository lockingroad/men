# 可编辑工程｜在副本上工作

直接剪辑请用上一级 `01-正片插镜/` 至 `04-实拍参考/`；不需要安装开发工具。本目录是交付时的制作快照，请复制本目录后再改，避免覆盖 1.0 版本。

| 想改什么 | 入口 |
| --- | --- |
| 6 秒对照的文字、颜色、时序 | [模板配置.json](app_research/模板配置.json) · [现成 SVG](app_research/遥控信号对比.svg)。`showLabels: false` 可关闭后加的标注，设备自身字样保留。 |
| 控制器或手持外观 | [控制器](app_research/src/photo-controller.mjs) · [手持遥控器](app_research/src/photo-remote.mjs)。两段动画都使用这些造型。 |
| 卷轴朝外、外罩或门帘模型 | [外卷几何](app_research/src/exterior-scene.mjs)。`content/` 中只放复用的材料长度模型和遮挡排序，**不含旧卷向的成片**。 |
| 9 秒四路对照 | [对照模板](app_research/补充素材/05-四种信号对照/对照模板.mjs) · [现成 SVG](app_research/补充素材/05-四种信号对照/四种信号对照.svg)。 |
| 刻度图 | [频率刻度.svg](app_research/补充素材/05-四种信号对照/频率刻度.svg)。 |

以下命令从**复制出的本目录**执行。先后路径不要打散；构建输出留在制作副本内，不会替换上一级的剪辑成品。

```sh
# 改 6 秒插镜的文字/时序。会复用已保存的外卷门缓存。
node app_research/src/build.mjs
node app_research/src/export.mjs

# 只有动了门的几何才需要先重烘、再重复上面两步。
ANATOMY_DIR="$PWD/vendor/anatomy" node app_research/src/door.mjs
ANATOMY_DIR="$PWD/vendor/anatomy" node --test app_research/src/exterior.test.mjs

# 改 9 秒插镜：--still 只更新 SVG/定格，--export 还会导出 MP4。
node 'app_research/补充素材/05-四种信号对照/对照模板.mjs' --export
```

重建 SVG 需要 Node.js；6 秒视频导出另需 Chrome/Chromium、Playwright、FFmpeg 与 ffprobe，9 秒视频导出另需 rsvg-convert、FFmpeg、ffprobe 与中文字体。这里不打包软件运行时，仅随附重建几何需要的 [Anatomy MIT 许可](vendor/anatomy/LICENSE) 和两个模块。官方页面抓取脚本在上一级 `03-官方整页/`，仅重抓时才需要联网；已有归档可离线阅读。
