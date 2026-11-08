// Records the README tour (docs/demo.gif and docs/demo-small.gif) on the production build with a
// throwaway database. It creates its own demo writers through the public API, so it never needs real
// data. The scenes follow docs/demo-script.md: change both together.
//
// Usage: pnpm run build && pnpm run demo:record           (records and writes the GIFs)
//        pnpm run build && DEMO_CHECK=1 pnpm run demo:record (runs the scenes without recording)
// Needs ffmpeg at /usr/bin/ffmpeg, or wherever FFMPEG points. A scene that fails is skipped and listed at the end, and the run fails.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8921';
const API = `${BASE_URL}/api/v1`;
const CHECK_ONLY = process.env.DEMO_CHECK === '1';
const PASSWORD = 'uma senha bem comprida';
const CAPTURE_FPS = 10;
const VIEWPORT = { width: 1200, height: 760 };
// An absolute path, so a writable folder early in PATH cannot swap the program.
const FFMPEG = process.env.FFMPEG ?? '/usr/bin/ffmpeg';

type Writer = { name: string; username: string; bio: string; location: string; color: string };
type Novel = { title: string; summary: string; status: string; genres: string; color: string; featured?: boolean };

// The main writer, whose notebook the tour shows, and four more for the community page.
const ANA: Writer = {
  name: 'Ana Souza',
  username: 'ana-souza',
  bio: 'Escrevo romances de madrugada, com café e chuva na janela.',
  location: 'São Paulo',
  color: '#7d2a26',
};
const OTHERS: Writer[] = [
  { name: 'Bruno Lima', username: 'bruno-lima', bio: 'Fantasia e mapas.', location: 'Recife', color: '#1f3a5f' },
  { name: 'Carla Dias', username: 'carla-dias', bio: 'Contos curtos.', location: 'Curitiba', color: '#3d5a3a' },
  { name: 'Davi Rocha', username: 'davi-rocha', bio: 'Mistério no interior.', location: 'Goiânia', color: '#5b3a6b' },
  { name: 'Elisa Prado', username: 'elisa-prado', bio: 'Romance de época.', location: 'Belém', color: '#8a5a1f' },
];
const ANA_NOVELS: Novel[] = [
  {
    title: 'A Casa das Marés',
    summary: 'Uma família, uma casa na praia e um segredo que a maré traz de volta.',
    status: 'in-progress',
    genres: 'Romance, Mistério',
    color: '#1f5f6b',
    featured: true,
  },
  {
    title: 'O Último Bonde',
    summary: 'A última noite dos bondes no centro de São Paulo.',
    status: 'in-progress',
    genres: 'Drama',
    color: '#7d2a26',
  },
  {
    title: 'Cartas para Lúcia',
    summary: 'Cinquenta anos de cartas guardadas numa lata de biscoito.',
    status: 'completed',
    genres: 'Romance',
    color: '#5b3a6b',
  },
];

const log = (text: string): void => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${text}`);

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
const daysAgo = (days: number): string => isoDate(new Date(Date.now() - days * 86_400_000));
const escapeXml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A plain cover with the title on it, so the shelf looks like books without any real artwork. */
const coverImage = (title: string, color: string): Promise<Buffer> =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="${color}"/>` +
        `<rect x="40" y="40" width="520" height="820" fill="none" stroke="#f7f1e3" stroke-width="4"/>` +
        `<text x="300" y="420" font-family="Georgia, serif" font-size="54" fill="#f7f1e3" text-anchor="middle">` +
        `${escapeXml(title)}</text></svg>`,
    ),
  )
    .png()
    .toBuffer();

