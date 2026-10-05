import type { CSSProperties } from 'react';

/**
 * Line icons exported from Figma (public/icons). Rendered as a CSS mask so they
 * take a token colour (the Figma files carry fixed colours). Decorative by
 * default; the control that holds the icon carries the label.
 */
export const ICONS = {
  feed: '/icons/feed-bottle.png',
  diaper: '/icons/diaper.png',
  sleep: '/icons/sleep.png',
  pump: '/icons/pump.png',
  breastfeed: '/icons/breastfeed.png',
  bottle: '/icons/bottle.png',
  solids: '/icons/solids.png',
  combo: '/icons/combo.png',
  breakfast: '/icons/slot-breakfast.png',
  lunch: '/icons/slot-lunch.png',
  snack: '/icons/slot-snack.png',
  dinner: '/icons/slot-dinner.png',
  pencil: '/icons/edit-pencil.png',
  pencilSage: '/icons/edit-pencil-sage.png',
  close: '/icons/close.svg',
  navToday: '/icons/nav-today.png',
  navMe: '/icons/nav-me.svg',
  navBaby: '/icons/nav-baby.svg',
  navAsk: '/icons/nav-ask.svg',
  hydration: '/icons/hydration.svg',
  mood: '/icons/mood.svg',
} as const;

/** PNGs that are single-colour silhouettes and can be tinted (the nav "Today" house). */
const TINTED_PNG = new Set<string>(['navToday']);

/** Tiles whose icon is not in Figma yet (Water, Bleeding, Medicine, Symptom, Weight, Note, Formula opened). */
export type IconName = keyof typeof ICONS | 'missing';

export function Icon({ name, size = 18, color = 'currentColor', className = '', style }: { name: IconName; size?: number; color?: string; className?: string; style?: CSSProperties }) {
  if (name === 'missing') {
    return (
      <svg aria-hidden data-icon="missing" width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 ${className}`}>
        <rect x="4" y="4" width="32" height="32" rx="8" fill="none" stroke="var(--color-review-line)" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="20" y="24" textAnchor="middle" fontSize="9" fontFamily="Inter, sans-serif" fill="var(--color-review-fg)">icon</text>
      </svg>
    );
  }
  const src = ICONS[name];
  // Figma's PNG line icons have white fills inside the strokes, so they render as images.
  // SVG icons (nav, Me tiles, close) are outline-only and take a token colour through a mask.
  if (src.endsWith('.png') && !TINTED_PNG.has(name)) {
    return <img aria-hidden alt="" src={src} width={size} height={size} data-icon={name} className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size, ...style }} />;
  }
  const url = `url("${src}")`;
  return (
    <span
      aria-hidden
      data-icon={name}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        ...style,
      }}
    />
  );
}

/** Small glyphs drawn in code (chevron, plus, check) so they follow tokens exactly. */
export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden width="7" height="12" viewBox="0 0 7 12" className={className} fill="none">
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Plus({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 12 12" className={className} fill="none">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Gear({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
