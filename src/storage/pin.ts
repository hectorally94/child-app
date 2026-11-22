/**
 * Parent code (PIN). Only a SHA-256 fingerprint is stored on the device, never the code itself.
 * If the browser has no Web Crypto (very old, or a non-secure http page), a simple fallback hash is used.
 */
export const PIN_LENGTH = 4;

export async function hashPin(pin: string): Promise<string> {
  const text = `pipo-parent:${pin}`;
  try {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 'sha256:' + Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 5381;
    for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return 'djb2:' + (h >>> 0).toString(16);
  }
}

export async function checkPin(pin: string, stored: string | undefined): Promise<boolean> {
  return !!stored && (await hashPin(pin)) === stored;
}
