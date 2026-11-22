import type { Lang } from './types';

/**
 * Spoken instructions. For now this uses the device's text-to-speech.
 * Later, lessons can ship prerecorded audio (PRD §14), which will replace this.
 * Kirundi has no TTS voice on most devices, so nothing is spoken for `rn` unless a voice exists.
 */
const VOICE_LANG: Record<Lang, string> = { en: 'en', fr: 'fr', rn: 'rn' };

export function speak(text: string, lang: Lang): void {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(VOICE_LANG[lang]));
  if (!voice && lang === 'rn') return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? VOICE_LANG[lang];
  u.rate = 0.85;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
