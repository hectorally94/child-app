import type { Lang } from './types';

/**
 * Spoken instructions and feedback, with the device's text-to-speech.
 * Later, lessons can ship prerecorded audio (PRD §14), which will replace this.
 *
 * Phones (especially iPhone) only allow speech/sound after the user has touched the page once,
 * so `primeAudio()` runs on the first touch (see main.tsx) and unlocks both voice and sounds.
 */
const VOICE_LANG: Record<Lang, string> = { fr: 'fr', en: 'en' };

export interface SpeakOptions {
  pitch?: number; // 0..2, 1 = normal
  rate?: number; // 0.1..10, 1 = normal
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(VOICE_LANG[lang]));
  // Prefer a local (offline) voice, then a female-sounding default if the platform names it.
  return voices.find((v) => v.localService && /female|femme|amelie|audrey|marie|google français/i.test(v.name))
    ?? voices.find((v) => v.localService)
    ?? voices[0];
}

function utterance(text: string, lang: Lang, opts: SpeakOptions = {}): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? (lang === 'fr' ? 'fr-FR' : 'en-US');
  u.rate = opts.rate ?? 0.85;
  u.pitch = opts.pitch ?? 1.05;
  u.volume = 1;
  return u;
}

export function speak(text: string, lang: Lang, opts?: SpeakOptions): void {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  synth.speak(utterance(text, lang, opts));
}

/**
 * Feedback after an attempt: a short sound, then a clearly spoken first word ("Bravo !" or "Faux !"),
 * then the rest of the sentence. Example: speakFeedback('Faux. Commence au point vert.', 'fr', false).
 */
export function speakFeedback(text: string, lang: Lang, success: boolean): void {
  playSound(success ? 'success' : 'miss');
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const m = text.match(/^([^.!?]+[.!?])\s*(.*)$/); // first short sentence = the verdict
  const [verdict, rest] = m && m[1].length <= 14 ? [m[1], m[2]] : [text, ''];
  const say = () => {
    synth.speak(utterance(verdict.replace(/\.$/, ' !'), lang, success ? { pitch: 1.35, rate: 0.9 } : { pitch: 0.95, rate: 0.8 }));
    if (rest) synth.speak(utterance(rest, lang));
  };
  // let the sound play first
  window.setTimeout(say, success ? 260 : 220);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* ------------------------------------------------------------------ sounds */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain = 0.18, slideTo?: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  o.connect(g).connect(ac.destination);
  o.start(ac.currentTime + start);
  o.stop(ac.currentTime + start + dur + 0.05);
}

/** Small sounds made by the app itself (no files, works offline). */
export function playSound(kind: 'success' | 'miss' | 'unlock'): void {
  const ac = audio();
  if (!ac) return;
  if (kind === 'success') {
    // bright rising chime: C – E – G
    tone(ac, 523, 0, 0.16, 'triangle');
    tone(ac, 659, 0.08, 0.16, 'triangle');
    tone(ac, 784, 0.16, 0.28, 'triangle');
  } else if (kind === 'miss') {
    // soft low "boing", never harsh
    tone(ac, 330, 0, 0.22, 'sine', 0.16, 196);
  } else {
    tone(ac, 659, 0, 0.12, 'triangle');
    tone(ac, 880, 0.1, 0.12, 'triangle');
    tone(ac, 1047, 0.2, 0.3, 'triangle');
  }
}

/** Call once on the first touch: unlocks speech and sound on phones that require a user gesture. */
export function primeAudio(): void {
  audio();
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    window.speechSynthesis.getVoices(); // starts loading the voice list
  }
}
