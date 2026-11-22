import type { Child } from '../storage/store';

/** Avatar colors a parent can choose for a child's profile (gradient pairs). */
export const AVATAR_COLORS: [string, string][] = [
  ['#fbbf24', '#f97362'], // sun → coral
  ['#60a5fa', '#7c3aed'], // sky → violet
  ['#f472b6', '#ec4899'], // pink
  ['#34d399', '#059669'], // mint
  ['#a78bfa', '#6d28d9'], // lavender
  ['#fb923c', '#ea580c'], // orange
];

export function avatarColors(child: Pick<Child, 'avatar'> | null | undefined, fallback = 0): [string, string] {
  return AVATAR_COLORS[(child?.avatar ?? fallback) % AVATAR_COLORS.length];
}

export function Avatar({ child, size = 44, ring = false }: { child: Pick<Child, 'name' | 'avatar'>; size?: number; ring?: boolean }) {
  const [a, b] = avatarColors(child);
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-display font-black text-white shadow-[inset_0_-3px_0_rgb(0_0_0/0.12),inset_0_3px_6px_rgb(255_255_255/0.35)] ${ring ? 'ring-4 ring-white' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.45, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {child.name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
