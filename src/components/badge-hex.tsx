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

const GLYPHS: Record<BadgeGlyph, string> = {
  quill: 'M68 30c-14 4-26 18-30 36l-4 10 6-4c4-12 10-20 18-26-6 8-10 16-12 26 12-6 20-20 22-42z',
  flame: 'M60 28c4 12 16 18 16 34a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 2 10 6 12-2-12 0-22 2-30z',
  stack: 'M40 70h40v6H40zm2-10h36v6H42zm-2-10h40v6H40zm4-10h32v6H44z',
  'sun-day': 'M60 46a14 14 0 1 1 0 28 14 14 0 0 1 0-28zm-2-16h4v10h-4zm0 50h4v10h-4zM30 58h10v4H30zm50 0h10v4H80z',
  flag: 'M46 28h4v64h-4zm4 2h26l-6 10 6 10H50z',
  summit: 'M28 86l22-38 10 16 8-10 24 32zm30-56h3v20h-3zm3 1h12l-4 5 4 5H61z',
  clock: 'M60 32a28 28 0 1 1 0 56 28 28 0 0 1 0-56zm0 6a22 22 0 1 0 0 44 22 22 0 0 0 0-44zm-2 6h4v18l10 6-2 4-12-8z',
  sun: 'M60 44a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm-2-18h4v12h-4zm0 56h4v12h-4zM26 58h12v4H26zm56 0h12v4H82z',
  moon: 'M66 30a30 30 0 1 0 22 46 24 24 0 0 1-22-46z',
  heart: 'M60 86L36 62a14 14 0 0 1 24-16 14 14 0 0 1 24 16z',
  disk: 'M36 32h40l10 10v46H36zm8 0v16h28V32zm2 34v18h28V66z',
  pulse: 'M60 84L38 62a12 12 0 0 1 22-14 12 12 0 0 1 22 14zM28 58h16l4-8 6 16 4-8h34v4H60l-6 12-6-16-2 4H28z',
  runner:
    'M68 30a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM56 46l14 4 8 12-4 3-7-9-5 10 10 8-3 18h-5l2-14-12-9-6 14-12-2 2-4 8 1 8-20-6 1-6 8-4-3 8-11z',
  tear: 'M30 56c16-16 44-16 60 0-16 16-44 16-60 0zm30-8a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM52 74c0 0 6 8 6 12a6 6 0 0 1-12 0c0-4 6-12 6-12z',
  pants: 'M42 30h36l6 60H70l-10-40-10 40H36z',
  clipboard: 'M40 34h12v-4h16v4h12v56H40zm8 12v4h24v-4zm0 10v4h24v-4zm0 10v4h24v-4zm0 10v4h16v-4z',
  tent: 'M60 28l32 60H28zm0 26l-12 34h24z',
  pencil: 'M76 30l12 12-40 40-16 4 4-16z',
  shades: 'M26 50h68v6h-4c-2 12-8 16-16 16s-12-6-14-12h-4c-2 6-6 12-14 12s-14-4-16-16z',
  typewriter: 'M42 32h36v16H42zM30 52h60v32H30zm8 8v4h6v-4zm10 0v4h6v-4zm10 0v4h6v-4zm10 0v4h6v-4zm-24 12v4h28v-4z',
  music: 'M52 32l32-6v44a8 8 0 1 1-4-7V40l-24 5v33a8 8 0 1 1-4-7z',
  megaphone: 'M30 52h12l36-18v52L42 68H30zm16 18h10l4 16H50z',
  letter: 'M28 40h64v42H28zm6 6v30h52V46L60 64z',
  cup: 'M34 42h40v20a20 20 0 0 1-40 0zm40 4h6a10 10 0 0 1 0 20h-6v-6h6a4 4 0 0 0 0-8h-6zM32 86h46v4H32z',
  book: 'M34 30h44a6 6 0 0 1 6 6v54H40a6 6 0 0 1-6-6zm6 48v6h38v-6zm24-48v18l5-4 5 4V30z',
  target:
    'M60 28a32 32 0 1 1 0 64 32 32 0 0 1 0-64zm0 8a24 24 0 1 0 0 48 24 24 0 0 0 0-48zm0 8a16 16 0 1 1 0 32 16 16 0 0 1 0-32zm0 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  calendar: 'M30 36h60v52H30zm6 14v32h48V50zM40 28h6v12h-6zm34 0h6v12h-6zM44 58h8v8h-8zm14 0h8v8h-8zm14 0h8v8h-8z',
  image: 'M30 36h60v48H30zm6 6v30l14-14 12 12 8-8 14 14V42zm36 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12z',
  skull:
    'M60 28c18 0 30 12 30 28 0 10-6 16-12 18v12H42V74c-6-2-12-8-12-18 0-16 12-28 30-28zm-12 26a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm24 0a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  map: 'M28 36l20-6 24 8 20-6v52l-20 6-24-8-20 6zm22 2v40l20 6V44z',
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
          <path
            d={GLYPHS[badge.glyph]}
            fill="#fdf8ee"
            fillRule="evenodd"
            opacity="0.9"
            transform="translate(36 8) scale(0.4)"
          />
          <text
            x="60"
            y="84"
            textAnchor="middle"
            fontSize={badge.mark.length > 3 ? 22 : 34}
            fontWeight="700"
            fill="#fdf8ee">
            {badge.mark}
          </text>
        </>
      ) : (
        <path d={GLYPHS[badge.glyph]} fill="#fdf8ee" fillRule="evenodd" />
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
