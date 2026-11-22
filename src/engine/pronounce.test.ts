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
