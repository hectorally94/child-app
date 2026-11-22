import type { Lang, Localized } from '../engine/types';

/** Fallback order when a text is missing in the chosen language. */
const FALLBACK: Record<Lang, Lang[]> = { fr: ['fr', 'en'], en: ['en', 'fr'] };

export function tr(text: Localized | undefined, lang: Lang): string {
  if (!text) return '';
  for (const l of FALLBACK[lang]) if (text[l]) return text[l]!;
  return Object.values(text)[0] ?? '';
}

export const LANG_NAMES: Record<Lang, string> = { fr: 'Français', en: 'English' };

/** Application UI strings (lesson texts live in the lesson files). */
const UI = {
  childWelcome: { en: 'Hello {name}! Shall we play?', fr: 'Bonjour {name} ! On joue ?' },
  tapToStart: { en: 'Tap to start', fr: 'Appuie pour commencer' },
  watchAgainSay: { en: 'Watch me once more.', fr: 'Regarde-moi encore une fois.' },
  listen: { en: 'Listen', fr: 'Écouter' },
  home: { en: 'Home', fr: 'Accueil' },
  appName: { en: 'Pipo · learn at home', fr: 'Pipo · apprendre à la maison' },
  welcomeParent: { en: 'Welcome! Set up your child to begin.', fr: 'Bienvenue ! Créez le profil de votre enfant pour commencer.' },
  stepIntro: { en: 'Look', fr: 'Regarder' },
  stepDemo: { en: 'Watch', fr: 'Observer' },
  stepTrace: { en: 'Trace', fr: 'Tracer' },
  stepFree: { en: 'Write alone', fr: 'Écrire seul' },
  sessions: { en: 'sessions', fr: 'séances' },
  lastPractice: { en: 'Last practice', fr: 'Dernière séance' },
  totalTime: { en: 'Practice time', fr: 'Temps de pratique' },
  lessonsDone: { en: 'Lessons practiced', fr: 'Leçons pratiquées' },
  writing: { en: 'Writing', fr: 'Écriture' },
  childProfile: { en: 'Child profile', fr: "Profil de l'enfant" },
  chooseTitle: { en: 'Pick what you want to write', fr: 'Choisis ce que tu veux écrire' },
  numbers: { en: 'Numbers', fr: 'Chiffres' },
  letters: { en: 'Letters', fr: 'Lettres' },
  whoPlays: { en: "Who's playing?", fr: 'Qui joue ?' },
  avatarColor: { en: 'Avatar color', fr: "Couleur de l'avatar" },
  editProfile: { en: 'Edit profile', fr: 'Modifier le profil' },
  edit: { en: 'Edit', fr: 'Modifier' },
  firstName: { en: 'First name', fr: 'Prénom' },
  save: { en: 'Save', fr: 'Enregistrer' },
  saved: { en: 'Saved', fr: 'Enregistré' },
  practicedCount: { en: '{n} practiced', fr: '{n} pratiqués' },
  installTitle: { en: 'Install the app on this phone', fr: "Installer l'application sur ce téléphone" },
  installText: {
    en: 'It opens like a normal app, full screen, and works without internet.',
    fr: "Elle s'ouvre comme une vraie application, en plein écran, et marche sans internet.",
  },
  installButton: { en: 'Install', fr: 'Installer' },
  installIos: {
    en: 'On iPhone: tap the Share button, then "Add to Home Screen".',
    fr: "Sur iPhone : touchez le bouton Partager, puis « Sur l'écran d'accueil ».",
  },
  installed: { en: 'The app is installed', fr: "L'application est installée" },
  later: { en: 'Later', fr: 'Plus tard' },
  todayActivity: { en: "Today's activity", fr: "L'activité du jour" },
  noActivity: { en: 'Ask a grown-up to choose an activity.', fr: 'Demande à un adulte de choisir une activité.' },
  noActivityParent: { en: 'No activity chosen yet. Pick one in Lessons.', fr: 'Aucune activité choisie. Choisissez-en une dans Leçons.' },
  tryAgain: { en: 'Again', fr: 'Encore' },
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
