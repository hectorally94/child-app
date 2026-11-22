/**
 * Pronunciation check (decision 2026-11-22, at the parent's request): before the picture game, the child must
 * really say the word ("miaou" for "le chat" is not accepted).
 *
 * The browser's speech recognition turns her voice into text; we then compare the text with what she had to say.
 * Children with a speech delay are not perfectly understood by recognizers, so the comparison is tolerant:
 * accents, articles and small sound differences are ignored, and every alternative the recognizer proposes is tried.
 */

/** Small words that do not need to be heard (articles, pronouns…). */
const STOP = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd', 'au', 'aux', 'et', 'a', 'est', 'c', 'ce', 'ca',
  'je', 'j', 'tu', 'il', 'elle', 'on', 'me', 'm', 'te', 't', 'se', 's', 'ne', 'n', 'pas', 'y', 'en', 'mon', 'ma', 'mes',
  'the', 'an', 'i', 'is', 'it', 'to', 'my',
]);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/[’'`-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very small French "sounds like" key: silent endings, double letters, common spellings of the same sound. */
export function soundKey(word: string): string {
  return word
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'k')
    .replace(/c([aou])/g, 'k$1')
    .replace(/ck/g, 'k')
    .replace(/eaux?|aux?/g, 'o')
    .replace(/ai|ei|et$/g, 'e')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/(es|e|s|t|x|d|z)$/g, '');
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function wordsMatch(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  const ka = soundKey(expected);
  const kb = soundKey(heard);
  if (ka && ka === kb) return true;
  const len = Math.max(expected.length, 1);
  const allowed = len >= 7 ? 2 : len >= 4 ? 1 : 0;
  return levenshtein(expected, heard) <= allowed || (ka.length >= 3 && levenshtein(ka, kb) <= (ka.length >= 6 ? 1 : 0));
}

/** The words that must be heard. `skip` removes words such as the child's own first name. */
export function keyWords(expected: string, skip: string[] = []): string[] {
  const skipSet = new Set(skip.map(normalize).filter(Boolean));
  const all = normalize(expected).split(' ').filter(Boolean);
  const keys = all.filter((w) => !STOP.has(w) && !skipSet.has(w));
  return keys.length ? keys : all.filter((w) => !skipSet.has(w));
}

export interface PronunciationResult {
  ok: boolean;
  score: number; // share of key words heard (0..1)
  heard: string; // best transcript, for the feedback "J'ai entendu « … »"
  missing: string[];
}

/**
 * Compare what the recognizer heard (all its alternatives) with what the child had to say.
 * `minScore`: 1 = every key word (single words); lower for longer sentences.
 */
export function checkPronunciation(expected: string, alternatives: string[], opts: { minScore?: number; skip?: string[] } = {}): PronunciationResult {
  const keys = keyWords(expected, opts.skip);
  const minScore = opts.minScore ?? 1;
  let best: PronunciationResult = { ok: false, score: 0, heard: alternatives[0] ?? '', missing: keys };
  const candidates = [...alternatives, alternatives.join(' ')];
  for (const alt of candidates) {
    const heardWords = normalize(alt).split(' ').filter(Boolean);
    const found = keys.filter((k) => heardWords.some((h) => wordsMatch(k, h)) || (soundKey(k).length >= 4 && soundKey(heardWords.join('')).includes(soundKey(k))));
    const score = keys.length ? found.length / keys.length : 0;
    if (score > best.score) best = { ok: false, score, heard: alt, missing: keys.filter((k) => !found.includes(k)) };
  }
  best.ok = best.score >= minScore - 1e-9 && best.score > 0;
  if (!alternatives.length) best.heard = '';
  return best;
}
