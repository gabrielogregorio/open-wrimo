import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Coffee,
  Droplet,
  Feather,
  Flag,
  Flame,
  Footprints,
  Glasses,
  Heart,
  HeartPulse,
  Image,
  Keyboard,
  Layers,
  Mail,
  Map,
  Megaphone,
  Moon,
  Mountain,
  Music,
  Pencil,
  Save,
  Skull,
  Sparkles,
  SunMedium,
  Sunrise,
  Target,
  Tent,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import type { Badge, BadgeGlyph } from '@/lib/writing/badges';

export type BadgeKind = 'writing' | 'personal' | 'participation';

const WRITING_TONES: Partial<Record<BadgeGlyph, string>> = {
  quill: '#6b4423',
  flame: '#b5412b',
  stack: '#2f4b3a',
  'sun-day': '#a8641a',
  flag: '#1f3a5f',
  summit: '#3d4a6b',
  clock: '#4a3b5c',
  sun: '#b07a1c',
  moon: '#2a2f4f',
};

const KIND_TONES: Record<Exclude<BadgeKind, 'writing'>, string> = { personal: '#6e4f7e', participation: '#3f7d8c' };

const GLYPHS: Record<BadgeGlyph, LucideIcon> = {
  quill: Feather,
  flame: Flame,
  stack: Layers,
  'sun-day': SunMedium,
  flag: Flag,
  summit: Mountain,
  clock: Timer,
  sun: Sunrise,
  moon: Moon,
  heart: Heart,
  disk: Save,
  pulse: HeartPulse,
  runner: Footprints,
  tear: Droplet,
  pants: Sparkles,
  clipboard: ClipboardList,
  tent: Tent,
  pencil: Pencil,
  shades: Glasses,
  typewriter: Keyboard,
  music: Music,
  megaphone: Megaphone,
  letter: Mail,
  cup: Coffee,
  book: BookOpen,
  target: Target,
  calendar: CalendarCheck,
  image: Image,
  skull: Skull,
  map: Map,
};

export function BadgeIcon({
  badge,
  kind,
  earned = true,
  className = 'h-24 w-24',
}: {
  badge: Badge;
  kind: BadgeKind;
  earned?: boolean;
  className?: string;
}) {
  const Glyph = GLYPHS[badge.glyph];
  const tone = kind === 'writing' ? (WRITING_TONES[badge.glyph] ?? '#6b4423') : KIND_TONES[kind];

  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} ${earned ? '' : 'opacity-40 grayscale'}`}
      aria-hidden="true"
      focusable="false">
      {kind === 'writing' ? (
        <>
          <polygon points="60,4 108,32 108,88 60,116 12,88 12,32" fill={tone} stroke="var(--paper)" strokeWidth="4" />
          <polygon
            points="60,14 99,37 99,83 60,106 21,83 21,37"
            fill="none"
            stroke="rgb(255 255 255 / 0.35)"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <circle cx="60" cy="60" r="56" fill={tone} stroke="var(--paper)" strokeWidth="4" />
          <circle cx="60" cy="60" r="47" fill="none" stroke="rgb(255 255 255 / 0.3)" strokeWidth="2" />
        </>
      )}
      {badge.mark ? (
        <>
          <Glyph x={47} y={20} width={26} height={26} color="#fdf8ee" strokeWidth={2.2} aria-hidden="true" />
          <text
            x="60"
            y="86"
            textAnchor="middle"
            fontSize={badge.mark.length > 3 ? 22 : 30}
            fontWeight="700"
            fill="#fdf8ee">
            {badge.mark}
          </text>
        </>
      ) : (
        <Glyph x={33} y={33} width={54} height={54} color="#fdf8ee" strokeWidth={1.8} aria-hidden="true" />
      )}
    </svg>
  );
}

type BadgeHexProps = {
  badge: Badge;
  earned: boolean;
  label: string;
  description: string;
  statusText: string;
  kind?: BadgeKind;
};

export function BadgeHex({ badge, earned, label, description, statusText, kind = 'writing' }: BadgeHexProps) {
  return (
    <li className={`flex w-28 flex-col items-center gap-1 text-center ${earned ? 'badge-earned' : ''}`}>
      <BadgeIcon badge={badge} kind={kind} earned={earned} />
      <span className="font-display text-sm leading-tight font-semibold">{label}</span>
      <span className="text-xs text-ink-soft">{description}</span>
      <span className="sr-only">{statusText}</span>
    </li>
  );
}
