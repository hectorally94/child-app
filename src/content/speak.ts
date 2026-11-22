import type { Localized } from '../engine/types';
import setsData from './words/sets.json';
import reelsData from './talk/reels.json';

/**
 * Speaking content (decision 2026-11-22): daily words with pictures ("Mots") and short
 * conversation reels with Pipo and Tika ("Parler"). Data-driven like the writing lessons.
 * Pictures live in public/pictures/<image>.svg (Twemoji, CC-BY 4.0, plus our own table.svg).
 */
export interface Word {
  id: string;
  image: string;
  word: Localized; // with article: "la tasse"
  sentence: Localized; // "C'est une tasse de thé."
}

export interface WordSet {
  id: string;
  order: number;
  category: 'animals' | 'home' | 'food' | string;
  title: Localized;
  words: Word[];
}

export type Speaker = 'pipo' | 'tika';

export interface Reel {
  id: string;
  order: number;
  scene: 'morning' | 'park' | 'kitchen' | 'home' | 'night' | 'bathroom' | 'bedroom' | 'garden' | 'school' | string;
  /** One of the 11 collections (src/content/collections.ts): needs, my world, actions, feelings, sentences, school, social, questions. */
  collection: string;
  prop: string; // picture shown in the scene
  title: Localized;
  lines: { who: Speaker; text: Localized }[];
  /** What the child repeats; "{name}" is replaced by the child's first name. */
  repeat: Localized;
}

export const pictureUrl = (image: string) => `/pictures/${image}.svg`;

/** "Je suis content{e}" → "Je suis contente" for a girl; "{name}" → the child's first name. */
export function personalize(text: string, child: { name: string; gender?: 'f' | 'm' }): string {
  return text.replace(/\{name\}/g, child.name).replace(/\{e\}/g, child.gender === 'f' ? 'e' : '');
}

export function loadWordSets(): WordSet[] {
  return [...(setsData.sets as WordSet[])].sort((a, b) => a.order - b.order);
}

export function loadReels(): Reel[] {
  return [...(reelsData.reels as Reel[])].sort((a, b) => a.order - b.order);
}

/** Session ids for speaking activities share the session store with writing lessons. */
export const wordsKey = (id: string) => `words:${id}`;
export const talkKey = (id: string) => `talk:${id}`;
