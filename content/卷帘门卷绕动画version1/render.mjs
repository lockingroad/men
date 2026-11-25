import { chromium } from "/Users/zhihu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGE = join(HERE, "preview.html");
const DARK_PAGE = join(HERE, "preview-dark.html");
const QA = join(HERE, "qa");
const VIDEO = join(HERE, "卷帘门怎样卷起来-v1.mp4");
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const SECONDS = 12;
const FRAME_COUNT = FPS * SECONDS;
const flags = new Set(process.argv.slice(2));

if (flags.has("--help")) {
  console.log("node render.mjs [--qa-only | --video-only]\nDefault: keyframes, mobile QA, then a 12-second 1080×1920 H.264 MP4.");
  process.exit(0);
}
for (const flag of flags) {
  if (!["--qa-only", "--video-only"].includes(flag)) throw new Error(`Unknown flag: ${flag}`);
}
if (flags.has("--qa-only") && flags.has("--video-only")) throw new Error("Use either --qa-only or --video-only, not both.");

const report = {
  input: PAGE,
  createdAt: new Date().toISOString(),
  configuration: { width: WIDTH, height: HEIGHT, fps: FPS, seconds: SECONDS, headless: true, offline: true },
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  blockedNetworkRequests: [],
  captures: [],
};

function attachDiagnostics(page, name) {
  page.on("console", (message) => {
    const entry = { page: name, text: message.text(), location: message.location() };
    if (message.type() === "error") report.consoleErrors.push(entry);
    else if (message.type() === "warning") report.consoleWarnings.push(entry);
  });
  page.on("pageerror", (error) => report.pageErrors.push({ page: name, text: String(error.stack || error) }));
}

function pageUrl(exporting, filename = PAGE) {
  const url = pathToFileURL(filename);
  if (exporting) url.searchParams.set("export", "1");
  return url.href;
}

