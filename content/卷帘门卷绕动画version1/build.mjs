import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { Script } from 'node:vm';
import { modelAt, CONFIG } from './model.mjs';
import { createScene } from './scene.mjs';
import { orderParts } from './order.mjs';
import { createCloseup } from './closeup.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ANATOMY = process.env.ANATOMY_DIR || join(homedir(), '.codex', 'skills', 'anatomy');
const k = await import(pathToFileURL(join(ANATOMY, 'kit/iso-kit.mjs')));
const G = await import(pathToFileURL(join(ANATOMY, 'kit/lathe.mjs')));
const scene = createScene(k, G, modelAt, CONFIG, orderParts);
const theme = process.argv.includes('--dark') ? 'dark' : 'light';

function bundledModule(source, imports = '') {
  const names = [...source.matchAll(/^export (?:const|let|function|class)\s+(\w+)/gm)].map(match => match[1]);
  return `(()=>{${imports}\n${source.replace(/^import .*?;\s*$/gm, '').replace(/^export /gm, '')}\nreturn {${names.join(',')}};})()`;
}
const runtime = `const k=${bundledModule(readFileSync(join(ANATOMY, 'kit/iso-kit.mjs'), 'utf8'))};
const G=${bundledModule(readFileSync(join(ANATOMY, 'kit/lathe.mjs'), 'utf8'), 'const {cameraOf,iso,pathOf}=k;')};
const model=${bundledModule(readFileSync(join(HERE, 'model.mjs'), 'utf8'))};
const orderParts=${orderParts.toString()};
const createScene=${createScene.toString()};
const createCloseup=${createCloseup.toString()};
${readFileSync(join(HERE, 'live.js'), 'utf8')}`;
new Script(runtime, { filename: 'shutter-runtime.js' });
const safeRuntime = runtime.replace(/<\/script/gi, '<\\/script');
const style = readFileSync(join(HERE, 'style.css'), 'utf8');
const license = readFileSync(join(ANATOMY, 'LICENSE'), 'utf8');
const first = scene.draw(0);
const html = `<!doctype html>
<!-- Anatomy toolkit: ${license} -->
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>卷帘门怎样卷起来 · 门壹修</title>
<style>${k.ISO_CSS}\n${style}</style></head>
<body class="iso" data-theme="${theme}">
<main class="preview-shell">
<div id="video-stage" class="iso-plate" aria-label="卷帘门卷绕原理，十二秒竖屏动画">
<svg class="iso-svg" id="shutter-svg" viewBox="0 0 1080 1920" role="img" aria-labelledby="scene-title scene-description">
<title id="scene-title">卷帘门是怎样卷起来的？</title>
<desc id="scene-description">通用结构示意。门帘沿两侧导轨上升，相连帘片在上方转向并逐层卷在水平卷轴外；卷径逐渐增大，反转后门帘放下。</desc>
<defs><radialGradient id="ground-shadow"><stop offset="0" stop-color="var(--shadow-color)" stop-opacity=".19"/><stop offset="1" stop-color="var(--shadow-color)" stop-opacity="0"/></radialGradient><clipPath id="mechanism-crop"><rect x="60" y="452" width="910" height="960"/></clipPath></defs>
<rect width="1080" height="1920" fill="var(--page-color)"/>
<text class="eyebrow" x="84" y="146">门壹修 · 机械小课堂</text>
<text class="headline" x="80" y="255">卷帘门，</text>
<text class="headline" x="80" y="355">是怎样卷起来的？</text>
<text class="meta" x="84" y="421">通用结构示意 / 外罩与驱动机构省略</text>
<g id="overview" transform="translate(41.6 0) scale(.92)"><ellipse cx="520" cy="1430" rx="390" ry="87" fill="url(#ground-shadow)"/><g id="machine">${first.svg}</g></g>
<g clip-path="url(#mechanism-crop)"><g id="closeup" opacity="0"></g></g>
<text id="view-label" class="view-label" x="84" y="505" opacity="0">卷绕侧面 · 局部剖开示意</text>
<g id="caption-block"><text id="caption-index" class="caption-index" x="84" y="1465">01 / 卷绕原理</text>
<text id="caption-main" class="caption-main" x="80" y="1541">门帘升起后，藏到哪儿了？</text>
<text id="caption-sub" class="caption-sub" x="84" y="1604">看这片深色帘片，跟着它走。</text></g>
<rect x="84" y="1675" width="810" height="3" fill="var(--rule-color)"/>
<rect id="timeline-bar" x="84" y="1675" width="0" height="3" fill="var(--ink-color)"/>
<text class="footer" x="84" y="1742">衡水枣强 · 门壹修</text>
<text class="footer small" x="894" y="1742" text-anchor="end">结构与速度均为演示</text>
</svg></div>
<div class="controls"><button id="play" type="button">暂停</button><button id="replay" type="button">重播</button><label class="scrubber-label" for="scrubber">进度</label><input id="scrubber" type="range" min="0" max="12" step="0.01" value="0" aria-label="动画进度，单位秒"><span id="time-readout">0.0 / 12 秒</span></div>
<p class="preview-note">无配音小样 · 深色帘片仅为追踪标记 · 不对应具体产品型号</p>
<p id="accessible-state" class="sr-only" aria-live="polite"></p>
</main><script>${safeRuntime}</script></body></html>`;
const output = join(HERE, theme === 'dark' ? 'preview-dark.html' : 'preview.html');
writeFileSync(output, html);
writeFileSync(join(HERE, 'LICENSE-Anatomy.txt'), license);
console.log(`Built ${output} (${Buffer.byteLength(html)} bytes)`);

if (process.argv.includes('--audit')) {
  const A = await import(pathToFileURL(join(ANATOMY, 'kit/audit.mjs')));
  for (const progress of [0, 0.5, 1]) {
    const R = A.recorder(scene.P);
    const { items } = scene.itemsAt(progress);
    for (const [index, item] of items.entries()) {
      const s = item.shape;
      const meta = { name: item.name, owner: item.name.startsWith('curtain.') ? 'curtain' : undefined };
      let shape;
      if (s.kind === 'slab') shape = A.slab(s.plan, s.z, s.h, meta, 3);
      if (s.kind === 'disc') shape = A.disc(s.frame, s.s0, s.s1, s.r, meta);
      if (s.kind === 'prism') shape = A.prism(s.frame, s.polygon, s.s0, s.s1, meta);
      R.put({ name: item.name, piece: 'fixed', at: item.at, key: index, svg: item.svg, shapes: [R.solid(shape)] });
    }
    console.log(`POSE ${progress}`);
    const originalKeys = R.items.map(item => item.key);
    A.settle(R, scene.P, { step: 1 });
    R.items.forEach((item, index) => { item.key = originalKeys[index]; });
    const result = A.audit(R, scene.P);
    console.log(A.report(result));
    const failures = A.failures(result);
    console.log(failures ? `audit failed: ${failures} problems` : 'audit passed');
    mkdirSync(join(HERE, 'qa'), { recursive: true });
    writeFileSync(join(HERE, 'qa', `audit-${progress}.json`), JSON.stringify(result, null, 2));
    if (failures) process.exitCode = 1;
  }
}
