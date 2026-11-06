const COLORS = ['#7d2a26', '#e0a33a', '#2f4b3a', '#1f3a5f', '#c85a50', '#f3d27a', '#6e4f7e', '#fdf8ee'];
// eslint-disable-next-line sonarjs/pseudo-random -- only scatters confetti, nothing depends on it being unpredictable
const random = (): number => Math.random();

const PIECES_PER_SIDE = 90;
const DURATION_MS = 3200;
const GRAVITY = 0.32;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  size: number;
  color: string;
  round: boolean;
};

const burst = (fromLeft: boolean, width: number, height: number): Piece[] =>
  Array.from({ length: PIECES_PER_SIDE }, () => {
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (random() - 0.5) * 0.9;
    const speed = 11 + random() * 11;

    return {
      x: fromLeft ? -10 : width + 10,
      y: height * 0.85,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (random() - 0.5) * 0.4,
      angle: random() * Math.PI,
      size: 6 + random() * 7,
      color: COLORS[Math.floor(random() * COLORS.length)],
      round: random() < 0.3,
    };
  });

export const launchConfetti = (): void => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const canvas = document.createElement('canvas');
  const scale = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.append(canvas);
  const context = canvas.getContext('2d');

  if (!context) {
    canvas.remove();

    return;
  }

  context.scale(scale, scale);
  let pieces = [...burst(true, width, height), ...burst(false, width, height)];
  const started = performance.now();
  let secondWave = false;

  const frame = (now: number): void => {
    const elapsed = now - started;

    if (!secondWave && elapsed > 450) {
      secondWave = true;
      pieces = [...pieces, ...burst(true, width, height).slice(0, 45), ...burst(false, width, height).slice(0, 45)];
    }

    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS + 800) / 800);

    for (const piece of pieces) {
      piece.vy += GRAVITY;
      piece.vx *= 0.985;
      piece.vy *= 0.985;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.angle += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.color;

      if (piece.round) {
        context.beginPath();
        context.arc(0, 0, piece.size / 2.4, 0, Math.PI * 2);
        context.fill();
      } else {
        context.scale(1, Math.cos(piece.angle * 3));
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      }

      context.restore();
    }

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(frame);
};
