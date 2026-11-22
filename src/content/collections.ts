import type { Localized } from '../engine/types';

/**
 * The 11 speaking collections (the parent's plan, 2026-11-22), from simple sounds up to questions.
 * "Petits mots" fills collections 01–07 with words; "Parler" fills 03–06 and 08–11 with phrases and conversations.
 * Pictures are Twemoji codes (public/pictures).
 */
export interface Collection {
  id: string;
  n: number; // 1..11, shown as "01".."11"
  icon: string;
  title: Localized;
  purpose: Localized;
}

export const COLLECTIONS: Collection[] = [
  { id: 'sons', n: 1, icon: '1f444', title: { fr: 'Bouche et sons', en: 'Mouth & sounds' }, purpose: { fr: 'Syllabes, sons, écoute', en: 'Simple syllables, sounds, listening' } },
  { id: 'premiers', n: 2, icon: '1f5e3', title: { fr: 'Premiers mots', en: 'First words' }, purpose: { fr: 'Maman, papa, eau, oui, non', en: 'Mama, papa, water, yes, no' } },
  { id: 'besoins', n: 3, icon: '1f964', title: { fr: 'Mes besoins', en: 'My needs' }, purpose: { fr: 'Manger, boire, aide, stop, encore', en: 'Eat, drink, help, stop, more' } },
  { id: 'monde', n: 4, icon: '1f3e0', title: { fr: 'Mon monde', en: 'My world' }, purpose: { fr: 'Maison, famille, école, objets', en: 'Home, family, school, objects' } },
  { id: 'actions', n: 5, icon: '1f3c3', title: { fr: 'Les actions', en: 'Action words' }, purpose: { fr: 'Viens, va, joue, donne, prends', en: 'Come, go, play, give, take' } },
  { id: 'emotions', n: 6, icon: '1f60a', title: { fr: 'Mes émotions', en: 'My feelings' }, purpose: { fr: 'Content, triste, peur, fâché', en: 'Happy, sad, afraid, angry' } },
  { id: 'deux', n: 7, icon: '270c', title: { fr: 'Deux mots', en: 'Two words' }, purpose: { fr: 'Petites combinaisons', en: 'Simple combinations' } },
  { id: 'phrases', n: 8, icon: '1f4ac', title: { fr: 'Premières phrases', en: 'My first sentences' }, purpose: { fr: 'Phrases de tous les jours', en: 'Everyday sentences' } },
  { id: 'ecole', n: 9, icon: '1f3eb', title: { fr: "À l'école", en: 'School communication' }, purpose: { fr: 'Maîtresse, aide, question, réponse', en: 'Teacher, help, question, answer' } },
  { id: 'social', n: 10, icon: '1f91d', title: { fr: 'Parler avec les autres', en: 'Social speaking' }, purpose: { fr: 'Saluer, amitié, chacun son tour', en: 'Greetings, friendship, turn-taking' } },
  { id: 'questions', n: 11, icon: '2753', title: { fr: 'Les questions', en: 'Questions' }, purpose: { fr: 'Qui, quoi, où, pourquoi', en: 'Who, what, where, why' } },
];

export const collectionById = (id: string) => COLLECTIONS.find((c) => c.id === id);
export const collectionNumber = (c: Collection) => String(c.n).padStart(2, '0');
