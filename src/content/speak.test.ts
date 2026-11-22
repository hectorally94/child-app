import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sequentialUnlocked } from '../engine/progress';
import { loadReels, loadWordSets, personalize } from './speak';

const sets = loadWordSets();
const reels = loadReels();

describe('words and conversations content', () => {
  it('every word has a picture file, French and English', () => {
    for (const s of sets) {
      expect(s.words.length, s.id).toBeGreaterThanOrEqual(3); // the game needs 3 pictures
      for (const w of s.words) {
        expect(existsSync(resolve(__dirname, '../../public/pictures', `${w.image}.svg`)), w.id).toBe(true);
        expect(w.word.fr && w.word.en && w.sentence.fr && w.sentence.en, w.id).toBeTruthy();
      }
    }
  });

  it('ids are unique', () => {
    expect(new Set(sets.map((s) => s.id)).size).toBe(sets.length);
    expect(new Set(sets.flatMap((s) => s.words.map((w) => w.id))).size).toBe(sets.reduce((a, s) => a + s.words.length, 0));
    expect(new Set(reels.map((r) => r.id)).size).toBe(reels.length);
  });

  it('every reel has a scene picture, lines in both languages and something to repeat', () => {
    for (const r of reels) {
      expect(existsSync(resolve(__dirname, '../../public/pictures', `${r.prop}.svg`)), r.id).toBe(true);
      expect(r.lines.length, r.id).toBeGreaterThan(0);
      for (const l of r.lines) expect(l.text.fr && l.text.en && ['pipo', 'tika'].includes(l.who), r.id).toBeTruthy();
      expect(r.repeat.fr && r.repeat.en, r.id).toBeTruthy();
    }
  });

  it('every reel belongs to a theme, and the 10 first conversations are still there', () => {
    for (const r of reels) expect(['greet', 'needs', 'feelings', 'polite', 'house'], r.id).toContain(r.theme);
    for (const id of ['bonjour', 'prenom', 'faim', 'soif', 'merci', 'jouer', 'aide', 'maman', 'emotions', 'aurevoir', 'toilettes'])
      expect(reels.some((r) => r.id === id), id).toBe(true);
  });

  it('personalizes name and girl/boy forms', () => {
    expect(personalize('Je suis content{e} !', { name: 'Amani', gender: 'f' })).toBe('Je suis contente !');
    expect(personalize('Je suis content{e} !', { name: 'Keza', gender: 'm' })).toBe('Je suis content !');
    expect(personalize("Je m'appelle {name}.", { name: 'Amani' })).toBe("Je m'appelle Amani.");
  });

  it('unlocks one after the other', () => {
    const keys = ['a', 'b', 'c'];
    expect([...sequentialUnlocked(keys, new Set())]).toEqual(['a']);
    expect([...sequentialUnlocked(keys, new Set(['a']))]).toEqual(['a', 'b']);
    expect(sequentialUnlocked(keys, new Set(), true).size).toBe(3);
  });
});
