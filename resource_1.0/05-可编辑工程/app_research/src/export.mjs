/** Export the standalone SMIL SVG, sampling its own clock, not wall-clock playback.
 * node src/export.mjs                         # validate before replacing MP4
 * node src/export.mjs --sample 0,25,68,89,90,150,179  # temporary PNGs only
 * node src/export.mjs --verify                # inspect the existing MP4 only
 * Optional: CHROME_PATH, PLAYWRIGHT_MODULE, FFMPEG_PATH, FFPROBE_PATH.
 */
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdtemp, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const folder = fileURLToPath(new URL('../', import.meta.url));
const input = join(folder, '遥控信号对比.svg');
const output = join(folder, '遥控信号对比.mp4');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const width = 1080, height = 1920, fps = 30, frames = 180;
const args = process.argv.slice(2);

async function playwright() {
  const specifier = process.env.PLAYWRIGHT_MODULE;
  if (specifier) return import(isAbsolute(specifier) ? pathToFileURL(specifier).href : specifier);
  try { return await import('playwright'); } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    const bundled = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    await access(bundled).catch(() => { throw new Error('Playwright not found. Set PLAYWRIGHT_MODULE to its index.mjs.'); });
    return import(pathToFileURL(bundled).href);
  }
}

async function verify(filename) {
  const { stdout } = await run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', filename]);
  const metadata = JSON.parse(stdout), v = metadata.streams[0];
  if (metadata.streams.length !== 1 || v.codec_type !== 'video' || v.codec_name !== 'h264'
    || v.width !== width || v.height !== height || v.pix_fmt !== 'yuv420p' || v.avg_frame_rate !== '30/1'
    || Number(v.nb_read_frames) !== frames || Math.abs(Number(metadata.format.duration) - frames/fps) > 0.001)
    throw new Error('Export failed stream checks:\n' + stdout);
  // Check actual MP4 atom order, not only that +faststart was requested.
  const fd = await open(filename, 'r'), header = Buffer.alloc(8);
  try {
    const size = (await fd.stat()).size;
    let moov = false, data = false;
    for (let at = 0; at + 8 <= size;) {
      if ((await fd.read(header, 0, 8, at)).bytesRead !== 8) break;
      const tag = header.toString('ascii', 4), bytes = header.readUInt32BE();
      if (tag === 'moov') moov = true;
      if (tag === 'mdat') { data = true; break; }
      if (bytes < 8) break;
      at += bytes;
    }
    if (!moov || !data) throw new Error('MP4 not faststart: moov box must precede mdat.');
  } finally { await fd.close(); }
  return `${width}×${height}, 6.00 s, ${frames} frames @ ${fps} fps, H.264/yuv420p, no audio, faststart`;
}

async function withRenderer(operation) {
  const svg = await readFile(input, 'utf8');
  const { time } = JSON.parse(await readFile(join(folder, '模板配置.json'), 'utf8'));
  const { chromium } = await playwright();
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' && await access(macChrome).then(() => true, () => false) ? macChrome : undefined);
  const browser = await chromium.launch({ headless: true, executablePath,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-default-apps', '--disable-sync', '--force-color-profile=srgb'] });
  try {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, offline: true, serviceWorkers: 'block' });
    const errors = [];
    await context.route(/^(?:https?|file):/i, async route => { errors.push('External resource: ' + route.request().url()); await route.abort(); });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.setContent('<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}body>svg{display:block;width:100%;height:100%}</style>');
    await page.evaluate(async text => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const invalid = doc.querySelector('parsererror');
      if (invalid) throw new Error('Invalid XML: ' + invalid.textContent.slice(0, 300));
      const node = document.importNode(doc.documentElement, true);
      if (!(node instanceof SVGSVGElement) || !node.querySelector('animate,animateTransform,set,animateMotion')) throw new Error('Expected an animated SMIL SVG.');
      document.body.append(node);
      node.pauseAnimations(); node.setCurrentTime(0);
      await document.fonts.ready;
      const b = node.getBoundingClientRect();
      if (b.width !== innerWidth || b.height !== innerHeight) throw new Error('SVG does not cover the export viewport.');
    }, svg);
    const capture = async frame => {
      await page.evaluate(async ({ t, time }) => {
        const root = document.body.firstElementChild;
        root.setCurrentTime(t);
        await new Promise(requestAnimationFrame);
        if (!root.animationsPaused() || Math.abs(root.getCurrentTime() - t) > 0.0001) throw new Error('SMIL time mismatch at ' + t);
        const phone = t + 1e-6 >= time.switch;
        const vis = id => getComputedStyle(document.getElementById(id)).visibility === 'visible';
        const nearEvent = Object.values(time).some(value => Math.abs(value - t) < 0.00001);
        if (!root.querySelector('#same-door [data-winding="exterior-roll-v1"]')) throw new Error('Expected the exterior-roll shutter, not the old cache.');
        const poses = [...root.querySelectorAll('[data-door-pose]')].filter(node => getComputedStyle(node).display !== 'none');
        if (poses.length !== 1) throw new Error('Door has no unique pose at ' + t);
        const pose = Number(poses[0].dataset.doorPose);
        if (!nearEvent && (vis('ordinary-phone') !== phone || vis('original-remote') === phone
          || (phone && (pose !== 0 || vis('rf-path') || getComputedStyle(document.getElementById('receiver-active')).opacity !== '0'))
          || (!phone && t < time.liftStart && pose !== 0)
          || (!phone && t > time.liftEnd && pose !== Number(root.querySelector('[data-door-steps]').dataset.doorSteps))))
          throw new Error('Door or signal does not match the intended experiment at ' + t);
      }, { t: frame / fps, time });
      // Do not disable animations through Playwright: that would end or reset SMIL.
      const png = await page.screenshot({ type: 'png', scale: 'css', caret: 'hide', animations: 'allow' });
      if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw new Error('Wrong PNG dimensions.');
      if (errors.length) throw new Error(errors.join('\n'));
      return png;
    };
    await operation(capture);
  } finally { await browser.close(); }
}

