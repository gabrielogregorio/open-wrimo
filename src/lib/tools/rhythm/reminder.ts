// The writing reminder: a time of day and the weekdays it rings on, while the app is open.
export type ReminderSettings = { enabled: boolean; time: string; weekdays: number[]; lastShownOn: string | null };

export const REMINDER_KEY = 'reminder:settings';
// After the writing time passes, the reminder still shows within this window (the tab may have slept).
export const REMINDER_WINDOW_MINUTES = 60;

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '20:00',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  lastShownOn: null,
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const normalizeReminder = (value: unknown): ReminderSettings => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_REMINDER;
  }

  const raw = value as Record<string, unknown>;
  const weekdays = Array.isArray(raw.weekdays)
    ? [...new Set(raw.weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort(
        (first, second) => first - second,
      )
    : DEFAULT_REMINDER.weekdays;

  return {
    enabled: raw.enabled === true,
    time: typeof raw.time === 'string' && TIME.test(raw.time) ? raw.time : DEFAULT_REMINDER.time,
    weekdays,
    lastShownOn: typeof raw.lastShownOn === 'string' ? raw.lastShownOn : null,
  };
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const localDay = (now: Date): string => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// The day to mark as reminded when the reminder is due now, or null.
export const reminderDue = (settings: ReminderSettings, now: Date): string | null => {
  const today = localDay(now);

  if (!settings.enabled || settings.lastShownOn === today || !settings.weekdays.includes(now.getDay())) {
    return null;
  }

  const [hours, minutes] = settings.time.split(':').map(Number);
  const late = now.getHours() * 60 + now.getMinutes() - (hours * 60 + minutes);

  return late >= 0 && late < REMINDER_WINDOW_MINUTES ? today : null;
};
