import type { Db } from 'mongodb';
import { collections } from '@/lib/db/collections';

const MINUTE_IN_MS = 60_000;

export type RateRule = { limit: number; windowMs: number };

export type RateDecision = { allowed: boolean; retryAfterMs: number };

export const LOGIN_RULES = {
  perEmail: { limit: 5, windowMs: 15 * MINUTE_IN_MS },
  perAddress: { limit: 20, windowMs: 15 * MINUTE_IN_MS },
  global: { limit: 200, windowMs: MINUTE_IN_MS },
} satisfies Record<string, RateRule>;

export const REGISTER_RULES = {
  perAddress: { limit: 5, windowMs: 60 * MINUTE_IN_MS },
  global: { limit: 50, windowMs: MINUTE_IN_MS },
} satisfies Record<string, RateRule>;

export const UPLOAD_RULE: RateRule = { limit: 2, windowMs: 1000 };

export const decide = (count: number, limit: number, expiresAt: Date, now: Date): RateDecision => {
  if (count <= limit) {
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: Math.max(expiresAt.getTime() - now.getTime(), 0) };
};

export const minutesUntil = (milliseconds: number): number => Math.max(Math.ceil(milliseconds / MINUTE_IN_MS), 1);

export type RateLimiter = {
  consume: (key: string, rule: RateRule, now: Date) => Promise<RateDecision>;
  reset: (key: string) => Promise<void>;
};

export const createRateLimiter = (database: Db): RateLimiter => {
  const { rateLimits } = collections(database);

  return {
    async consume(key, rule, now) {
      const windowIsOpen = { $gt: ['$expiresAt', now] };
      const document = await rateLimits.findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              count: { $cond: [windowIsOpen, { $add: ['$count', 1] }, 1] },
              expiresAt: { $cond: [windowIsOpen, '$expiresAt', new Date(now.getTime() + rule.windowMs)] },
            },
          },
        ],
        { upsert: true, returnDocument: 'after' },
      );

      if (!document) {
        throw new Error(`Rate limit "${key}" was not stored`);
      }

      return decide(document.count, rule.limit, document.expiresAt, now);
    },
    async reset(key) {
      await rateLimits.deleteOne({ _id: key });
    },
  };
};
