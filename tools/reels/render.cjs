/**
 * Renders the cartoon clips of the "Pause vidéos" feed.
 *
 *   node tools/reels/render.cjs            # all clips
 *   node tools/reels/render.cjs ferme      # one clip
 *
 * Needs: Playwright (global or local) and ffmpeg with libx264 in the PATH.
 * Output: public/reels/<id>.mp4 (540×960, 20 fps, no audio), <id>.webm (same clip for devices without H.264),
 * <id>.jpg (poster) and catalog.json.
 * studio.html draws each frame from the time t, so captions in catalog.json line up exactly with the picture.
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { SCENES, TIMING, duration, cues } = require('./scenes.cjs');

/** ffmpeg with libvpx for the WebM copy (the system one may lack it; imageio-ffmpeg from pip has it). */
const FFMPEG = process.env.FFMPEG_VPX || 'ffmpeg';

const OUT = path.resolve(__dirname, '../../public/reels');
const STUDIO = 'file://' + path.resolve(__dirname, 'studio.html');
const only = process.argv[2];

async function renderScene(browser, scene) {
  const page = await browser.newPage({ viewport: { width: TIMING.width, height: TIMING.height }, deviceScaleFactor: 1 });
  await page.goto(STUDIO);
  await page.evaluate((id) => window.setupScene(id), scene.id);
  await page.waitForFunction(() => window.READY === true);

  const file = path.join(OUT, `${scene.id}.mp4`);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TIMING.fps), '-c:v', 'mjpeg', '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-profile:v', 'main',
    '-movflags', '+faststart', file,
  ]);
  let err = '';
  ff.stderr.on('data', (d) => (err += d));
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed: ' + err)))));

  const total = Math.round(duration(scene) * TIMING.fps);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.seek(t), f / TIMING.fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;

  // WebM copy (VP8) for browsers without H.264
  await new Promise((res, rej) => {
    const w = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', file, '-an', '-c:v', 'libvpx', '-b:v', '450k', '-crf', '32', '-pix_fmt', 'yuv420p', file.replace(/\.mp4$/, '.webm')]);
    let e = '';
    w.stderr.on('data', (d) => (e += d));
    w.on('close', (c) => (c === 0 ? res() : rej(new Error('webm failed: ' + e))));
  });

  // poster: the first step, just after it pops in
  await page.evaluate((t) => window.seek(t), TIMING.intro + 1.0);
  await page.screenshot({ path: path.join(OUT, `${scene.id}.jpg`), type: 'jpeg', quality: 80 });
  await page.close();
  return { file, seconds: total / TIMING.fps };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const list = SCENES.filter((s) => !only || s.id === only);
  if (!list.length) throw new Error('unknown clip: ' + only);
  for (const scene of list) {
    const t0 = Date.now();
    const { file, seconds } = await renderScene(browser, scene);
    console.log(`${scene.id}: ${seconds.toFixed(1)} s, ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)} s to render`);
  }
  await browser.close();

  // the catalog always lists every clip that has a file
  const items = SCENES.filter((s) => fs.existsSync(path.join(OUT, `${s.id}.mp4`))).map((s) => ({
    id: s.id,
    kind: 'video',
    src: `/reels/${s.id}.mp4`,
    srcWebm: `/reels/${s.id}.webm`,
    poster: `/reels/${s.id}.jpg`,
    seconds: +duration(s).toFixed(1),
    bytes: fs.statSync(path.join(OUT, `${s.id}.mp4`)).size,
    title: s.title,
    collection: s.collection,
    audio: false,
    cues: cues(s),
    repeat: s.repeat,
    credit: 'Dessins animés originaux. Images : Twemoji (CC-BY 4.0).',
  }));
  fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify({ version: 1, items }, null, 1) + '\n');
  console.log(`catalog.json: ${items.length} clips`);
})();
