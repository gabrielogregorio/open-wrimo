// Creates 30 mock writers through the public v1 API (sign up, profile, novels, goals, progress),
// then spreads their history from 2025 until today by rewriting dates in the database.
// Usage: node scripts/seed-mock-writers.mts [--reset] [--pool <folder with covers/ and avatars/ images>]
// The app must be running (pnpm run dev). --reset only removes the mock writers and their images.
import { readFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { MongoClient, type Db } from 'mongodb';

const API = process.env.SEED_API ?? 'http://localhost:8920/api/v1';
const MOCK_DOMAIN = 'mock.openwrimo.test';
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- shared password of the local mock accounts, printed at the end
const PASSWORD = 'escrever-todo-dia';
const WRITERS = 30;
const NOVELS_PER_WRITER = 20;
const HISTORY_START = '2025-01-01';
const TIME_ZONE = 'America/Sao_Paulo';
const UPLOAD_GAP_MS = 600;
const PARALLEL_WRITERS = 2;

const argument = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);

  return index === -1 ? undefined : process.argv[index + 1];
};

const readEnvironment = async (): Promise<Record<string, string>> => {
  const values: Record<string, string> = {};

  for (const file of ['.env', '.env.local']) {
    const text = await readFile(file, 'utf8').catch(() => '');

    for (const line of text.split('\n')) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());

      if (match) {
        values[match[1]] = match[2];
      }
    }
  }

  return { ...values, ...(process.env as Record<string, string>) };
};

let seed = 20261105;

const random = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const between = (low: number, high: number): number => Math.round(low + random() * (high - low));
const chance = (probability: number): boolean => random() < probability;
const sample = <T,>(items: readonly T[], count: number): T[] => [...items].sort(() => random() - 0.5).slice(0, count);
const pause = (milliseconds: number): Promise<void> => new Promise((done) => setTimeout(done, milliseconds));

const FIRST_NAMES = [
  'Ana',
  'Beatriz',
  'Camila',
  'Daniela',
  'Eduarda',
  'Fernanda',
  'Gabriela',
  'Helena',
  'Isabela',
  'Juliana',
  'Larissa',
  'Mariana',
  'Natália',
  'Olívia',
  'Paula',
  'Rafaela',
  'Sofia',
  'Tatiana',
  'Valentina',
  'Yasmin',
  'Bruno',
  'Carlos',
  'Diego',
  'Felipe',
  'Gustavo',
  'Henrique',
  'Lucas',
  'Mateus',
  'Rodrigo',
  'Thiago',
];
const LAST_NAMES = [
  'Silva',
  'Souza',
  'Oliveira',
  'Santos',
  'Pereira',
  'Costa',
  'Ferreira',
  'Almeida',
  'Ribeiro',
  'Carvalho',
  'Gomes',
  'Martins',
  'Araújo',
  'Barbosa',
  'Rocha',
  'Lima',
];
const PLACES = [
  'Na cozinha',
  'Num café do centro',
  'No ônibus',
  'Na varanda',
  'Na biblioteca',
  'No quarto',
  'No celular',
  'No escritório',
];
const TIMES = ['De madrugada', 'Bem cedo', 'Depois do almoço', 'À noite', 'Nos fins de semana', 'Na hora do café'];
const BIOS = [
  'Escrevo romances de época e coleciono cadernos que nunca termino.',
  'Professora de dia, romancista de madrugada. Sonho em terminar a trilogia.',
  'Fantasia, mapas desenhados à mão e muito café.',
  'Comecei a escrever em 2019 e não parei mais. Meu gênero é o suspense.',
  'Escrevo histórias curtas sobre cidades pequenas do interior.',
  'Leitora compulsiva tentando virar escritora. Um capítulo por vez.',
  'Ficção científica, poesia e cartas que nunca envio.',
];
const FAVORITE_BOOKS = [
  'Dom Casmurro, Cem Anos de Solidão, Orgulho e Preconceito',
  'O Nome do Vento, Duna, A Hora da Estrela',
  'Capitães da Areia, O Conto da Aia, Jane Eyre',
  'Vidas Secas, O Senhor dos Anéis, Persuasão',
];
const FAVORITE_AUTHORS = [
  'Clarice Lispector, Machado de Assis',
  'Ursula K. Le Guin, Conceição Evaristo',
  'Jorge Amado, Jane Austen',
  'Lygia Fagundes Telles, Neil Gaiman',
];
const TITLE_START = [
  'O Silêncio',
  'A Casa',
  'As Cartas',
  'O Jardim',
  'A Última Noite',
  'O Mapa',
  'A Cidade',
  'O Inverno',
  'A Promessa',
  'O Farol',
  'A Ilha',
  'O Segredo',
  'A Dança',
  'O Retrato',
  'A Estrada',
];
const TITLE_END = [
  'das Marés',
  'de Vidro',
  'do Esquecimento',
  'de Outono',
  'dos Ventos',
  'Sem Nome',
  'de Areia',
  'das Sombras',
  'do Rio',
  'de Papel',
  'das Estrelas',
  'em Chamas',
  'de Setembro',
  'do Norte',
  'Perdida',
];
const GENRES = [
  'Romance',
  'Fantasia',
  'Suspense',
  'Drama',
  'Ficção científica',
  'Terror',
  'Histórico',
  'Jovem adulto',
  'Comédia',
  'Aventura',
  'Mistério',
  'Distopia',
];
const TYPES = ['novel', 'novel', 'novel', 'novella', 'short-stories', 'memoir', 'poetry', 'script', 'nonfiction'];
const STATUSES = ['not-started', 'in-progress', 'in-progress', 'in-progress', 'completed', 'on-hiatus'];
const MOODS = ['inspired', 'steady', 'tired', 'stuck', 'proud', '', ''];

