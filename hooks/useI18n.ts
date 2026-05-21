/**
 * @file useI18n — Internationalization hook
 *
 * Loads `data/i18n.json` once on mount and exposes:
 * - `t(key)`  – dot-path resolver with English fallback (e.g. `"nav.title"`)
 * - `months()` / `weekdays()` – localized month/weekday name arrays
 * - `setCurrentLang(lang)` – switches display language
 * - `ready`   – true once translations are loaded
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { I18nData } from '@/lib/types';
import { loadI18nData } from '@/lib/data';

export function useI18n() {
  const [i18n, setI18n] = useState<I18nData>({});
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadI18nData().then((data) => {
      setI18n(data);
      setReady(true);
    });
  }, []);

  /**
   * Resolve a dot-path key (e.g. "panel.back") to a translated string.
   * Falls back to English if the current language is missing the key,
   * and to the raw key itself if no translation exists at all.
   */
  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');

      // Try current language first
      let value: unknown = i18n[currentLang];
      for (const k of keys) {
        if (value === undefined || value === null) break;
        value = (value as Record<string, unknown>)[k];
      }

      // Fall back to English
      if (value === undefined || value === null) {
        value = i18n['en'];
        for (const k of keys) {
          if (value === undefined || value === null) break;
          value = (value as Record<string, unknown>)[k];
        }
      }

      return value !== undefined && value !== null ? String(value) : key;
    },
    [i18n, currentLang]
  );

  /**
   * Localized month names (12-element array).
   * useCallback — callers invoke as `months()`, not `months`.
   */
  const months = useCallback((): string[] => {
    return i18n[currentLang]?.months || ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  }, [i18n, currentLang]);

  /**
   * Localized weekday names (7-element array, Sun–Sat).
   * useCallback — callers invoke as `weekdays()`.
   */
  const weekdays = useCallback((): string[] => {
    return i18n[currentLang]?.weekdays || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  }, [i18n, currentLang]);

  return { t, currentLang, setCurrentLang, ready, months, weekdays };
}
