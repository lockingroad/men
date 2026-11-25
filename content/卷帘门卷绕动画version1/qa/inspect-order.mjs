import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONFIG, modelAt } from '../model.mjs';
import { createScene } from '../scene.mjs';
import { orderParts } from '../order.mjs';

const anatomy = process.env.ANATOMY_DIR || join(homedir(), '.codex', 'skills', 'anatomy');
const k = await import(pathToFileURL(join(anatomy, 'kit/iso-kit.mjs')));
const G = await import(pathToFileURL(join(anatomy, 'kit/lathe.mjs')));
const A = await import(pathToFileURL(join(anatomy, 'kit/audit.mjs')));
const scene = createScene(k, G, modelAt, CONFIG, orderParts);
const progressValues = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : Array.from({ length: 21 }, (_, i) => i / 20);

for (const progress of progressValues) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new Error('Progress must be a number from 0 to 1.');
  const started = performance.now();
  const R = A.recorder(scene.P);
  const sceneItems = scene.itemsAt(progress).items;
  const sortStats = { ...orderParts.lastStats };
  const ranks = new Map(sceneItems.map((item, index) => [item.name, index]));
  for (const item of sceneItems) {
    const s = item.shape;
    const meta = { name: item.name, owner: item.name.startsWith('curtain.') ? 'curtain' : undefined };
    let shape;
    if (s.kind === 'slab') shape = A.slab(s.plan, s.z, s.h, meta, 3);
    if (s.kind === 'disc') shape = A.disc(s.frame, s.s0, s.s1, s.r, meta);
    if (s.kind === 'prism') shape = A.prism(s.frame, s.polygon, s.s0, s.s1, meta);
    if (!shape) throw new Error(`Unrecognized shape: ${item.name} (${s.kind})`);
    R.put({ name: item.name, piece: 'fixed', at: item.at, key: item.key, svg: item.svg, shapes: [R.solid(shape)] });
  }
  const originalKeys = R.items.map(item => item.key);
  const settled = A.settle(R, scene.P, { step: 1 });
  const solvedDepth = A.depthOrder(settled.items, scene.P, { overlaps: settled.overlaps, solved: settled.solved });
  const changedKeys = R.items.filter((item, index) => Math.abs(item.key - originalKeys[index]) > 1e-9).length;
  R.items.forEach((item, index) => { item.key = originalKeys[index]; });
  const actualDepth = A.depthOrder(settled.items, scene.P, { overlaps: settled.overlaps, solved: settled.solved });
  R.items.forEach(item => { item.key = ranks.get(item.name); });
  const satDepth = A.depthOrder(settled.items, scene.P, { overlaps: settled.overlaps });
  console.log(JSON.stringify({
    progress,
    seconds: (performance.now() - started) / 1000,
    items: R.items.length,
    sampledStep: settled.overlaps.step,
    changedKeys,
    originalProblems: actualDepth.problems.length,
    settledProblems: solvedDepth.problems.length,
    satProblems: satDepth.problems.length,
    actualRenderProblems: satDepth.problems.length,
    sortStats,
    originalMissing: actualDepth.missing,
    originalPairs: actualDepth.problems.map(({ front, back, area, against, cycle }) => ({ front, back, area, against, cycle })),
    satPairs: satDepth.problems.map(({ front, back, area, against, cycle }) => ({ front, back, area, against, cycle })),
  }, null, 2));
  if (satDepth.problems.length || sortStats.cycles) process.exitCode = 1;
}

const timings = [];
let worstCycles = 0;
for (let i = 0; i < 120; i++) {
  scene.itemsAt(i / 119);
  timings.push(orderParts.lastStats.milliseconds);
  worstCycles = Math.max(worstCycles, orderParts.lastStats.cycles);
}
timings.sort((a, b) => a - b);
console.log(JSON.stringify({ performance: { frames: timings.length, medianMs: timings[60], p95Ms: timings[114], maxMs: timings.at(-1), worstCycles } }, null, 2));
