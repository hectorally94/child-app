import type { Localized } from '../engine/types';

/**
 * The "Pause vidéos" feed (decision 2026-11-23): a short, ad-free, scrolling feed of curated clips for when the
 * child is tired of exercises. Clips come from /reels/catalog.json (our own cartoons, see tools/reels) and from the
 * family's own videos stored on the phone. The words are captions + Pipo's voice added by the app, not part of the video.
 */
export interface ReelCue {
  /** Seconds from the start of the video. */
  t: number;
  show: Localized;
  say: Localized;
}

export interface ReelVideo {
  id: string;
  kind: 'video';
  /** MP4 (H.264). */
  src: string;
  /** Same clip in WebM, for devices that cannot play H.264. */
  srcWebm?: string;
  poster?: string;
  seconds: number;
  bytes: number;
  title: Localized;
  collection?: string;
  /** false = silent clip: the captions are spoken by Pipo. */
  audio: boolean;
  cues: ReelCue[];
  /** Optional "Dis-le !" at the end of the clip. */
  repeat?: Localized;
  credit?: string;
}

export interface FamilyReel {
  kind: 'family';
  id: string; // "family:<uuid>"
  title: string;
  bytes: number;
  createdAt: number;
}

export type FeedItem = ReelVideo | FamilyReel;

const CATALOG_URL = '/reels/catalog.json';
const STORED = 'hlc.reels.catalog';

function valid(v: unknown): v is ReelVideo[] {
  return Array.isArray(v) && v.every((x) => x && typeof x.id === 'string' && typeof x.src === 'string' && Array.isArray(x.cues));
}

/**
 * The list of clips. Fetched fresh when online (so new clips appear without updating the app), kept on the
 * phone for when there is no internet.
 */
export async function loadCatalog(): Promise<ReelVideo[]> {
  try {
    const res = await fetch(CATALOG_URL, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      if (valid(json.items)) {
        try { localStorage.setItem(STORED, JSON.stringify(json.items)); } catch { /* storage full: fine */ }
        return json.items;
      }
    }
  } catch { /* offline */ }
  try {
    const stored = JSON.parse(localStorage.getItem(STORED) ?? 'null');
    if (valid(stored)) return stored;
  } catch { /* nothing stored */ }
  return [];
}

/** The file this device can play: MP4 when the browser supports H.264, otherwise the WebM copy. */
export function pickSource(item: ReelVideo, probe: HTMLVideoElement = document.createElement('video')): string {
  const mp4 = probe.canPlayType('video/mp4; codecs="avc1.42E01E"');
  return mp4 || !item.srcWebm ? item.src : item.srcWebm;
}
