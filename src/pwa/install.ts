import { useEffect, useState } from 'react';

/**
 * "Install this app" support (PWA).
 * Android/desktop Chrome fire `beforeinstallprompt`; we keep the event so a button can show the
 * install dialog later. iPhone Safari has no such event: we show instructions instead.
 * This module must be imported early (main.tsx) so the event is not missed.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  const installed = isStandalone();
  return {
    installed,
    canPrompt: !installed && deferred !== null,
    showIosHelp: !installed && deferred === null && isIos(),
    async prompt() {
      if (!deferred) return;
      const ev = deferred;
      await ev.prompt();
      await ev.userChoice.catch(() => undefined);
      deferred = null;
      notify();
    },
  };
}
