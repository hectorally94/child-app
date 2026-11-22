import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import './index.css';
import './pwa/install';
import { primeAudio } from './engine/speech';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

// Phones only allow voice and sounds after a first touch: unlock them then.
window.addEventListener('pointerdown', primeAudio, { once: true, capture: true });

// Offline support: cache the app after the first visit (production builds only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
