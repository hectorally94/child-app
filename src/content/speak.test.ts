import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sequentialUnlocked } from '../engine/progress';
import { COLLECTIONS } from './collections';
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

  it('every conversation belongs to one of the 11 collections, and all the earlier ones are still there', () => {
    for (const r of reels) expect(COLLECTIONS.map((c) => c.id), r.id).toContain(r.collection);
    for (const id of ['bonjour', 'prenom', 'faim', 'soif', 'merci', 'jouer', 'aide', 'maman', 'emotions', 'aurevoir', 'toilettes',
      'bonsoir', 'dormir', 'froid', 'laver', 'peur', 'jaime', 'ouinon', 'silteplait', 'pardon', 'cuisine', 'chambre', 'salledebain', 'salon', 'jardin'])
      expect(reels.some((r) => r.id === id), id).toBe(true);
  });

  it('Parler covers the long-phrase collections: needs, world, actions, feelings, first sentences, school, social, questions', () => {
    const used = new Set(reels.map((r) => r.collection));
    for (const c of ['besoins', 'monde', 'actions', 'emotions', 'phrases', 'ecole', 'social', 'questions']) expect(used.has(c), c).toBe(true);
    expect(reels.length).toBe(46);
  });

  it('conversations of a collection are next to each other, in collection order', () => {
    const idx = reels.map((r) => COLLECTIONS.findIndex((c) => c.id === r.collection));
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
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
