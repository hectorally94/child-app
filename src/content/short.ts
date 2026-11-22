import type { Lang, Localized } from '../engine/types';
import data from './short/packs.json';
import { tr } from '../i18n';

/**
 * "Petits mots" (decision 2026-11-22): very short daily words (1–2 syllables, then two-word mini-phrases)
 * for a child who struggles with long phrases. Practiced in three daily sessions (morning / afternoon / evening),
 * every word repeated 3 times. Pictures live in public/pictures like the other word sets.
 */
export interface ShortWord {
  id: string;
  image: string;
  word: Localized;
  /** French syllables, shown as blocks and said slowly ("ma", "man"). */
  syllables: string[];
  /** Other spellings of the same sound that speech recognition often returns. */
  accept: string[];
  /** Listening packs: the sound Pipo makes ("miaou") while the child finds the matching picture. */
  sound?: Localized;
}

export interface ShortPack {
  id: string;
  order: number;
  /** One of the 11 collections (src/content/collections.ts). */
  collection: string;
  /** false = sounds and syllables: speech recognition cannot write them, so only "she spoke" is checked. */
  check?: boolean;
  /** "listen": a listening game (Pipo makes a sound, she finds the picture) instead of repetition. */
  kind?: 'say' | 'listen';
  title: Localized;
  words: ShortWord[];
}

export const shortKey = (packId: string) => `short:${packId}`;
export const isShortKey = (key: string) => key.startsWith('short:');

export function loadShortPacks(): ShortPack[] {
  return [...(data.packs as ShortPack[])].sort((a, b) => a.order - b.order);
}

/** Words of sound packs (syllables, vowels, animal noises): speech recognition cannot write them, so they are not checked. */
export function isSoundWord(wordId: string): boolean {
  return loadShortPacks().some((p) => p.check === false && p.words.some((w) => w.id === wordId));
}

/** Syllables to show for a language (only French words are split). */
export function syllablesFor(word: ShortWord, lang: Lang): string[] {
  return lang === 'fr' && word.syllables.length ? word.syllables : [tr(word.word, lang)];
}