async function encode(capture) {
  const partial = join(folder, `.signal-${randomUUID()}.partial.mp4`);
  const proc = spawn(ffmpeg, ['-hide_banner','-loglevel','error','-nostdin','-n','-f','image2pipe','-vcodec','png',
    '-framerate',String(fps),'-i','pipe:0','-map','0:v:0','-an','-frames:v',String(frames),
    '-vf','scale=iw:ih:out_color_matrix=bt709,format=yuv420p,setsar=1','-c:v','libx264','-crf','17','-preset','medium',
    '-threads','4','-r',String(fps),'-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',partial],
  { stdio: ['pipe','ignore','pipe'] });
  let log = '', pipeError;
  proc.stderr.on('data', chunk => { log = (log + chunk).slice(-4000); });
  proc.stdin.on('error', e => { pipeError = e; });
  const done = new Promise(resolve => { proc.once('error', error => resolve({error})); proc.once('close', code => resolve({code})); });
  try {
    const signatures = new Set();
    for (let i = 0; i < frames; i++) {
      const png = await capture(i);
      if (pipeError) throw pipeError;
      signatures.add(createHash('sha256').update(png).digest('base64'));
      await new Promise((ok, bad) => proc.stdin.write(png, error => error ? bad(error) : ok()));
      if ((i + 1) % 30 === 0) console.log(`Frames: ${i + 1}/${frames}`);
    }
    proc.stdin.end();
    const result = await done;
    if (result.error || result.code !== 0) throw new Error('ffmpeg failed: ' + (result.error || result.code) + '\n' + log);
    if (signatures.size < 4) throw new Error('Fewer than four unique frames; refusing to publish a static/broken render.');
    const info = await verify(partial);
    await rename(partial, output);
    console.log(info + '\n' + output);
  } catch (e) {
    proc.stdin.destroy(); proc.kill('SIGTERM'); await done;
    if (log) console.error(log);
    throw e;
  } finally { await unlink(partial).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}

if (!args.length) await withRenderer(encode);
else if (args.length === 1 && args[0] === '--verify') console.log(await verify(output));
else if (args.length === 2 && args[0] === '--sample') {
  if (!/^\d+(,\d+)*$/.test(args[1])) throw new Error('Use zero-based frame numbers separated by commas.');
  const indices = [...new Set(args[1].split(',').map(Number))];
  if (indices.some(i => i < 0 || i >= frames)) throw new Error('Frame number must be 0–179.');
  await withRenderer(async capture => {
    const dir = await mkdtemp(join(tmpdir(), 'rf-sample-'));
    for (const i of indices) await writeFile(join(dir, `frame-${String(i).padStart(3, '0')}.png`), await capture(i));
    console.log(dir);
  });
} else if (args.length === 1 && args[0] === '--help') console.log('Usage: node src/export.mjs [--sample 0,25,68,89,90,150,179 | --verify]');
else throw new Error('Unknown arguments; see --help.');