async function ready(page, exporting, filename = PAGE) {
  await page.goto(pageUrl(exporting, filename), { waitUntil: "load" });
  await page.waitForFunction(() => window.demoReady === true && typeof window.renderAt === "function", null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

async function setTime(page, seconds) {
  await page.evaluate(async (time) => {
    await window.renderAt(time);
  }, seconds);
}

async function captureBox(page) {
  const stage = page.locator("#video-stage");
  await stage.waitFor({ state: "visible" });
  const box = await stage.boundingBox();
  if (!box || Math.abs(box.width - WIDTH) > 0.01 || Math.abs(box.height - HEIGHT) > 0.01) {
    throw new Error(`Export stage must be ${WIDTH}×${HEIGHT}, got ${JSON.stringify(box)}`);
  }
  if (box.x < -0.01 || box.y < -0.01 || box.x + box.width > WIDTH + 0.01 || box.y + box.height > HEIGHT + 0.01) {
    throw new Error(`Export stage must fit the viewport without scrolling: ${JSON.stringify(box)}`);
  }
  return { x: Math.max(0, box.x), y: Math.max(0, box.y), width: WIDTH, height: HEIGHT };
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("Capture is not a PNG.");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function screenshotFrame(page, clip, filename) {
  const buffer = await page.screenshot({ type: "png", clip, scale: "css", animations: "disabled", caret: "hide" });
  const size = pngSize(buffer);
  if (size.width !== WIDTH || size.height !== HEIGHT) throw new Error(`Wrong PNG size: ${JSON.stringify(size)}`);
  if (filename) await writeFile(filename, buffer);
  return buffer;
}

async function captureJunction(page, theme) {
  await setTime(page, 3);
  const cap = await page.locator('[data-part="bearing.cap.1"]').boundingBox();
  if (!cap) throw new Error("Cannot locate the right bearing for the junction close-up.");
  const centerX = cap.x + cap.width / 2;
  const centerY = cap.y + cap.height / 2;
  const clip = {
    x: Math.round(Math.max(0, Math.min(WIDTH - 320, centerX - 250))),
    y: Math.round(Math.max(0, Math.min(HEIGHT - 320, centerY - 150))),
    width: 320, height: 320, scale: 4,
  };
  const cdp = await page.context().newCDPSession(page);
  try {
    const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip });
    const buffer = Buffer.from(result.data, "base64");
    const size = pngSize(buffer);
    if (size.width !== clip.width * clip.scale || size.height !== clip.height * clip.scale) throw new Error(`4× browser rasterization returned the wrong size: ${JSON.stringify(size)}`);
    const filename = join(QA, `junction-right-${theme}-4x.png`);
    await writeFile(filename, buffer);
    report.captures.push({ seconds: 3, theme, filename, ...size, clip, kind: "browser-rasterized-closeup" });
    console.log(`QA 4× junction: ${theme}`);
  } finally {
    await cdp.detach();
  }
}

async function testPlayback(page) {
  const time = () => page.locator("#scrubber").evaluate(element => Number(element.value));
  await setTime(page, 2);
  await page.locator("#play").click();
  await page.waitForFunction(() => Number(document.getElementById("scrubber").value) > 2.15, null, { timeout: 5000 });
  const advanced = await time();
  await page.locator("#play").click();
  const pausedAt = await time();
  await page.waitForTimeout(220);
  const afterPause = await time();
  const pausedLabel = await page.locator("#play").innerText();
  const paused = Math.abs(afterPause - pausedAt) < 0.000001 && pausedLabel === "播放";
  await setTime(page, 9.24);
  await page.locator("#scrubber").press("ArrowRight");
  const scrubbed = await time();
  const readout = await page.locator("#time-readout").innerText();
  await page.waitForTimeout(180);
  const scrubStayed = await time();
  await page.locator("#replay").click();
  const replayAt = await time();
  await page.waitForFunction(() => Number(document.getElementById("scrubber").value) > 0.15, null, { timeout: 5000 });
  const replayAdvanced = await time();
  await setTime(page, 6);
  const result = {
    advancedFrom: 2, advancedTo: advanced,
    pausedAt, afterPause, paused,
    scrubbed, scrubStayed, scrubReadout: readout,
    sliderPassed: Math.abs(scrubbed - 9.25) < 0.001 && scrubStayed === scrubbed && readout.includes("9.3"),
    replayAt, replayAdvanced, replayPassed: replayAt < 0.5 && replayAdvanced > 0.15,
  };
  result.passed = advanced > 2.15 && result.paused && result.sliderPassed && result.replayPassed;
  report.interactions = result;
  console.log(`QA interactions: ${result.passed ? "passed" : "failed"}`);
}

async function runQa(browser, page, clip) {
  for (const seconds of [0, 3, 5.5, 6, 7, 8, 10]) {
    await setTime(page, seconds);
    const filename = join(QA, `frame-${String(seconds).replace(".", "p").padStart(2, "0")}s.png`);
    await screenshotFrame(page, clip, filename);
    report.captures.push({ seconds, theme: "light", filename, width: WIDTH, height: HEIGHT });
    console.log(`QA keyframe: ${seconds}s`);
  }
  await captureJunction(page, "light");

  await access(DARK_PAGE);
  const dark = await page.context().newPage();
  attachDiagnostics(dark, "dark");
  try {
    await ready(dark, true, DARK_PAGE);
    await setTime(dark, 0);
    const darkClip = await captureBox(dark);
    for (const seconds of [3, 6]) {
      await setTime(dark, seconds);
      const filename = join(QA, `dark-${String(seconds).padStart(2, "0")}s.png`);
      await screenshotFrame(dark, darkClip, filename);
      report.captures.push({ seconds, theme: "dark", filename, width: WIDTH, height: HEIGHT });
      console.log(`QA dark keyframe: ${seconds}s`);
    }
    await captureJunction(dark, "dark");
  } finally {
    await dark.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce", offline: true });
  await context.route(/^https?:\/\//, async (route) => {
    report.blockedNetworkRequests.push(route.request().url());
    await route.abort("internetdisconnected");
  });
  const mobile = await context.newPage();
  attachDiagnostics(mobile, "mobile");
  try {
    await ready(mobile, false);
    await setTime(mobile, 6);
    const filename = join(QA, "phone-390.png");
    await mobile.screenshot({ path: filename, fullPage: true, animations: "disabled", caret: "hide", scale: "css" });
    report.mobile = await mobile.evaluate(() => {
      const rect = document.getElementById("video-stage").getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        stage: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        text: document.getElementById("video-stage").innerText,
      };
    });
    report.mobile.filename = filename;
    console.log(`QA mobile: ${report.mobile.horizontalOverflow ? "horizontal overflow detected" : "no horizontal overflow"}`);
    await testPlayback(mobile);
  } finally {
    await context.close();
  }
}

