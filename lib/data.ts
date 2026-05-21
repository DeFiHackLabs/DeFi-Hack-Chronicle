/**
 * @file Data loading layer — fetches all JSON assets at runtime
 *
 * Each function wraps fetch() with typed returns and error handling.
 * `loadHackEvents` is the heavy lifter: it calls the index, then loads
 * every hack .json file in parallel, attaching `dateObj` (parsed Date)
 * and `file` (path) as runtime fields.
 *
 * All paths use `NEXT_PUBLIC_BASE_PATH` for subpath deployment compatibility.
 */

import type { SchemaData, HackIndex, HackEvent, PricesData, I18nData, PinsData } from './types';
import { parseLocalDateString } from './utils';

/** Base path for static assets — set via env for GitHub Pages / subpath deploys */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** Load filter metadata: categories, blockchains, languages, etc. */
export async function loadSchema(): Promise<SchemaData> {
  const res = await fetch(`${BASE}/data/schema.json`);
  if (!res.ok) throw new Error(`Failed to load schema: ${res.status}`);
  return res.json();
}

/** Load the hack file index — maps metadata to individual .json filenames */
export async function loadHackIndex(): Promise<HackIndex> {
  const res = await fetch(`${BASE}/data/hacks/index.json`);
  if (!res.ok) throw new Error(`Failed to load hack index: ${res.status}`);
  return res.json();
}

/** Load all hack event JSONs in parallel from the index */
export async function loadHackEvents(index: HackIndex): Promise<HackEvent[]> {
  const promises = index.files.map(async (entry) => {
    const res = await fetch(`${BASE}/data/hacks/${entry.file}`);
    if (!res.ok) throw new Error(`Failed to load ${entry.file}: ${res.status}`);
    const data = await res.json();
    return { ...data, file: entry.file, dateObj: parseLocalDateString(data.date) } as HackEvent;
  });
  return Promise.all(promises);
}

/**
 * Load i18n translations.
 * Uses `Date.now()` cache-busting query param to prevent stale cached
 * translations after a redeploy.
 */
export async function loadI18nData(): Promise<I18nData> {
  const res = await fetch(`${BASE}/data/i18n.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to load i18n: ${res.status}`);
  return res.json();
}

/** Load historical ETH price data for the chart */
export async function loadPrices(): Promise<PricesData> {
  const res = await fetch(`${BASE}/data/prices.json`);
  if (!res.ok) throw new Error(`Failed to load prices: ${res.status}`);
  return res.json();
}

/** Load chart pin annotations (hack markers on the price chart) */
export async function loadPins(): Promise<PinsData> {
  const res = await fetch(`${BASE}/data/pins.json`);
  if (!res.ok) throw new Error(`Failed to load pins: ${res.status}`);
  return res.json();
}
