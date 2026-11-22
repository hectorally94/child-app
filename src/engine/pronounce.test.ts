import { describe, expect, it } from 'vitest';
import { checkPronunciation, keyWords } from './pronounce';
import { loadWordSets } from '../content/speak';

describe('pronunciation check', () => {
  it('refuses "miaou" for "le chat" (the case seen at home)', () => {
    const r = checkPronunciation('le chat', ['miaou', 'miao']);
    expect(r.ok).toBe(false);
    expect(r.heard).toBe('miaou');
  });

  it('accepts the word with or without the article, accents or capitals', () => {
    expect(checkPronunciation('le chat', ['chat']).ok).toBe(true);
    expect(checkPronunciation('le chat', ['Le chat !']).ok).toBe(true);
    expect(checkPronunciation("l'éléphant", ['elephant']).ok).toBe(true);
    expect(checkPronunciation('la cuillère', ['cuillere']).ok).toBe(true);
  });

  it('is tolerant with spellings of the same sound (recognizers often write homophones)', () => {
    expect(checkPronunciation('le chat', ['chats']).ok).toBe(true);
    expect(checkPronunciation('le pain', ['le pin', 'pain']).ok).toBe(true); // any alternative counts
    expect(checkPronunciation('le lit', ['lie']).ok).toBe(true);
    expect(checkPronunciation("l'eau", ['oh']).ok).toBe(true);
  });

  it('refuses a different animal or object', () => {
    expect(checkPronunciation('le chat', ['chien']).ok).toBe(false);
    expect(checkPronunciation('la vache', ['vélo']).ok).toBe(false);
    expect(checkPronunciation('la tasse', ['table']).ok).toBe(false);
  });

  it('needs every important word of "la brosse à dents"', () => {
    expect(checkPronunciation('la brosse à dents', ['brosse']).ok).toBe(false);
    expect(checkPronunciation('la brosse à dents', ['la brosse à dent']).ok).toBe(true);
  });

  it('sentences: most important words are enough, and the child name is not required', () => {
    const s = "Je veux aller aux toilettes, s'il te plaît.";
    expect(checkPronunciation(s, ['je veux aller aux toilettes'], { minScore: 0.6 }).ok).toBe(true);
    expect(checkPronunciation(s, ['bonjour'], { minScore: 0.6 }).ok).toBe(false);
    expect(keyWords("Je m'appelle Amani.", ['Amani'])).toEqual(['appelle']);
    expect(checkPronunciation("Je m'appelle Amani.", ["je m'appelle amandine"], { minScore: 0.6, skip: ['Amani'] }).ok).toBe(true);
  });

  it('every word of the app can be accepted when said correctly', () => {
    for (const set of loadWordSets()) for (const w of set.words) {
      expect(checkPronunciation(w.word.fr!, [w.word.fr!]).ok, w.id).toBe(true);
      expect(checkPronunciation(w.word.fr!, ['miaou']).ok, w.id).toBe(false);
    }
  });
});

import { COLLECTIONS } from '../content/collections';
import { loadShortPacks } from '../content/short';

describe('short words', () => {
  const packs = loadShortPacks();
  const spoken = packs.filter((p) => p.check !== false && p.kind !== 'listen'); // checked by speech recognition

  it('has 23 packs of 5 words, each in one of the 11 collections, 01 to 07', () => {
    expect(packs.length).toBe(23);
    for (const p of packs) {
      expect(p.words.length, p.id).toBe(5);
      expect(COLLECTIONS.some((c) => c.id === p.collection), p.id).toBe(true);
    }
    expect(new Set(packs.map((p) => p.collection)).size).toBe(7);
    // order follows the collections
    const order = packs.map((p) => COLLECTIONS.findIndex((c) => c.id === p.collection));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('every word id is unique', () => {
    const ids = packs.flatMap((p) => p.words.map((w) => w.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every spoken word is accepted when said right, with its usual recognizer spellings, and refused for "miaou"', () => {
    for (const p of spoken) for (const w of p.words) {
      const fr = w.word.fr!;
      expect(checkPronunciation(fr, [fr], { accept: w.accept, strict: true }).ok, w.id).toBe(true);
      for (const a of w.accept) expect(checkPronunciation(fr, [a], { accept: w.accept, strict: true }).ok, `${w.id} ← ${a}`).toBe(true);
      expect(checkPronunciation(fr, ['miaou'], { accept: w.accept, strict: true }).ok, `${w.id} ← miaou`).toBe(false);
    }
  });

  it("a word of the pack is never accepted for another word of the same pack (papa ≠ maman, j'ai faim ≠ j'ai soif)", () => {
    for (const p of spoken) for (const w of p.words) for (const other of p.words) {
      if (other.id === w.id) continue;
      expect(checkPronunciation(w.word.fr!, [other.word.fr!], { accept: w.accept, strict: true }).ok, `${w.id} ← ${other.id}`).toBe(false);
    }
  });

  it('syllables rebuild the word (sound packs and spoken packs)', () => {
    for (const p of packs.filter((x) => x.kind !== 'listen')) for (const w of p.words) {
      const joined = w.syllables.join('').toLowerCase().replace(/[' ]/g, '');
      const word = w.word.fr!.toLowerCase().replace(/[' ]/g, '');
      expect(joined, w.id).toBe(word);
    }
  });

  it('listening packs have a sound for every picture; sound packs are not checked by recognition', () => {
    for (const p of packs.filter((x) => x.kind === 'listen')) for (const w of p.words) expect(w.sound?.fr, w.id).toBeTruthy();
    for (const p of packs.filter((x) => x.collection === 'sons' && x.kind !== 'listen')) expect(p.check, p.id).toBe(false);
  });

  it('œ is understood: "soeur" for "sœur"', () => {
    expect(checkPronunciation('sœur', ['soeur'], { strict: true }).ok).toBe(true);
  });
});
