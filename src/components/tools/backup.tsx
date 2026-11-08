'use client';

import { useState, type ChangeEvent } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { formatDay } from '@/lib/i18n/format';
import {
  BACKUP_LOCAL_KEYS,
  backupZip,
  makeBackup,
  parseBackup,
  planRestore,
  type Backup as BackupData,
  type RestoreItem,
} from '@/lib/tools/export/backup';
import { downloadFile, shareFile } from '@/lib/tools/export/download';
import { localDb } from '@/lib/tools/local-db';

type Pending = { backup: BackupData; plan: RestoreItem[]; fileName: string };

const readLocal = (): Record<string, string> =>
  Object.fromEntries(
    BACKUP_LOCAL_KEYS.flatMap((key) => {
      const value = window.localStorage.getItem(key);

      return value === null ? [] : [[key, value]];
    }),
  );

const countOf = (plan: RestoreItem[], action: RestoreItem['action']): number =>
  plan.filter((item) => item.action === action).length;

export default function Backup() {
  const { t, locale } = useI18n();
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const exportAll = async (): Promise<void> => {
    setBusy(true);
    const now = new Date();
    const backup = makeBackup(await localDb().entries(), readLocal(), now);
    downloadFile(backupZip(backup), `open-wrimo-backup-${now.toISOString().slice(0, 10)}.zip`, 'application/zip');
    setBusy(false);
    setMessage(t('Backup saved with {count} items.', { count: Object.keys(backup.entries).length }));
  };

  // Sends the same .zip through the phone's share sheet; where files cannot be shared, it downloads instead.
  const sendToDevice = async (): Promise<void> => {
    setBusy(true);
    setError('');
    const now = new Date();
    const backup = makeBackup(await localDb().entries(), readLocal(), now);
    const fileName = `open-wrimo-backup-${now.toISOString().slice(0, 10)}.zip`;
    const bytes = backupZip(backup);
    const outcome = await shareFile(bytes, fileName, 'application/zip');

    if (outcome === 'unsupported') {
      downloadFile(bytes, fileName, 'application/zip');
    }

    setBusy(false);
    setMessage(
      {
        shared: t('Backup sent. On the other device, open it here with "Choose a backup file".'),
        cancelled: t('Sending cancelled.'),
        unsupported: t(
          'This browser cannot share files, so the backup was downloaded. Send it with the app you prefer and open it on the other device.',
        ),
      }[outcome],
    );
  };

  const pickFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setMessage('');
    setError('');

    if (!file) {
      return;
    }

    try {
      const backup = parseBackup(new Uint8Array(await file.arrayBuffer()));
      const plan = planRestore(await localDb().entries(), backup);
      setPending({ backup, plan, fileName: file.name });
    } catch {
      setPending(null);
      setError(t('This file is not a backup of the tools.'));
    }
  };

  const restore = async (chosen: Pending): Promise<void> => {
    const db = localDb();
    const changes = chosen.plan.filter((item) => item.action !== 'keep');

    for (const item of changes) {
      await db.set(item.key, chosen.backup.entries[item.key]);
    }

    for (const [key, value] of Object.entries(chosen.backup.localStorage)) {
      window.localStorage.setItem(key, value);
    }

    setPending(null);
    setMessage(t('Restored {count} items.', { count: changes.length }));
  };

  const buttonClass = 'min-h-11 rounded-sm border border-rule px-4 font-display text-sm';

  return (
    <div className="flex flex-col gap-5">
      <section className="sheet flex flex-col gap-3 rounded-sm p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">{t('Save a backup')}</h2>
        <p className="text-sm text-ink-soft">
          {t(
            'One .zip with everything the tools keep on this device: drafts, snapshots, story sheets, the review text, the reminder and your favorite tools. Inside there is a backup.json and a .txt copy of each draft you can read anywhere.',
          )}
        </p>
        <button
          type="button"
          onClick={() => void exportAll()}
          disabled={busy}
          className="min-h-11 self-start rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink">
          {t('Download backup .zip')}
        </button>
        <button
          type="button"
          onClick={() => void sendToDevice()}
          disabled={busy}
          className="min-h-11 self-start rounded-sm border border-accent px-4 font-display text-sm font-semibold text-accent">
          {t('Send to another device')}
        </button>
        <p className="text-sm text-ink-soft">
          {t(
            'The tools keep everything on this device only. To move to a phone or another computer, send the backup and open it there with "Choose a backup file".',
          )}
        </p>
      </section>
      <section className="sheet flex flex-col gap-3 rounded-sm p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">{t('Bring a backup back')}</h2>
        <p className="text-sm text-ink-soft">
          {t(
            'Nothing is deleted: items in the backup are added or updated, and when the same draft exists here and in the backup, the most recently edited one stays.',
          )}
        </p>
        <label className={`${buttonClass} flex cursor-pointer items-center self-start`}>
          {t('Choose a backup file')}
          <input
            type="file"
            accept=".zip,.json,application/zip,application/json"
            className="sr-only"
            onChange={(event) => void pickFile(event)}
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        {pending ? (
          <div className="flex flex-col gap-3 rounded-sm border border-accent p-4" aria-live="polite">
            <p className="font-display">
              {pending.backup.createdAt
                ? t('Backup "{file}" from {date}', {
                    file: pending.fileName,
                    date: formatDay(locale, pending.backup.createdAt.slice(0, 10)),
                  })
                : t('Backup "{file}"', { file: pending.fileName })}
            </p>
            <ul className="list-disc pl-6 text-sm">
              <li>{t('{count} new items', { count: countOf(pending.plan, 'add') })}</li>
              <li>{t('{count} items updated', { count: countOf(pending.plan, 'replace') })}</li>
              <li>
                {t('{count} drafts kept because the one here is newer', { count: countOf(pending.plan, 'keep') })}
              </li>
              <li>{t('{count} browser settings', { count: Object.keys(pending.backup.localStorage).length })}</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void restore(pending)}
                className="min-h-11 rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink">
                {t('Restore now')}
              </button>
              <button type="button" onClick={() => setPending(null)} className={buttonClass}>
                {t('Cancel')}
              </button>
            </div>
          </div>
        ) : null}
        <p role="status" className="min-h-5 text-sm text-accent">
          {message}
        </p>
      </section>
      <p className="sheet rounded-sm p-5 text-sm text-ink-soft">
        {t(
          'This backup does not include your account data on the server (novels, goals, updates, profile). For that, use the JSON export in your profile.',
        )}
      </p>
    </div>
  );
}
