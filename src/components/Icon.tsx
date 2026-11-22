/** One icon family: rounded 2.5px strokes on a 24px grid. Decorative unless given a label by the parent control. */
const PATHS = {
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />,
  sound: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" fill="currentColor" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  replay: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" /></>,
  erase: <><path d="m7 19-3.3-3.3a1.5 1.5 0 0 1 0-2.1l9.1-9.1a1.5 1.5 0 0 1 2.1 0l4.6 4.6a1.5 1.5 0 0 1 0 2.1L12 19H7Z" /><path d="M9 10.3 14.7 16M7 19h13" /></>,
  next: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  back: <path d="m14.5 6-6 6 6 6" />,
  chart: <><path d="M5 19V10M12 19V5M19 19v-6" /></>,
  book: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: <><path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5Z" /><path d="M12.5 7.5l4 4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  trash: <><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></>,
  offline: <><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 19.5h14" /></>,
  sparkle: <path d="M12 3c.8 4.2 2.8 6.2 7 7-4.2.8-6.2 2.8-7 7-.8-4.2-2.8-6.2-7-7 4.2-.8 6.2-2.8 7-7Z" fill="currentColor" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  hand: <><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10V5a1.5 1.5 0 0 1 3 0v5" /><path d="M14 10.5V7a1.5 1.5 0 0 1 3 0v6.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3.8 14a1.5 1.5 0 0 1 2.5-1.7L8 14.5" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
