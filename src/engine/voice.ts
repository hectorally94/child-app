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

/* ------------------------------------------------------------------ speech recognition */

/**
 * Speech recognition from the browser (Chrome/Android: Google's service, needs internet; Safari: Apple's).
 * The child's voice is sent to that service to be turned into text. Used only when the parent keeps
 * "Vérifier la prononciation" on. Returns every alternative the recognizer proposes.
 */
export type RecognizeResult =
  | { status: 'heard'; alternatives: string[] }
  | { status: 'nothing' } // no speech heard
  | { status: 'unavailable'; reason: string }; // not supported, offline, permission refused…

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart?: (() => void) | null;
  start: () => void;
  abort: () => void;
}

function recognitionClass(): (new () => RecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!recognitionClass() && navigator.onLine !== false;
}

export function recognize(lang: 'fr' | 'en', opts: { timeoutMs?: number; onStart?: () => void } = {}): Promise<RecognizeResult> {
  const Rec = recognitionClass();
  if (!Rec) return Promise.resolve({ status: 'unavailable', reason: 'unsupported' });
  if (navigator.onLine === false) return Promise.resolve({ status: 'unavailable', reason: 'offline' });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: RecognizeResult) => { if (!settled) { settled = true; window.clearTimeout(timer); resolve(r); } };
    const rec = new Rec();
    rec.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    const alternatives: string[] = [];
    rec.onaudiostart = () => opts.onStart?.();
    rec.onresult = (e) => {
      for (const result of Array.from(e.results)) for (const alt of Array.from(result)) if (alt.transcript.trim()) alternatives.push(alt.transcript.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') finish({ status: 'nothing' });
      else finish({ status: 'unavailable', reason: e.error });
    };
    rec.onend = () => finish(alternatives.length ? { status: 'heard', alternatives } : { status: 'nothing' });
    const timer = window.setTimeout(() => { try { rec.abort(); } catch { /* ignore */ } finish(alternatives.length ? { status: 'heard', alternatives } : { status: 'nothing' }); }, opts.timeoutMs ?? 8000);
    try { rec.start(); } catch { finish({ status: 'unavailable', reason: 'start-failed' }); }
  });
}
