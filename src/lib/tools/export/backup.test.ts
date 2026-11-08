import { BACKUP_UNREADABLE, backupZip, makeBackup, parseBackup, planRestore } from './backup';
import { createZip, readZip, textOf, utf8 } from './zip';

const draft = {
  id: 'a',
  novelId: null,
  title: 'Capítulo Um',
  text: 'Era uma vez.',
  order: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
};

const backup = makeBackup(
  [
    ['draft:a', draft],
    ['story:x', { name: 'Ana' }],
  ],
  { 'openwrimo-favorite-tools': '["epub"]', other: 'no' },
  new Date('2026-11-08T10:00:00Z'),
);

describe('makeBackup and backupZip', () => {
  it('keeps the entries and only the known browser settings', () => {
    expect(backup).toMatchObject({
      format: 'open-wrimo-tools-backup',
      version: 1,
      createdAt: '2026-11-08T10:00:00.000Z',
      localStorage: { 'openwrimo-favorite-tools': '["epub"]' },
    });
    expect(Object.keys(backup.entries)).toEqual(['draft:a', 'story:x']);
  });

  it('zips the JSON with a readable copy of each draft', () => {
    const files = readZip(backupZip(backup));

    expect(files.map((file) => file.name)).toEqual(['backup.json', 'drafts/001-capitulo-um.txt']);
    expect(textOf(files[1].data)).toBe('Capítulo Um\n\nEra uma vez.\n');
  });
});

describe('parseBackup', () => {
  it('reads a zip or a bare JSON file', () => {
    expect(parseBackup(backupZip(backup))).toEqual(backup);
    expect(parseBackup(utf8(JSON.stringify(backup)))).toEqual(backup);
  });

  it('fills missing optional fields and drops unknown settings', () => {
    const parsed = parseBackup(
      utf8(
        JSON.stringify({
          format: 'open-wrimo-tools-backup',
          entries: {},
          localStorage: { 'openwrimo-favorite-tools': 3, x: 'y' },
        }),
      ),
    );

    expect(parsed).toEqual({
      format: 'open-wrimo-tools-backup',
      version: 1,
      createdAt: '',
      entries: {},
      localStorage: {},
    });
    expect(parseBackup(utf8(JSON.stringify({ format: 'open-wrimo-tools-backup', entries: {} }))).localStorage).toEqual(
      {},
    );
  });

  it('refuses files that are not backups', () => {
    const broken = createZip([{ name: 'a', data: 'b' }]);
    broken[0x22] = 0;

    for (const bytes of [
      utf8('not json'),
      utf8('[]'),
      utf8('{"format":"other","entries":{}}'),
      utf8('{"format":"open-wrimo-tools-backup","entries":[]}'),
      createZip([{ name: 'other.json', data: '{}' }]),
      utf8('PK not really'),
    ]) {
      expect(() => parseBackup(bytes)).toThrow(BACKUP_UNREADABLE);
    }
  });
});

describe('planRestore', () => {
  it('adds new keys, skips equal ones, keeps newer drafts and replaces the rest', () => {
    const incoming = makeBackup(
      [
        ['draft:a', draft],
        ['draft:b', { ...draft, id: 'b' }],
        ['draft:c', { ...draft, id: 'c' }],
        ['story:x', { name: 'Ana' }],
        ['story:y', { name: 'Bia' }],
        ['review:text', 'novo'],
      ],
      {},
      new Date(),
    );
    const current: [string, unknown][] = [
      ['draft:a', draft],
      ['draft:b', { ...draft, id: 'b', updatedAt: '2026-11-07T00:00:00.000Z' }],
      ['draft:c', { ...draft, id: 'c', updatedAt: '2026-11-01T00:00:00.000Z' }],
      ['story:x', { name: 'Ana' }],
      ['review:text', 'velho'],
    ];

    expect(planRestore(current, incoming)).toEqual([
      { key: 'draft:b', action: 'keep' },
      { key: 'draft:c', action: 'replace' },
      { key: 'story:y', action: 'add' },
      { key: 'review:text', action: 'replace' },
    ]);
  });
});