const localDate = (instant: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
const addDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const toUsername = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 20)
    .replace(/-$/, '');

type Tokens = { accessToken: string; refreshToken: string };
type Writer = { name: string; username: string; email: string; tokens: Tokens; lastUpload: number };

let requests = 0;

const call = async (
  writer: Writer | null,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Record<string, unknown> }> => {
  const headers = new Headers(init.headers);

  if (writer) {
    headers.set('authorization', `Bearer ${writer.tokens.accessToken}`);
  }

  requests += 1;
  const response = await fetch(`${API}${path}`, { ...init, headers });

  if (response.status === 401 && writer) {
    const refreshed = await call(null, '/auth/refresh', jsonBody({ refreshToken: writer.tokens.refreshToken }));

    if (refreshed.status !== 200) {
      throw new Error(`Could not refresh the session of ${writer.username}`);
    }

    writer.tokens = refreshed.body as Tokens;

    return call(writer, path, init);
  }

  return {
    status: response.status,
    body: response.status === 204 ? {} : ((await response.json()) as Record<string, unknown>),
  };
};

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const ensureOk = (result: { status: number; body: Record<string, unknown> }, what: string): Record<string, unknown> => {
  if (result.status >= 400) {
    throw new Error(`${what} failed with ${result.status}: ${JSON.stringify(result.body)}`);
  }

  return result.body;
};

const waitForUploadSlot = async (writer: Writer): Promise<void> => {
  const wait = writer.lastUpload + UPLOAD_GAP_MS - Date.now();

  if (wait > 0) {
    await pause(wait);
  }

  writer.lastUpload = Date.now();
};

const imagePool = async (folder: string | undefined, kind: 'covers' | 'avatars'): Promise<string[]> => {
  if (!folder) {
    return [];
  }

  const directory = join(resolve(folder), kind);
  const files = await readdir(directory).catch(() => []);

  return files.filter((file) => /\.(jpe?g|png|webp)$/i.test(file)).map((file) => join(directory, file));
};

const imageFile = async (path: string): Promise<Blob> =>
  new Blob([new Uint8Array(await readFile(path))], { type: path.endsWith('.png') ? 'image/png' : 'image/jpeg' });

const removeMockWriters = async (database: Db, uploads: string): Promise<number> => {
  const users = await database
    .collection('users')
    .find({ email: { $regex: `@${MOCK_DOMAIN.replaceAll('.', '\\.')}$` } })
    .toArray();
  const ids = users.map((user) => user._id);
  const keys = [
    ...(
      await database
        .collection('projects')
        .find({ userId: { $in: ids } })
        .toArray()
    ).map((project) => project.coverKey),
    ...(
      await database
        .collection('profiles')
        .find({ userId: { $in: ids } })
        .toArray()
    ).map((profile) => profile.avatarKey),
  ].filter((key): key is string => typeof key === 'string');

  await Promise.all(keys.map((key) => unlink(join(uploads, key)).catch(() => undefined)));
  await Promise.all(
    ['projects', 'goals', 'entries', 'profiles', 'sessions', 'posts'].map((name) =>
      database.collection(name).deleteMany({ userId: { $in: ids } }),
    ),
  );
  await database.collection('users').deleteMany({ _id: { $in: ids } });

  return users.length;
};

