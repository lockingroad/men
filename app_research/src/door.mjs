/**
 * Street-facing, exterior-roll installation. The SVG fragment contains real
 * projected vector parts. Only baking needs Anatomy and the earlier constant-
 * length curtain model; retiming the corrected cache works with just Node.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const local = name => new URL(name, import.meta.url);
const cache = local('door-layer.svgfrag');
const variant = 'exterior-roll-v1';
const source = local('../../content/卷帘门卷绕动画version1/');
const base = { fps: 30, duration: 6, liftStart: 1.30, liftEnd: 2.65, reset: 3 };
export const DOOR_VIEWBOX = '0 0 600 600';
const fmt = x => String(Number(x.toFixed(8)));
const smooth = x => x * x * (3 - 2 * x);

function timing(user = {}) {
  const o = { ...base, ...user };
  if (!['fps', 'duration', 'liftStart', 'liftEnd', 'reset'].every(k => Number.isFinite(o[k]))
    || !(o.fps >= 1 && o.fps <= 120 && o.liftStart >= 0 && o.liftStart < o.liftEnd
      && o.liftEnd < o.reset && o.reset < o.duration)) throw TypeError('Invalid door timing');
  return o;
}

function displayTrack(i, n, o) {
  const start = p => o.liftStart + (p / n) * (o.liftEnd - o.liftStart);
  // A tiny head start counters float rounding at precisely sampled frame times.
  const key = sec => fmt(Math.max(0, sec - 0.000002) / o.duration);
  const values = i === 0 ? 'inline;none;inline;inline' : 'none;inline;none;none';
  const t = i === 0 ? [0, key(start(1)), key(o.reset), 1]
    : [0, key(start(i)), key(i === n ? o.reset : start(i + 1)), 1];
  return `<animate attributeName="display" calcMode="discrete" values="${values}" keyTimes="${t.join(';')}" dur="${fmt(o.duration)}s" repeatCount="indefinite"/>`;
}

export function retimeDoor(fragment, options = {}) {
  const o = timing(options);
  const n = Number(fragment.match(/data-door-steps="(\d+)"/)?.[1]);
  if (!Number.isInteger(n) || n < 1) throw Error('Missing door pose data');
  let count = 0;
  const updated = fragment.replace(/(<g data-door-pose="(\d+)" display="(?:inline|none)">)<animate [^>]+\/>/g,
    (_, g, i) => { count++; return g + displayTrack(Number(i), n, o); });
  if (count !== n + 1) throw Error('Incomplete door pose data');
  return updated;
}

function simplify(markup) {
  return markup.replace(/<path [^>]* d=""\/>/g, '')
    // The old dark tracking stripe explained *winding*, not recognition.
    // Remove it from the signal comparison so it cannot be mistaken for an LED.
    .replace(/<g class="iso-solid[^"]*"(?: data-lit="")?[^>]*>/g, '<g>')
    .replace(/class="iso-line[^"]*" data-tone="([^"]+)"/g, (_, t) => `class="rdL rd-${t}"`)
    .replace(/class="iso-shade" data-shade="(\d)"/g, (_, i) => `class="rdS${i}"`)
    .replace(/class="iso-fill"/g, 'class="rdPaper"')
    .replace(/class="iso-top"/g, 'class="rdTop"')
    .replace(/class="shaft-mark"/g, 'class="rdMark"')
    .replace(/class="shaft-center"/g, 'class="rdCenter"');
}
const style = `<style>
.rdPaper{fill:var(--door-paper,#d6ddd8);stroke:none}.rdTop{fill:var(--door-top,#edf0e8);stroke:none}
.rdS0{fill:var(--door-shade-0,#889995);stroke:none}.rdS1{fill:var(--door-shade-1,#a5b2ac);stroke:none}
.rdS2{fill:var(--door-shade-2,#bdc9bf);stroke:none}.rdS3{fill:var(--door-shade-3,#cfd8cf);stroke:none}
.rdL{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.35;stroke:var(--door-edge,#485952)}
.rd-mid{stroke:var(--door-mid,#66756d)}.rd-lo{stroke:var(--door-lo,#8d9c91)}.rd-faint{stroke:var(--door-faint,#97a59a)}
.rdMark{stroke:var(--door-edge,#485952);stroke-linecap:round;stroke-width:3;fill:none}.rdCenter{fill:var(--door-edge,#485952)}
.rdHood{--door-paper:#daddd4;--door-top:#eff0e7;--door-shade-0:#a0a99d;--door-shade-1:#b8c0b2;--door-shade-2:#ccd1c4;--door-shade-3:#e0e2d6;--door-edge:#657065}
</style>`;

// Fit ALL poses with one camera. Never recenter a moving curtain in each frame.
function projectedExtent(bounds, shape, P, k, G) {
  const add = xyz => {
    const [x,y] = k.iso(xyz, P);
    bounds.left=Math.min(bounds.left,x); bounds.right=Math.max(bounds.right,x);
    bounds.top=Math.min(bounds.top,y); bounds.bottom=Math.max(bounds.bottom,y);
  };
  if (shape.kind === 'slab') {
    for (const xyz of k.boxCorners(shape.plan,shape.z,shape.z+shape.h)) add(xyz);
  } else {
    for (const s of [shape.s0,shape.s1]) {
      if (shape.kind === 'disc') {
        for(let j=0;j<32;j++) add(G.pointOf(shape.frame,s,shape.r,j*Math.PI/16));
      } else {
        const f=shape.frame;
        for (const [u,v] of shape.polygon) add(f.o.map((o,i)=>o+s*f.a[i]+u*f.u[i]+v*f.v[i]));
      }
    }
  }
}

async function bake(o) {
  const anatomy = process.env.ANATOMY_DIR || join(homedir(), '.codex', 'skills', 'anatomy');
  const [k, G, { CONFIG, modelAt }, { createExteriorScene }, { orderParts }, license] = await Promise.all([
    import(pathToFileURL(join(anatomy, 'kit/iso-kit.mjs'))), import(pathToFileURL(join(anatomy, 'kit/lathe.mjs'))),
    import(new URL('model.mjs', source)), import(local('exterior-scene.mjs')), import(new URL('order.mjs', source)),
    readFile(join(anatomy, 'LICENSE'), 'utf8'),
  ]);
  const scene = createExteriorScene(k, G, modelAt, CONFIG, orderParts);
  const n = Math.max(2, Math.round((o.liftEnd - o.liftStart) * o.fps));
  const shared = new Map();
  const shapes = [];
  function part(svg, hood = false) {
    const key = (hood?'hood:':'') + svg;
    if (!shared.has(key)) {
      const id = 'rdA' + shared.size.toString(36);
      shared.set(key, id);
      shapes.push(`<g id="${id}"${hood?' class="rdHood"':''}>${simplify(svg)}</g>`);
    }
    return shared.get(key);
  }
  const frames = [];
  const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity}, measured=new WeakSet();
  let straight;
  for (let i = 0; i <= n; i++) {
    const { items, marker, model } = scene.itemsAt(smooth(i / n));
    if (!(model.axis[0] - model.radius > model.guide[0] && model.exit[0] < model.axis[0])) throw Error('Exterior roll must stand forward of the curtain and feed from the rear.');
    const instances = items.map(item => {
      if (!measured.has(item.shape)) { projectedExtent(bounds,item.shape,scene.P,k,G); measured.add(item.shape); }
      if (item.name.startsWith('curtain.slat.')) {
        const pts = item.shape.polygon;
        // The same unbent slat on the straight track can reuse one master.
        // Its center moves only in Z, so orthographic projection is a translation.
        if (Math.abs(item.at[1]-model.guide[0]) < 1e-8 && Math.abs(pts[1][0] - pts[0][0]) < 1e-8 && pts[0][1] > pts[1][1]) {
          if (!straight) { straight = { at: k.iso(item.at, scene.P), id: part(item.svg) }; }
          const xy = k.iso(item.at, scene.P);
          const dy = Number((xy[1] - straight.at[1]).toFixed(2));
          return `<use href="#${straight.id}" y="${dy}"/>`;
        }
      }
      return `<use href="#${part(item.svg,/hood|housing/i.test(item.name))}"/>`;
    });
    frames.push(`<g data-door-pose="${i}" display="${i === 0 ? 'inline' : 'none'}">${displayTrack(i, n, o)}${instances.join('')}${simplify(marker)}</g>`);
  }
  const scale=Math.min(558/(bounds.right-bounds.left),572/(bounds.bottom-bounds.top));
  const tx=300-scale*(bounds.left+bounds.right)/2;
  const ty=296-scale*(bounds.top+bounds.bottom)/2;
  return `<!-- Anatomy geometry toolkit: ${license.trim()} -->
<g id="rd-door-assembly" data-winding="${variant}" data-door-steps="${n}">
${style}
<defs><radialGradient id="rdGround"><stop stop-color="#45574b" stop-opacity=".22"/><stop offset="1" stop-color="#45574b" stop-opacity="0"/></radialGradient>
${shapes.join('\n')}</defs>
<ellipse cx="301" cy="548" rx="240" ry="42" fill="url(#rdGround)"/>
<g transform="matrix(${fmt(scale)} 0 0 ${fmt(scale)} ${fmt(tx)} ${fmt(ty)})">
${frames.join('\n')}
</g></g>`;
}

export async function makeDoor(options = {}) {
  const o = timing(options);
  if (!options.bake) {
    try {
      const fragment=await readFile(cache,'utf8');
      if (fragment.includes(`data-winding="${variant}"`)) return retimeDoor(fragment,o);
    }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return bake(o);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fragment = await makeDoor({ bake: true });
  await writeFile(cache, fragment + '\n');
  console.log(`Wrote ${fileURLToPath(cache)} (${Buffer.byteLength(fragment)} bytes)`);
}