const avatarImage = (name: string, color: string): Promise<Buffer> => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('');

  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/>` +
        `<text x="200" y="250" font-family="Georgia, serif" font-size="150" fill="#f7f1e3" text-anchor="middle">` +
        `${initials}</text></svg>`,
    ),
  )
    .png()
    .toBuffer();
};

const call = async (path: string, init: RequestInit & { token?: string } = {}): Promise<Record<string, unknown>> => {
  const { token, ...rest } = init;
  const response = await fetch(`${API}${path}`, {
    ...rest,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...rest.headers },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
};

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const file = (bytes: Buffer, name: string): File => new File([new Uint8Array(bytes)], name, { type: 'image/png' });

/** Signs up a writer, opens a public profile with a picture, and gives them novels, a goal and a history. */
const createWriter = async (writer: Writer, novels: Novel[], days: number): Promise<void> => {
  const { accessToken } = await call(
    '/auth/register',
    json({
      name: writer.name,
      username: writer.username,
      email: `${writer.username}@demo.openwrimo.test`,
      password: PASSWORD,
      acceptTerms: 'on',
    }),
  );
  const token = String(accessToken);
  const profile = new FormData();

  for (const [field, value] of Object.entries({
    name: writer.name,
    username: writer.username,
    isPublic: 'on',
    bio: writer.bio,
    location: writer.location,
    writingTime: 'De madrugada',
    pronouns: '',
  })) {
    profile.set(field, value);
  }

  for (const section of ['bio', 'stats', 'favorites', 'badges']) {
    profile.append('show', section);
  }

  profile.set('avatar', file(await avatarImage(writer.name, writer.color), 'avatar.png'));
  await call('/profile', { method: 'PUT', body: profile, token });

  for (const [index, novel] of novels.entries()) {
    // Two images per second per writer is the upload limit.
    await sleep(600);
    const form = new FormData();

    for (const [field, value] of Object.entries({
      title: novel.title,
      status: novel.status,
      type: 'novel',
      genres: novel.genres,
      summary: novel.summary,
      isPublic: 'on',
      featured: novel.featured ? 'on' : '',
    })) {
      form.set(field, value);
    }

    form.set('cover', file(await coverImage(novel.title, novel.color), 'cover.png'));
    const { id } = await call('/novels', { method: 'POST', body: form, token });
    const today = new Date();
    const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const monthEnd = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const { id: goalId } = await call(`/novels/${String(id)}/goals`, {
      ...json({
        name: 'Meta do mês',
        unit: 'words',
        target: index === 0 ? 50000 : 20000,
        startDate: monthStart,
        endDate: monthEnd,
      }),
      token,
    });

    // A steady but uneven history, the same on every run.
    for (let day = days; day >= 1; day -= 1) {
      const count = 400 + ((day * 37 + index * 53) % 1300);

      if ((day + index) % 6 !== 0) {
        await call(`/goals/${String(goalId)}/progress`, { ...json({ mode: 'add', count, date: daysAgo(day) }), token });
      }
    }
  }
};

const seed = async (): Promise<void> => {
  log('creating the demo writers');
  await createWriter(ANA, ANA_NOVELS, 40);

  for (const [index, writer] of OTHERS.entries()) {
    await createWriter(
      writer,
      [
        {
          ...ANA_NOVELS[index % ANA_NOVELS.length],
          title: `${writer.name.split(' ')[0]}: livro um`,
          color: writer.color,
        },
      ],
      12 + index * 4,
    );
  }
};

// Caption and pointer drawn into the page, so the GIF shows where the visitor looks and why.
const OVERLAY = () =>
  addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent =
      '#demo-cur{position:fixed;left:0;top:0;width:22px;height:30px;z-index:99999;pointer-events:none}' +
      '#demo-cap{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99998;pointer-events:none;' +
      'background:#2a2118f2;color:#f7f1e3;border:1px solid #7d2a26;padding:8px 18px;border-radius:9px;' +
      'font:600 17px Georgia,serif;white-space:nowrap}#demo-cap:empty{display:none}';
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.innerHTML =
      '<svg id="demo-cur" viewBox="0 0 22 30"><path d="M2 2v23l6-6 4 9 4-2-4-9h8z" fill="#fff" stroke="#000" stroke-width="1.6"/></svg>' +
      '<div id="demo-cap"></div>';
    document.body.appendChild(box);
    document.getElementById('demo-cap')!.textContent = sessionStorage.getItem('demo-cap') ?? '';
    addEventListener(
      'mousemove',
      (event) => {
        document.getElementById('demo-cur')!.style.transform = `translate(${event.clientX}px,${event.clientY}px)`;
      },
      true,
    );
  });

type Scene = { id: string; caption: string; run: (page: Page, tour: Tour) => Promise<void> };

type Tour = {
  caption: (text: string) => Promise<void>;
  point: (locator: Locator, options?: { click?: boolean }) => Promise<void>;
  scroll: (pixels: number, steps?: number) => Promise<void>;
  open: (path: string) => Promise<void>;
};

const makeTour = (page: Page): Tour => ({
  caption: async (text) => {
    await page.evaluate((value) => {
      sessionStorage.setItem('demo-cap', value);
      const element = document.getElementById('demo-cap');

      if (element) {
        element.textContent = value;
      }
    }, text);
  },
  point: async (locator, { click = true } = {}) => {
    await locator.waitFor({ timeout: 15_000 });
    await locator.scrollIntoViewIfNeeded();
    const box = (await locator.boundingBox())!;
    await page.mouse.move(box.x + Math.min(box.width / 2, 80), box.y + box.height / 2, { steps: 12 });
    await sleep(150);

    if (click) {
      await locator.click();
    }
  },
  scroll: async (pixels, steps = 10) => {
    for (let step = 0; step < steps; step += 1) {
      await page.mouse.wheel(0, pixels / steps);
      await sleep(70);
    }
  },
  // Moves inside the app like a click on a link, so the book animation of a fresh load does not replay.
  open: async (path) => {
    const pushed = await page.evaluate((target) => {
      const router = (window as unknown as { next?: { router?: { push: (href: string) => void } } }).next?.router;
      router?.push(target);

      return Boolean(router);
    }, path);

    if (!pushed) {
      await page.goto(`${BASE_URL}${path}`);
    }

    await page.waitForURL(`**${path}`);
    await page.waitForLoadState('networkidle');
  },
});

// The scenes, in order. docs/demo-script.md describes each one; keep the ids and captions in step.
const SCENES: Scene[] = [
  {
    id: 'sign-up',
    caption: 'Criar conta: o olhinho mostra a senha digitada',
    run: async (page, tour) => {
      await sleep(900);
      await tour.point(page.getByLabel('Senha', { exact: true }));
      await page.getByLabel('Senha', { exact: true }).pressSequentially('minha senha secreta', { delay: 60 });
      await tour.point(page.getByRole('button', { name: 'Mostrar senha' }));
      await sleep(1400);
    },
  },
  {
    id: 'sign-in',
    caption: 'Entrar e ir direto para a escrivaninha',
    run: async (page, tour) => {
      await tour.open('/login');
      await page.getByLabel('E-mail').fill(`${ANA.username}@demo.openwrimo.test`);
      await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
      await tour.point(page.getByRole('button', { name: 'Entrar' }));
      await page.waitForURL('**/write');
      await page.waitForLoadState('networkidle');
    },
  },
  {
    id: 'desk',
    caption: 'Escrivaninha: seus romances, metas e conquistas',
    run: async (page, tour) => {
      await sleep(1600);
      const book = page.locator('.book-mock').first();
      await tour.point(book, { click: false });
      const box = (await book.boundingBox())!;

      for (const across of [0.1, 0.9, 0.3, 0.7, 0.5]) {
        await page.mouse.move(box.x + box.width * across, box.y + box.height * 0.5, { steps: 8 });
        await sleep(250);
      }

      await tour.caption('Cada meta com barra e porcentagem');
      await tour.scroll(420);
      await sleep(1500);
    },
  },
  {
    id: 'update',
    caption: 'Atualizar: escolha o livro na prateleira 3D',
    run: async (page, tour) => {
      await tour.point(page.getByRole('link', { name: 'Atualizar minhas palavras' }).first());
      await page.waitForURL('**/write/update');
      await page.waitForLoadState('networkidle');
      await sleep(900);

      for (let turn = 0; turn < 2; turn += 1) {
        await tour.point(page.getByRole('button', { name: 'Próximo livro' }));
        await sleep(550);
      }

      await tour.point(page.getByRole('button', { name: 'Livro anterior' }));
      await tour.caption('Some ou defina o total do dia');
      await tour.point(page.locator('#field-count'));
      await page.locator('#field-count').pressSequentially('1850', { delay: 120 });
      await tour.point(page.getByLabel('Onde você escreveu?'));
      await page.getByLabel('Onde você escreveu?').pressSequentially('Num café do centro', { delay: 40 });
      await tour.point(page.getByRole('button', { name: 'Atualizar', exact: true }));
      await page.getByText('Progresso salvo.').waitFor({ timeout: 15_000 });
      await tour.caption('Metas batidas e conquistas comemoram na hora');
      await sleep(2600);
    },
  },
  {
    id: 'stats',
    caption: 'Estatísticas: anéis do total e do dia',
    run: async (_page, tour) => {
      await tour.open('/write/stats');
      await sleep(1200);
      await tour.scroll(420);
      await tour.caption('Ritmo esperado, sequência e mês a mês');
      await sleep(1200);
      await tour.scroll(700, 12);
      await sleep(1500);
    },
  },
  {
    id: 'sprint',
    caption: 'Sprint: timer com despertador no fim',
    run: async (page, tour) => {
      await tour.open('/write/sprint');
      await tour.point(page.getByRole('button', { name: '10 min', exact: true }));
      await tour.point(page.getByRole('button', { name: 'Começar' }));
      await sleep(2400);
    },
  },
  {
    id: 'tools',
    caption: 'Ferramentas: editor de foco, nomes, ideias, conversor para ePub',
    run: async (page, tour) => {
      await tour.open('/write/tools');
      await sleep(1400);
      await tour.scroll(500, 10);
      await sleep(900);
      await tour.point(page.getByRole('link', { name: /Dado de enredo/ }).first());
      await page.waitForURL('**/write/tools/plot-dice');
      await page.waitForLoadState('networkidle');
      await tour.caption('Dado de enredo: 159 reviravoltas e algumas raras');

      for (let roll = 0; roll < 2; roll += 1) {
        await tour.point(page.getByRole('button', { name: 'Jogar o dado' }));
        await sleep(1300);
      }
    },
  },
  {
    id: 'novel',
    caption: 'Cada romance: detalhes, metas e conquistas',
    run: async (page, tour) => {
      await tour.open('/write');
      await tour.point(page.locator('article h2 a').first());
      await page.waitForURL(/\/write\/novels\/[0-9a-f]{24}$/);
      await sleep(1000);
      await tour.point(page.getByRole('link', { name: 'Metas', exact: true }));
      await sleep(1200);
      await tour.point(page.getByRole('link', { name: 'Conquistas', exact: true }));
      await sleep(900);
      await tour.scroll(600, 10);
      await sleep(1000);
    },
  },
  {
    id: 'community',
    caption: 'Comunidade: quem abriu o perfil para o mundo',
    run: async (_page, tour) => {
      await tour.open('/write/community');
      await sleep(1500);
      await tour.scroll(500, 10);
      await sleep(1000);
    },
  },
  {
    id: 'public-profile',
    caption: 'Perfil público em /u/username, você escolhe o que mostra',
    run: async (page, tour) => {
      await tour.open(`/u/${OTHERS[0].username}`);
      await sleep(1400);
      await tour.caption('Denunciar abre um modal com o que está sendo denunciado');
      await tour.point(page.getByRole('button', { name: 'Denunciar perfil' }));
      await page.getByRole('dialog').waitFor();
      await sleep(1800);
      await page.keyboard.press('Escape');
      await sleep(500);
      await tour.scroll(600, 10);
      await sleep(1200);
    },
  },
];

/** Screenshots at a steady pace until stopped; each frame keeps the time it was taken. */
const startCapture = (page: Page, directory: string) => {
  const frames: { name: string; at: number }[] = [];
  let running = true;
  const done = (async () => {
    while (running) {
      const at = Date.now();
      const name = join(directory, `f${String(frames.length).padStart(5, '0')}.png`);

      // Chrome refuses a screenshot now and then while a page is being replaced; that frame is skipped.
      if (
        await page.screenshot({ path: name }).then(
          () => true,
          () => false,
        )
      ) {
        frames.push({ name, at });
      }

      await sleep(Math.max(0, 1000 / CAPTURE_FPS - (Date.now() - at)));
    }
  })();

  return async () => {
    running = false;
    await done;

    return frames;
  };
};

type Encoding = { fps: number; colors: number; width: number; speed: number; denoise: string };

// Two sizes: the README shows the small one; the big one is linked under it.
const OUTPUTS: Record<string, Encoding> = {
  'docs/demo.gif': { fps: 6, colors: 64, width: 900, speed: 1.2, denoise: 'hqdn3d=2:2:4:4' },
  'docs/demo-small.gif': { fps: 5, colors: 40, width: 640, speed: 1.8, denoise: 'hqdn3d=3:3:6:6' },
};

const encode = (frames: { name: string; at: number }[], out: string, settings: Encoding, directory: string): void => {
  const list = join(directory, `${settings.width}.txt`);
  const lines = frames.flatMap((frame, index) => {
    const next = frames[index + 1];
    const seconds = next ? (next.at - frame.at) / 1000 / settings.speed : 1.5;

    return [`file '${frame.name}'`, `duration ${seconds.toFixed(3)}`];
  });
  const last = `file '${frames.at(-1)!.name}'`;
  writeFileSync(list, `${[...lines, last].join('\n')}\n`);
  const filter =
    `${settings.denoise},fps=${settings.fps},scale=${settings.width}:-1:flags=lanczos,split[a][b];` +
    `[a]palettegen=max_colors=${settings.colors}:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`;
  execFileSync(
    FFMPEG,
    ['-y', '-v', 'error', '-threads', '2', '-f', 'concat', '-safe', '0', '-i', list, '-vf', filter, '-loop', '0', out],
    {
      stdio: 'inherit',
    },
  );
  log(`${out}: ${(statSync(out).size / 1024 / 1024).toFixed(2)} MB`);
};

await seed();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
page.on('pageerror', (error) => log(`page error: ${error.message}`));
await page.addInitScript(OVERLAY);
await page.addInitScript(() => localStorage.setItem('openwrimo-sound', 'off'));

await page.goto(`${BASE_URL}/register`);
await page.waitForLoadState('networkidle');
await page.mouse.move(900, 300);

const directory = mkdtempSync(join(tmpdir(), 'openwrimo-demo-'));
const stop = CHECK_ONLY ? async () => [] : startCapture(page, directory);
const tour = makeTour(page);
const skipped: string[] = [];

for (const scene of SCENES) {
  log(scene.id);

  try {
    await tour.caption(scene.caption);
    await scene.run(page, tour);
  } catch (error) {
    skipped.push(scene.id);
    log(`skipped ${scene.id}: ${(error as Error).message.split('\n')[0]}`);
  }
}

await tour.caption('');
const frames = await stop();
await browser.close();

if (skipped.length > 0) {
  log(`scenes that failed: ${skipped.join(', ')}; fix them in this script and in docs/demo-script.md`);
  process.exit(1);
}

if (!CHECK_ONLY) {
  log(`${frames.length} frames, ${((frames.at(-1)!.at - frames[0].at) / 1000).toFixed(1)} s`);

  for (const [out, settings] of Object.entries(OUTPUTS)) {
    encode(frames, out, settings, directory);
  }
}

log(CHECK_ONLY ? 'every scene ran' : 'done');
