/**
 * @file Pure utility functions — no React hooks, no browser APIs
 *
 * Formatting, date math, event normalization, and localization helpers.
 * Used by both the data layer (lib/data.ts) and hooks (hooks/useData.ts).
 * Safe to import server-side or client-side.
 */

import type { HackEvent, Category } from './types';

// ─── Date Formatting & Parsing ───────────────────────────────────────

export const formatDate = (date: Date | string, fmt = 'yyyy-MM-dd'): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return fmt.replace('yyyy', String(year)).replace('MM', month).replace('dd', day);
};

/**
 * Parse a "YYYY-MM-DD" string into a local-midnight Date.
 * Unlike `new Date(dateStr)`, this avoids UTC offset surprises.
 */
export const parseLocalDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ─── Display Formatting ──────────────────────────────────────────────

export const formatCurrency = (amount?: string | number): string => {
  if (!amount || amount === '0') return '$0';
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num}`;
};

// ─── Calendar Helpers ────────────────────────────────────────────────

export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// ─── Localization Helpers ────────────────────────────────────────────

/**
 * Resolve a dot-path to an array from the i18n locales tree.
 * Tries current language first, falls back to the raw event field.
 * Returns `[]` if nothing is found (never null/undefined).
 */
export const getLocalizedArray = <T>(
  event: HackEvent,
  fieldPath: string,
  currentLang: string
): T[] => {
  if (currentLang !== 'en' && event.locales && typeof event.locales === 'object') {
    const locales = event.locales as Record<string, unknown>;
    const loc = locales[currentLang];
    if (loc && typeof loc === 'object') {
      const keys = fieldPath.split('.');
      let val: unknown = loc;
      for (const key of keys) {
        if (val === undefined || val === null) break;
        val = (val as Record<string, unknown>)[key];
      }
      if (Array.isArray(val)) return val as T[];
    }
  }

  const keys = fieldPath.split('.');
  let val: unknown = event;
  for (const key of keys) {
    if (val === undefined || val === null) break;
    val = (val as Record<string, unknown>)[key];
  }
  return Array.isArray(val) ? (val as T[]) : [];
};

/**
 * Resolve a dot-path to a string from the i18n locales tree.
 * Tries current language first, falls back to raw event field, then ''.
 */
export const getLocalizedField = (
  event: HackEvent,
  fieldPath: string,
  currentLang: string
): string => {
  const keys = fieldPath.split('.');

  if (currentLang !== 'en' && event.locales && typeof event.locales === 'object') {
    const locales = event.locales as Record<string, unknown>;
    const loc = locales[currentLang];
    if (loc && typeof loc === 'object') {
      let val: unknown = loc;
      for (const key of keys) {
        if (val === undefined || val === null) break;
        val = (val as Record<string, unknown>)[key];
      }
      if (val !== undefined && val !== null) return String(val);
    }
  }

  let val: unknown = event;
  for (const key of keys) {
    if (val === undefined || val === null) break;
    val = (val as Record<string, unknown>)[key];
  }
  return val !== undefined && val !== null ? String(val) : '';
};

// ─── Event Normalization ─────────────────────────────────────────────

/**
 * Normalize a value that might be a single item or an array into an array.
 * Useful for fields like `blockchain` / `category` which are arrays in
 * the schema but sometimes arrive as strings from malformed JSON.
 */
export function normalizeArray<T>(val: T | T[]): T[] {
  return Array.isArray(val) ? val : [val];
}

export function getEventCategories(event: HackEvent): string[] {
  return normalizeArray(event.category);
}

export function getEventBlockchains(event: HackEvent): string[] {
  return normalizeArray(event.blockchain);
}

export function getEventCategoryColor(
  event: HackEvent,
  categories: Category[],
): string {
  const cats = getEventCategories(event);
  const cat = categories.find((c) => c.id === cats[0]);
  return cat?.color || '#888888';
}

export function getDayEventColor(
  dayEvents: HackEvent[],
  categories: Category[],
): string | null {
  if (!dayEvents.length) return null;
  const sorted = [...dayEvents].sort((a, b) => {
    const tA = a.attackTime?.startTime
      ? new Date(a.attackTime.startTime)
      : a.dateObj;
    const tB = b.attackTime?.startTime
      ? new Date(b.attackTime.startTime)
      : b.dateObj;
    return tA.getTime() - tB.getTime();
  });
  return getEventCategoryColor(sorted[0], categories);
}