type GoalPlan = { name: string; target: number; startDate: string; endDate: string; period: string };

const goalsFor = (today: string, index: number): GoalPlan[] => {
  const span = daysBetween(HISTORY_START, today);
  const start = addDays(HISTORY_START, between(0, Math.max(0, span - 40)));
  const length = pick([30, 30, 60, 90, 120, 180, 240]);
  const goals: GoalPlan[] = [
    {
      name: pick(['Primeiro rascunho', 'Terminar a parte 1', 'Meta da temporada', 'Reta final', 'Revisão completa']),
      target: pick([10000, 20000, 30000, 50000, 80000, 100000, 120000]),
      startDate: start,
      endDate: addDays(start, length - 1),
      period: '',
    },
  ];

  if (chance(0.5)) {
    goals.push({
      name: 'Meta diária',
      target: pick([250, 500, 750, 1000, 1667, 2000, 3000]),
      startDate: today,
      endDate: addDays(today, 365),
      period: 'daily',
    });
  }

  if (chance(0.35)) {
    goals.push({
      name: 'Meta mensal',
      target: pick([5000, 10000, 20000, 30000, 50000]),
      startDate: today,
      endDate: addDays(today, 365),
      period: 'monthly',
    });
  }

  if (index === 0 && chance(0.6)) {
    const year = today.slice(0, 4);
    goals.push({
      name: `Romance de novembro ${year}`,
      target: 50000,
      startDate: `${year}-11-01`,
      endDate: `${year}-11-30`,
      period: '',
    });
  }

  return goals;
};

