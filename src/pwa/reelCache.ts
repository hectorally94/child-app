/**
 * Saving videos for later (offline). A saved clip is stored whole in the browser's Cache Storage and played back
 * from there, so it works without internet and costs no data the second time.
 * The service worker does not touch /reels/ (video requests are partial "Range" requests it cannot cache).
 */
const NAME = 'hlc-reels-v1';

const supported = () => typeof caches !== 'undefined';
const abs = (url: string) => new URL(url, location.href).href;

export async function isSaved(url: string): Promise<boolean> {
  if (!supported()) return false;
  return !!(await (await caches.open(NAME)).match(abs(url)));
}

export async function savedUrls(): Promise<Set<string>> {
  if (!supported()) return new Set();
  const keys = await (await caches.open(NAME)).keys();
  return new Set(keys.map((r) => new URL(r.url).pathname));
}

/** Downloads the whole file and keeps it. Returns true when it is saved. */
export async function save(url: string): Promise<boolean> {
  if (!supported()) return false;
  try {
    const cache = await caches.open(NAME);
    if (await cache.match(abs(url))) return true;
    const res = await fetch(abs(url));
    if (!res.ok || res.status === 206) return false;
    await cache.put(abs(url), res);
    return true;
  } catch {
    return false; // offline, interrupted or no room: the clip just stays unsaved
  }
}

/** A playable address for a saved clip (call revoke when done), or null. */
export async function savedObjectUrl(url: string): Promise<string | null> {
  if (!supported()) return null;
  const hit = await (await caches.open(NAME)).match(abs(url));
  return hit ? URL.createObjectURL(await hit.blob()) : null;
}

export async function remove(url: string): Promise<void> {
  if (supported()) await (await caches.open(NAME)).delete(abs(url));
}

export async function removeAll(): Promise<void> {
  if (supported()) await caches.delete(NAME);
}

export async function storageUsage(): Promise<{ used: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e?.usage != null && e.quota != null ? { used: e.usage, quota: e.quota } : null;
  } catch {
    return null;
  }
}

export const megabytes = (bytes: number) => (bytes / 1048576 < 10 ? (bytes / 1048576).toFixed(1) : String(Math.round(bytes / 1048576)));
