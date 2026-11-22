import type { Lang } from './types';

/**
 * Spoken instructions. For now this uses the device's text-to-speech.
 * Later, lessons can ship prerecorded audio (PRD §14), which will replace this.
 */
const VOICE_LANG: Record<Lang, string> = { fr: 'fr', en: 'en' };

export function speak(text: string, lang: Lang): void {
  if (!('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(VOICE_LANG[lang]));
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
