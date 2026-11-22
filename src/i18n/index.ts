import type { Lang, Localized } from '../engine/types';

/**
 * Fallback order when a text is missing in the chosen language.
 * Kirundi texts are not written yet (need a native speaker), so `rn` falls back to French.
 */
const FALLBACK: Record<Lang, Lang[]> = { rn: ['rn', 'fr', 'en'], fr: ['fr', 'en'], en: ['en', 'fr'] };

export function tr(text: Localized | undefined, lang: Lang): string {
  if (!text) return '';
  for (const l of FALLBACK[lang]) if (text[l]) return text[l]!;
  return Object.values(text)[0] ?? '';
}

export const LANG_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français', rn: 'Kirundi' };

/** Application UI strings (lesson texts live in the lesson files). */
const UI = {
  childWelcome: { en: 'Hello! Ready to play and learn?', fr: 'Bonjour ! Prêt à jouer et apprendre ?' },
  todayActivity: { en: "Today's activity", fr: "L'activité du jour" },
  noActivity: { en: 'Ask a grown-up to choose an activity.', fr: 'Demande à un adulte de choisir une activité.' },
  tryAgain: { en: 'Try again', fr: 'Recommencer' },
  next: { en: 'Next activity', fr: 'Activité suivante' },
  finish: { en: 'Finish', fr: 'Terminer' },
  parentArea: { en: 'Parent area', fr: 'Espace parent' },
  gateQuestion: { en: 'For grown-ups: what is {a} × {b}?', fr: 'Pour les adultes : combien font {a} × {b} ?' },
  enter: { en: 'Enter', fr: 'Entrer' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  wrongAnswer: { en: 'That is not right. Try again.', fr: 'Ce n’est pas correct. Réessayez.' },
  dashboard: { en: 'Dashboard', fr: 'Tableau de bord' },
  lessons: { en: 'Lessons', fr: 'Leçons' },
  progress: { en: 'Progress', fr: 'Progrès' },
  settings: { en: 'Settings', fr: 'Paramètres' },
  children: { en: 'Children', fr: 'Enfants' },
  addChild: { en: 'Add child', fr: 'Ajouter un enfant' },
  childName: { en: "Child's first name or nickname", fr: "Prénom ou surnom de l'enfant" },
  active: { en: 'Active', fr: 'Actif' },
  select: { en: 'Select', fr: 'Choisir' },
  delete: { en: 'Delete', fr: 'Supprimer' },
  confirmDelete: { en: 'Delete this child and all their practice history?', fr: "Supprimer cet enfant et tout son historique ?" },
  childLanguage: { en: 'Child language', fr: "Langue de l'enfant" },
  parentLanguage: { en: 'Parent language', fr: 'Langue du parent' },
  preview: { en: 'Preview', fr: 'Aperçu' },
  objective: { en: 'Objective', fr: 'Objectif' },
  howToHelp: { en: 'How you can help', fr: 'Comment aider' },
  steps: { en: 'Steps', fr: 'Étapes' },
  setToday: { en: "Set as today's activity", fr: "Choisir pour aujourd'hui" },
  isToday: { en: "Today's activity ✓", fr: "Activité du jour ✓" },
  availableOffline: { en: 'Available offline', fr: 'Disponible hors ligne' },
  startChildMode: { en: 'Give to child ▶', fr: "Passer à l'enfant ▶" },
  noChild: { en: 'Create a child profile first.', fr: "Créez d'abord un profil enfant." },
  noProgress: { en: 'No practice yet.', fr: 'Pas encore de pratique.' },
  attempts: { en: 'attempts', fr: 'essais' },
  practiced: { en: 'Practiced', fr: 'Pratiqué' },
  needsPractice: { en: 'Needs more practice', fr: 'À retravailler' },
  inProgress: { en: 'Not finished', fr: 'Non terminé' },
  watchDemo: { en: 'Watch again', fr: 'Revoir' },
  clear: { en: 'Clear', fr: 'Effacer' },
  done: { en: 'Done', fr: 'Fini' },
  minutes: { en: 'min', fr: 'min' },
  privacyNote: {
    en: 'All data stays on this device. Nothing is sent over the internet.',
    fr: "Toutes les données restent sur cet appareil. Rien n'est envoyé sur internet.",
  },
  stepNames: {
    en: 'Introduction · Demonstration · Guided tracing · Writing alone',
    fr: 'Introduction · Démonstration · Traçage guidé · Écriture seul',
  },
} satisfies Record<string, Localized>;

export type UIKey = keyof typeof UI;

export function t(key: UIKey, lang: Lang, vars: Record<string, string | number> = {}): string {
  return tr(UI[key], lang).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