async function renderVideo(page, clip) {
  const partial = join(HERE, `卷帘门怎样卷起来-v1.partial-${process.pid}.mp4`);
  const ffmpeg = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
    "-f", "image2pipe", "-vcodec", "png", "-framerate", String(FPS), "-i", "pipe:0",
    "-an", "-frames:v", String(FRAME_COUNT),
    "-vf", "scale=1080:1920:out_color_matrix=bt709,format=yuv420p,setsar=1",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-threads", "4",
    "-r", String(FPS), "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-movflags", "+faststart", "-metadata", "title=卷帘门怎样卷起来｜通用结构示意", partial,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  let pipeError;
  ffmpeg.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-12_000); });
  ffmpeg.stdin.on("error", (error) => { pipeError = error; });
  const completion = new Promise((resolve) => {
    ffmpeg.once("error", (error) => resolve({ error }));
    ffmpeg.once("close", (code, signal) => resolve({ code, signal }));
  });
  try {
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      if (pipeError) throw pipeError;
      await setTime(page, frame / FPS);
      const buffer = await screenshotFrame(page, clip);
      await new Promise((resolve, reject) => ffmpeg.stdin.write(buffer, (error) => error ? reject(error) : resolve()));
      if ((frame + 1) % 60 === 0) console.log(`Video: ${frame + 1}/${FRAME_COUNT} frames`);
    }
    ffmpeg.stdin.end();
    const result = await completion;
    if (result.error || result.code !== 0) throw new Error(`ffmpeg failed: ${result.error || result.signal || result.code}\n${stderr}`);
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", partial], { maxBuffer: 1_000_000 });
    const probe = JSON.parse(stdout);
    const video = probe.streams.find((stream) => stream.codec_type === "video");
    const audio = probe.streams.filter((stream) => stream.codec_type === "audio");
    if (!video || video.codec_name !== "h264" || video.width !== WIDTH || video.height !== HEIGHT || video.pix_fmt !== "yuv420p" || video.avg_frame_rate !== `${FPS}/1` || Number(video.nb_read_frames) !== FRAME_COUNT || audio.length || Math.abs(Number(probe.format.duration) - SECONDS) > 0.01) {
      throw new Error(`Video validation failed:\n${stdout}`);
    }
    await rename(partial, VIDEO);
    report.video = { filename: VIDEO, codec: video.codec_name, pixelFormat: video.pix_fmt, width: video.width, height: video.height, fps: video.avg_frame_rate, frames: Number(video.nb_read_frames), seconds: Number(probe.format.duration), bytes: Number(probe.format.size), audioTracks: audio.length };
    await writeFile(join(QA, "ffprobe.json"), stdout + "\n");
    console.log(`Video complete: ${VIDEO}`);
  } catch (error) {
    ffmpeg.stdin.destroy();
    ffmpeg.kill("SIGTERM");
    await completion;
    throw error;
  }
}

let browser;
try {
  await access(PAGE);
  await access(CHROME);
  await mkdir(QA, { recursive: true });
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--disable-background-networking", "--disable-component-update", "--disable-default-apps", "--disable-sync"] });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, reducedMotion: "reduce", offline: true });
  await context.route(/^https?:\/\//, async (route) => {
    report.blockedNetworkRequests.push(route.request().url());
    await route.abort("internetdisconnected");
  });
  const page = await context.newPage();
  attachDiagnostics(page, "export");
  await ready(page, true);
  await setTime(page, 0);
  const clip = await captureBox(page);
  if (!flags.has("--video-only")) await runQa(browser, page, clip);
  if (!flags.has("--qa-only")) await renderVideo(page, clip);
  if (report.consoleErrors.length || report.pageErrors.length || report.blockedNetworkRequests.length || report.mobile?.horizontalOverflow || report.interactions?.passed === false) {
    throw new Error("QA found browser errors, network dependencies, horizontal overflow, or broken interactions; see qa/report.json.");
  }
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = String(error.stack || error);
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await mkdir(QA, { recursive: true });
  await writeFile(join(QA, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${join(QA, "report.json")}`);
}
