#!/usr/bin/env node

/**
 * Fetch yesterday's closing price for each supported coin
 * and append to public/data/prices.json.
 *
 * Usage: node scripts/fetch-last-day-close-prices.mjs
 *
 * Supports: ETH, BTC, SOL
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'public', 'data', 'prices.json');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COINS = [
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
];

/**
 * Get yesterday's date in DD-MM-YYYY format for CoinGecko API.
 */
function getYesterdayDate() {
  const now = new Date();
  // CoinGecko /history endpoint uses the date in UTC
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const dd = String(yesterday.getUTCDate()).padStart(2, '0');
  const mm = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = yesterday.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Fetch the closing price for a specific date.
 * @param {string} coinId - CoinGecko coin ID
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {Promise<{date: string, price: number} | null>}
 */
async function fetchClosePrice(coinId, dateStr) {
  const url = `${COINGECKO_API}/coins/${coinId}/history?date=${dateStr}&localization=false`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const price = data.market_data?.current_price?.usd;
    if (price == null) {
      console.warn(`  No price data for ${coinId} on ${dateStr}`);
      return null;
    }

    // dateStr is DD-MM-YYYY, convert to YYYY-MM-DD for storage
    const [dd, mm, yyyy] = dateStr.split('-');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    return {
      date: isoDate,
      price: Math.round(price * 100) / 100,
    };
  } catch (err) {
    console.error(`  Error fetching ${coinId}:`, err.message);
    return null;
  }
}

/**
 * Load existing prices.json, or return an empty structure.
 */
async function loadExisting() {
  try {
    const raw = await readFile(OUTPUT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      metadata: { last_updated: null, source: 'CoinGecko', currency: 'USD' },
      coins: {},
    };
  }
}

async function main() {
  const yesterday = getYesterdayDate();
  console.log(`📅 Fetching closing prices for ${yesterday}\n`);

  const priceData = await loadExisting();
  let added = 0;

  for (const coin of COINS) {
    console.log(`🔍 ${coin.symbol}...`);

    const entry = await fetchClosePrice(coin.id, yesterday);

    if (!entry) {
      console.log(`   Skipped (no data)`);
      continue;
    }

    // Initialize coin if not present
    if (!priceData.coins[coin.symbol]) {
      priceData.coins[coin.symbol] = {
        name: coin.name,
        symbol: coin.symbol,
        prices: [],
      };
    }

    const prices = priceData.coins[coin.symbol].prices;

    // Check if date already exists (avoid duplicates)
    const existing = prices.find((p) => p.date === entry.date);
    if (existing) {
      existing.price = entry.price;
      console.log(`   Updated ${entry.date}: $${entry.price}`);
    } else {
      prices.push(entry);
      console.log(`   Added ${entry.date}: $${entry.price}`);
      added++;
    }

    // Keep sorted
    prices.sort((a, b) => a.date.localeCompare(b.date));

    // Rate limiting
    if (COINS.indexOf(coin) < COINS.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Update metadata
  priceData.metadata.last_updated = new Date().toISOString();

  await writeFile(OUTPUT_PATH, JSON.stringify(priceData, null, 2) + '\n', 'utf-8');

  const total = Object.values(priceData.coins).reduce((sum, c) => sum + c.prices.length, 0);
  console.log(`\n✅ Done. ${added} new entries. Total: ${total} prices across ${Object.keys(priceData.coins).length} coins`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
