'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { localDb } from '@/lib/tools/local-db';
import {
  DEFAULT_REMINDER,
  REMINDER_KEY,
  normalizeReminder,
  reminderDue,
  type ReminderSettings,
} from '@/lib/tools/rhythm/reminder';

const CHECK_EVERY_MS = 30_000;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

type Permission = NotificationPermission | 'unsupported';

const currentPermission = (): Permission =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

// The server cannot know the browser's permission, so it renders 'unsupported' and the real value
// takes over once the page is running in the browser, without a hydration mismatch.
const noSubscription = (): (() => void) => () => undefined;
const serverPermission = (): Permission => 'unsupported';

const deliver = (title: string, body: string, showBanner: (shown: boolean) => void): void => {
  if (currentPermission() === 'granted') {
    new Notification(title, { body, tag: 'open-wrimo-reminder' });

    return;
  }

  showBanner(true);
};

export default function Reminder() {
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [loaded, setLoaded] = useState(false);
  const browserPermission = useSyncExternalStore(noSubscription, currentPermission, serverPermission);
  const [answered, setAnswered] = useState<Permission | null>(null);
  const permission = answered ?? browserPermission;
  const [banner, setBanner] = useState(false);
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });

  const show = (): void =>
    deliver(t('Time to write!'), t('Your writing time has come. Even a few lines count.'), setBanner);

  const save = (next: ReminderSettings): void => {
    setSettings(next);
    void localDb().set(REMINDER_KEY, next);
  };

  useEffect(() => {
    let active = true;
    void localDb()
      .get(REMINDER_KEY)
      .then((stored) => {
        if (active) {
          setSettings(normalizeReminder(stored));
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !settings.enabled) {
      return undefined;
    }

    const check = (): void => {
      const due = reminderDue(settings, new Date());

      if (due) {
        const next = { ...settings, lastShownOn: due };
        setSettings(next);
        void localDb().set(REMINDER_KEY, next);
        deliver(t('Time to write!'), t('Your writing time has come. Even a few lines count.'), setBanner);
      }
    };
    const interval = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', check);
    };
  }, [loaded, settings, t]);

  const askPermission = async (): Promise<void> => {
    setAnswered(await Notification.requestPermission());
  };

  const toggleDay = (day: number): void => {
    const weekdays = settings.weekdays.includes(day)
      ? settings.weekdays.filter((item) => item !== day)
      : [...settings.weekdays, day].sort((first, second) => first - second);
    save({ ...settings, weekdays, lastShownOn: null });
  };

  const permissionText = {
    granted: t('Notifications are allowed. The reminder shows as a system notification.'),
    denied: t('Notifications are blocked in this browser, so the reminder shows as a banner on this page.'),
    default: t('Allow notifications to get the reminder even while you are in another tab.'),
    unsupported: t('This browser does not show notifications, so the reminder shows as a banner on this page.'),
  }[permission];

  return (
    <div className="flex flex-col gap-5">
      {banner ? (
        <div
          role="alert"
          className="sheet flex flex-wrap items-center justify-between gap-3 rounded-sm border-accent p-4">
          <p className="font-display text-lg text-accent">{t('Time to write! Your writing time has come.')}</p>
          <button
            type="button"
            onClick={() => setBanner(false)}
            className="min-h-11 rounded-sm border border-rule px-4 font-display text-sm">
            {t('Dismiss')}
          </button>
        </div>
      ) : null}
      <section className="sheet flex flex-col gap-5 rounded-sm p-5 sm:p-6">
        <label className="flex min-h-11 items-center gap-3 font-display text-lg">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--accent)]"
            checked={settings.enabled}
            disabled={!loaded}
            onChange={(event) => save({ ...settings, enabled: event.target.checked, lastShownOn: null })}
          />
          {t('Remind me to write')}
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor="reminder-time" className="font-display text-sm font-semibold">
            {t('Writing time')}
          </label>
          <input
            id="reminder-time"
            type="time"
            value={settings.time}
            disabled={!loaded}
            onChange={(event) => save(normalizeReminder({ ...settings, time: event.target.value, lastShownOn: null }))}
            className={`${fieldClasses} min-h-11 max-w-40`}
          />
        </div>
        <fieldset className="flex flex-col gap-2" disabled={!loaded}>
          <legend className="mb-1 font-display text-sm font-semibold">{t('On these days')}</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={settings.weekdays.includes(day)}
                onClick={() => toggleDay(day)}
                className={`min-h-11 min-w-11 rounded-full border px-3 font-display text-sm capitalize ${settings.weekdays.includes(day) ? 'border-accent bg-accent text-accent-ink' : 'border-rule'}`}>
                {weekdayName.format(new Date(Date.UTC(2026, 10, 8 + day)))}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-3">
          <p className="text-sm">{permissionText}</p>
          <div className="flex flex-wrap gap-3">
            {permission === 'default' ? (
              <button
                type="button"
                onClick={() => void askPermission()}
                className="min-h-11 rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink">
                {t('Allow notifications')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={show}
              className="min-h-11 rounded-sm border border-rule px-4 font-display text-sm">
              {t('Try the reminder now')}
            </button>
          </div>
        </div>
      </section>
      <p className="sheet rounded-sm p-5 text-sm text-ink-soft">
        {t(
          'The reminder only works while Open Wrimo is open on this device, in a tab or an installed app. There is no server sending it, so with the app closed nothing arrives. The setting is saved only on this device.',
        )}
      </p>
    </div>
  );
}