const createWriter = async (
  index: number,
  today: string,
  covers: string[],
  avatars: string[],
  usedNames: Set<string>,
  // eslint-disable-next-line sonarjs/cognitive-complexity -- one linear script that mirrors what a writer does in the app
): Promise<{ username: string; entries: number }> => {
  let name = `${FIRST_NAMES[index]} ${pick(LAST_NAMES)}`;

  while (usedNames.has(name)) {
    name = `${FIRST_NAMES[index]} ${pick(LAST_NAMES)}`;
  }

  usedNames.add(name);
  const bare = index % 10 === 7;
  const withoutAvatar = bare || index % 6 === 3 || avatars.length === 0;
  const username = toUsername(name);
  const email = `${username}@${MOCK_DOMAIN}`;
  const tokens = ensureOk(
    await call(null, '/auth/register', jsonBody({ name, username, email, password: PASSWORD })),
    `sign up ${username}`,
  ) as Tokens;
  const writer: Writer = { name, username, email, tokens, lastUpload: 0 };

  const profile = new FormData();
  profile.set('name', name);
  profile.set('username', username);
  profile.set('isPublic', !bare && chance(0.7) ? 'on' : '');
  profile.set('bio', bare ? '' : pick(BIOS));
  profile.set('location', bare ? '' : pick(PLACES));
  profile.set('writingTime', bare ? '' : pick(TIMES));
  profile.set('favoriteBooks', bare || chance(0.3) ? '' : pick(FAVORITE_BOOKS));
  profile.set('favoriteAuthors', bare || chance(0.3) ? '' : pick(FAVORITE_AUTHORS));
  ['bio', 'stats', 'favorites', 'badges']
    .filter(() => chance(0.85))
    .forEach((section) => profile.append('show', section));

  if (!withoutAvatar) {
    await waitForUploadSlot(writer);
    profile.set('avatar', await imageFile(avatars[index % avatars.length]), 'avatar.jpg');
  }

  ensureOk(await call(writer, '/profile', { method: 'PUT', body: profile }), `profile ${username}`);

  const pace = bare ? 0.05 : pick([0.25, 0.5, 0.8, 1, 1.15, 1.4, 1.8]);
  let entries = 0;

  for (let book = 0; book < NOVELS_PER_WRITER; book += 1) {
    const title = `${pick(TITLE_START)} ${pick(TITLE_END)}`;
    const status = bare ? 'not-started' : pick(STATUSES);
    const novel = new FormData();
    novel.set('title', title);
    novel.set('status', status);
    novel.set('type', pick(TYPES));
    novel.set('genres', sample(GENRES, between(1, 3)).join(', '));
    novel.set(
      'summary',
      bare
        ? ''
        : `${name.split(' ')[0]} conta a história de quem precisa voltar para ${pick(['casa', 'o litoral', 'a fazenda', 'a capital'])} e encarar ${pick(['um segredo antigo', 'a família', 'um amor perdido', 'o próprio passado'])}.`,
    );
    novel.set(
      'excerpt',
      bare
        ? ''
        : `<p>${pick(['Ninguém lembrava', 'Choveu a noite inteira', 'A carta chegou numa terça', 'O trem atrasou de novo'])}, e foi assim que tudo começou.</p>`,
    );
    novel.set('playlistUrl', chance(0.2) ? 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' : '');
    novel.set('featured', book === 0 ? 'on' : '');
    novel.set('isPublic', !bare && chance(0.6) ? 'on' : '');

    if (!bare && covers.length > 0 && !chance(0.1)) {
      await waitForUploadSlot(writer);
      novel.set('cover', await imageFile(pick(covers)), 'cover.jpg');
    }

    const created = ensureOk(await call(writer, '/novels', { method: 'POST', body: novel }), `novel ${title}`);
    const novelId = String(created.id);
    const goals = goalsFor(today, book);
    const goalIds: string[] = [];

    for (const goal of goals) {
      goalIds.push(
        String(
          ensureOk(
            await call(
              writer,
              `/novels/${novelId}/goals`,
              jsonBody({ ...goal, unit: 'words', target: String(goal.target) }),
            ),
            'goal',
          ).id,
        ),
      );
    }

    if (status === 'not-started') {
      continue;
    }

    const main = goals[0];
    const goalDays = daysBetween(main.startDate, main.endDate) + 1;
    const daily = (main.target / goalDays) * pace * (0.6 + random() * 0.8);
    const lastDay = status === 'on-hiatus' ? addDays(today, -between(30, 120)) : today;
    const firstDay = addDays(main.startDate, -between(0, 20));
    const span = Math.max(1, daysBetween(firstDay, lastDay));
    const writingDays = Math.min(span, between(12, 45));
    const days = [...new Set(Array.from({ length: writingDays }, () => addDays(firstDay, between(0, span))))].filter(
      (date) => date <= today,
    );
    const perDay = (daily * span) / Math.max(1, days.length);

    for (const date of days) {
      const inMainGoal = date >= main.startDate && date <= main.endDate;
      const goalId = inMainGoal || goalIds.length === 1 ? goalIds[0] : pick(goalIds);
      const count = Math.min(12000, Math.max(50, Math.round(perDay * (0.4 + random() * 1.2))));
      ensureOk(
        await call(
          writer,
          `/goals/${goalId}/progress`,
          jsonBody({
            mode: 'add',
            count: String(count),
            date,
            mood: pick(MOODS),
            place: chance(0.3) ? pick(PLACES) : '',
            source: chance(0.2) ? 'sprint' : 'update',
          }),
        ),
        'progress',
      );
      entries += 1;
    }

    const dailyIndex = goals.findIndex((goal) => goal.period === 'daily');

    if (dailyIndex !== -1 && status === 'in-progress' && chance(0.6)) {
      const count = Math.round(goals[dailyIndex].target * (0.4 + random() * 1.3));
      ensureOk(
        await call(
          writer,
          `/goals/${goalIds[dailyIndex]}/progress`,
          jsonBody({ mode: 'add', count: String(count), date: today, mood: '', place: '' }),
        ),
        'today',
      );
      entries += 1;
    }
  }

  await call(null, '/auth/logout', jsonBody({ refreshToken: writer.tokens.refreshToken }));
  console.log(
    `${index + 1}/${WRITERS} ${name} (@${username})${bare ? ' sem nada' : ''}${withoutAvatar ? ' sem foto' : ''}: ${entries} atualizações`,
  );

  return { username, entries };
};

const rescaleWords = async (database: Db): Promise<void> => {
  const users = await database
    .collection('users')
    .find({ email: { $regex: `@${MOCK_DOMAIN.replaceAll('.', '\\.')}$` } })
    .toArray();
  const projects = await database
    .collection('projects')
    .find({ userId: { $in: users.map((user) => user._id) } })
    .toArray();

  for (const project of projects) {
    const goal = await database
      .collection('goals')
      .find({ projectId: project._id, period: { $in: [null, ''] } })
      .sort({ createdAt: 1 })
      .limit(1)
      .next();
    const entries = await database.collection('entries').find({ projectId: project._id }).toArray();
    const sum = entries.reduce((total, entry) => total + (entry.count as number), 0);

    if (!goal || sum === 0) {
      continue;
    }

    const factor = ((goal.target as number) * (0.3 + random() * 1.3)) / sum;

    for (const entry of entries) {
      await database
        .collection('entries')
        .updateOne({ _id: entry._id }, { $set: { count: Math.max(50, Math.round((entry.count as number) * factor)) } });
    }
  }
};

const spreadDates = async (database: Db, today: string): Promise<void> => {
  const users = await database
    .collection('users')
    .find({ email: { $regex: `@${MOCK_DOMAIN.replaceAll('.', '\\.')}$` } })
    .toArray();

  for (const user of users) {
    const projects = await database.collection('projects').find({ userId: user._id }).toArray();
    let firstActivity = today;

    for (const project of projects) {
      const entries = await database.collection('entries').find({ projectId: project._id }).sort({ date: 1 }).toArray();
      const goals = await database.collection('goals').find({ projectId: project._id }).toArray();
      const earliestGoal = goals.map((goal) => goal.startDate as string).sort()[0] ?? today;
      const first = [entries[0]?.date as string | undefined, earliestGoal].filter(Boolean).sort()[0] ?? today;
      const created = addDays(first, -between(1, 25));
      const last = (entries.at(-1)?.date as string | undefined) ?? created;
      firstActivity = created < firstActivity ? created : firstActivity;

      for (const entry of entries) {
        const hour = between(0, 23);
        await database.collection('entries').updateOne(
          { _id: entry._id },
          {
            $set: {
              hour,
              createdAt: new Date(
                `${entry.date}T${String((hour + 3) % 24).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}:00Z`,
              ),
            },
          },
        );
      }

      await database
        .collection('goals')
        .updateMany({ projectId: project._id }, [
          { $set: { createdAt: { $dateFromString: { dateString: '$startDate' } } } },
        ]);
      await database
        .collection('projects')
        .updateOne(
          { _id: project._id },
          { $set: { createdAt: new Date(`${created}T15:00:00Z`), updatedAt: new Date(`${last}T22:00:00Z`) } },
        );
    }

    const joined = addDays(firstActivity < HISTORY_START ? HISTORY_START : firstActivity, -between(0, 10));
    await database
      .collection('users')
      .updateOne({ _id: user._id }, { $set: { createdAt: new Date(`${joined}T14:00:00Z`) } });
  }
};

const main = async (): Promise<void> => {
  const environment = await readEnvironment();
  const uploads = resolve(environment.LOCAL_UPLOADS_DIR ?? 'public/uploads');
  const client = await new MongoClient(environment.MONGODB_URI ?? 'mongodb://localhost:27017').connect();
  const database = client.db(environment.MONGODB_DB ?? 'openwrimo');
  console.log(`Removed ${await removeMockWriters(database, uploads)} mock writers.`);

  if (process.argv.includes('--reset')) {
    await client.close();

    return;
  }

  const pool = argument('--pool');
  const [covers, avatars] = await Promise.all([imagePool(pool, 'covers'), imagePool(pool, 'avatars')]);
  console.log(`Image pool: ${covers.length} covers, ${avatars.length} portraits.`);
  const today = localDate(new Date());
  const usedNames = new Set<string>();
  const queue = Array.from({ length: WRITERS }, (_unused, index) => index);
  let entries = 0;

  await Promise.all(
    Array.from({ length: PARALLEL_WRITERS }, async () => {
      for (let index = queue.shift(); index !== undefined; index = queue.shift()) {
        entries += (await createWriter(index, today, covers, avatars, usedNames)).entries;
      }
    }),
  );

  console.log('Spreading dates from 2025 until today in the database...');
  await rescaleWords(database);
  await spreadDates(database, today);
  await client.close();
  console.log(
    `Done: ${WRITERS} writers, ${WRITERS * NOVELS_PER_WRITER} novels, ${entries} updates, ${requests} API requests. Password: ${PASSWORD}`,
  );
};

await main();
