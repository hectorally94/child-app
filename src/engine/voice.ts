/**
 * Microphone practice for speaking (PRD §14, initial version): record the child, notice that she spoke,
 * play her voice back. Nothing is uploaded or stored: the recording lives only in memory until the next one.
 * Pronunciation is NOT graded (PRD: speech recognition must not be treated as authoritative).
 */
export type RecordResult =
  | { status: 'spoke'; url: string | null; seconds: number }
  | { status: 'silent'; url: string | null }
  | { status: 'unavailable' }; // no microphone, or permission refused

let lastUrl: string | null = null;

export function micSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Record until the child stops talking (or maxMs). `onLevel` receives the voice level 0..1 for an animation.
 */
export async function recordVoice(opts: { maxMs?: number; onLevel?: (level: number) => void } = {}): Promise<RecordResult> {
  if (!micSupported()) return { status: 'unavailable' };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return { status: 'unavailable' };
  }
  const maxMs = opts.maxMs ?? 5000;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ac = AC ? new AC() : null;
  const analyser = ac?.createAnalyser();
  if (ac && analyser) {
    analyser.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(analyser);
  }
  const recorder = typeof MediaRecorder !== 'undefined' ? new MediaRecorder(stream) : null;
  const chunks: Blob[] = [];
  recorder?.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
  recorder?.start();

  const started = performance.now();
  let voicedMs = 0;
  let lastVoice = 0;
  // Room noise: the quietest level seen in the first moments, capped, so a child who starts
  // talking right away is not mistaken for background noise.
  let quietest = Infinity;
  const buf = new Float32Array(analyser?.fftSize ?? 1024);

  await new Promise<void>((resolve) => {
    let prev = started;
    const tick = () => {
      const now = performance.now();
      const dt = now - prev;
      prev = now;
      let level = 0;
      if (analyser) {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        level = Math.sqrt(sum / buf.length);
      }
      if (now - started < 600) quietest = Math.min(quietest, level);
      const noise = Math.min(0.03, Math.max(0.004, (Number.isFinite(quietest) ? quietest : 0.01) * 1.5));
      const voiced = level > Math.max(0.02, noise * 2.2);
      if (voiced) { voicedMs += dt; lastVoice = now; }
      opts.onLevel?.(Math.min(1, level * 8));
      const elapsed = now - started;
      const doneTalking = voicedMs > 350 && now - lastVoice > 900; // spoke, then a short silence
      if (elapsed >= maxMs || doneTalking) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve(null);
    recorder.addEventListener('stop', () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null), { once: true });
    recorder.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  void ac?.close();

  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = blob ? URL.createObjectURL(blob) : null;
  return voicedMs > 350 ? { status: 'spoke', url: lastUrl, seconds: voicedMs / 1000 } : { status: 'silent', url: lastUrl };
}

/** Play the child's own voice back (returns when finished). */
export function playRecording(url: string | null): Promise<void> {
  return new Promise((resolve) => {
    if (!url) return resolve();
    const a = new Audio(url);
    a.onended = () => resolve();
    a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}
