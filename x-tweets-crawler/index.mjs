#!/usr/bin/env node
/**
 * x-tweets-crawler entry point
 * Serially discovers tweet IDs per account, fetches content with rate-limit
 * delays, filters by lookback window, and outputs JSON to stdout.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  discoverTweetIds,
  fetchTweetContent,
  filterByLookbackHours,
  isTweetWithinLookback,
  createCache,
  assembleThreads,
} from './scraper.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(resolve(__dirname, 'config.json'), 'utf-8'));

// Initialize disk cache (optional — skip if no cacheFile in config).
const cache = config.cacheFile
  ? createCache(resolve(__dirname, config.cacheFile))
  : null;

// Track how many browser fallbacks we've used this run.
let browserFallbackCount = 0;

// ─── Config Validation ──────────────────────────────────────────────

if (!Array.isArray(config.accounts)) {
  console.error('[index] Error: config.accounts must be an array');
  process.exit(1);
}
if (!Number.isInteger(config.concurrency) || config.concurrency <= 0) {
  console.error('[index] Error: config.concurrency must be a positive integer');
  process.exit(1);
}

const MAX_IDS_PER_ACCOUNT = config.maxFetchPerAccount || 15;

// ─── Main Pipeline ─────────────────────────────────────────────────

async function main() {
  const allPosts = [];
  let processedAccounts = 0;

  // Per-account loop — serial discovery so we don't hammer external services.
  for (const handle of config.accounts) {
    console.error(`[index] Processing @${handle}...`);

    // Step 1: discover tweet IDs from the account's profile page.
    let ids;
    try {
      ids = await discoverTweetIds(handle, config.discoveryHosts);
    } catch (err) {
      console.error(`[index] Error discovering tweets for @${handle}:`, err.message);
      continue;
    }

    if (!ids || ids.length === 0) {
      console.error(`[index] Warning: no tweets found for @${handle}`);
      continue;
    }

    // Step 2: take most recent N IDs, then pre-filter by snowflake timestamp
    // to skip fetching tweets that are definitely older than the lookback window.
    const recentIds = ids
      .slice(0, MAX_IDS_PER_ACCOUNT)
      .filter((id) => isTweetWithinLookback(id, config.lookbackHours));

    if (recentIds.length === 0) {
      console.error(`[index] No recent tweets within lookback for @${handle}`);
      processedAccounts++;
      continue;
    }

    // Step 3: serial fetch with rate-limit delay (concurrency=1 avoids 429s).
    const perAccountPosts = [];
    const useBrowser = config.useBrowserFallback && browserFallbackCount < (config.browserMaxPerRun || 3);
    for (const id of recentIds) {
      const post = await fetchTweetContent(
        handle,
        id,
        config.fallbackHosts,
        { maxRetries: config.maxRetries || 3, baseDelayMs: config.baseDelayMs || 3000 },
        cache,
        useBrowser,
      ).catch((err) => {
        // Log but don't crash — one bad ID shouldn't kill the whole run.
        console.error(`[index] Fetch error for @${handle}/${id}: ${err.message}`);
        return null;
      });
      if (post) perAccountPosts.push(post);

      // Rate-limit delay between successive requests.
      await new Promise((r) => setTimeout(r, config.rateLimitDelayMs));
    }

    // Step 4: filter by actual lookback window (some tweets might be close to the edge).
    const filtered = filterByLookbackHours(perAccountPosts, config.lookbackHours);

    // Step 5: augment with monitoredHandle and aggregate into the global list.
    for (const post of filtered) {
      allPosts.push({ ...post, monitoredHandle: handle });
    }

    processedAccounts++;

    // Inter-account delay to avoid hitting rate limits across accounts.
    const isLastAccount = config.accounts.indexOf(handle) === config.accounts.length - 1;
    if (!isLastAccount && config.interAccountDelayMs > 0) {
      await new Promise((r) => setTimeout(r, config.interAccountDelayMs));
    }
  }

  // Step 5b: assemble reply threads so key info in follow-up replies
  // is linked to the parent tweet before classification downstream.
  assembleThreads(allPosts);

  // Step 6: sort all posts by timestamp descending (newest first).
  allPosts.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
  });

  // Step 7: persist cache so the next run doesn't re-fetch the same tweets.
  if (cache) {
    cache.save();
    console.error(`[index] Cache saved to ${config.cacheFile}`);
  }

  // Step 8: output — JSON array to stdout, human summary to stderr.
  console.log(JSON.stringify(allPosts, null, 2));
  console.error(
    `[index] Done. ${allPosts.length} posts from ${processedAccounts} accounts within last ${config.lookbackHours}h.`,
  );
}

main().catch((err) => {
  console.error('[index] Fatal error:', err);
  process.exit(1);
});
