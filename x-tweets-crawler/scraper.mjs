/**
 * x-tweets-crawler scraper — zero API key X/Twitter data pipeline
 * Uses twstalker.com for post ID discovery, vxtwitter.com (with fallbacks) for content.
 * Includes: disk cache, circuit breaker, exponential backoff, browser fallback.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ─── Disk Cache ──────────────────────────────────────────────────────
// Simple JSON file cache so we don't re-fetch the same tweet twice.
// Key format: "username/tweetID"

class TweetCache {
  constructor(cachePath) {
    this.path = cachePath;
    this.data = this.load();
  }

  // Load existing cache or start fresh.
  load() {
    if (!existsSync(this.path)) return {};
    try {
      return JSON.parse(readFileSync(this.path, 'utf-8'));
    } catch {
      return {};
    }
  }

  // Retrieve a tweet by composite key.
  get(username, id) {
    return this.data[`${username}/${id}`] || null;
  }

  // Store a tweet by composite key.
  set(username, id, tweet) {
    this.data[`${username}/${id}`] = tweet;
  }

  // Persist cache back to disk.
  save() {
    try {
      writeFileSync(this.path, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error(`[scraper] Cache save failed: ${err.message}`);
    }
  }
}

// ─── Circuit Breaker ─────────────────────────────────────────────────
// Marks a host as "unhealthy" after repeated failures and skips it
// for a cooldown period to avoid hammering a failing API.

class CircuitBreaker {
  constructor(threshold = 3, cooldownMs = 120000) {
    this.threshold = threshold;   // failures before opening the circuit
    this.cooldownMs = cooldownMs; // how long to stay open
    this.failures = new Map();    // host -> { count, lastFailure }
    this.open = new Set();        // hosts currently open
  }

  // Reset failure count when a host succeeds.
  recordSuccess(host) {
    this.failures.delete(host);
    this.open.delete(host);
  }

  // Track a failure and open the circuit if threshold reached.
  recordFailure(host) {
    const now = Date.now();
    const record = this.failures.get(host) || { count: 0, lastFailure: 0 };
    record.count++;
    record.lastFailure = now;
    this.failures.set(host, record);

    if (record.count >= this.threshold) {
      this.open.add(host);
      console.error(
        `[scraper] Circuit breaker OPEN for ${host} (${record.count} failures, cooling for ${this.cooldownMs}ms)`,
      );
    }
  }

  // Check if a host is currently unavailable.
  // After cooldown, it transitions to half-open (one probe allowed).
  isOpen(host) {
    const record = this.failures.get(host);
    if (!record || !this.open.has(host)) return false;
    const now = Date.now();
    if (now - record.lastFailure >= this.cooldownMs) {
      this.open.delete(host);
      record.count = 0;
      console.error(`[scraper] Circuit breaker HALF-OPEN for ${host}`);
      return false;
    }
    return true;
  }
}

// Shared breaker instance used across all fetch calls.
const breaker = new CircuitBreaker();

// ─── Fetch with Timeout ──────────────────────────────────────────────

/**
 * Fetch a URL with a timeout. Throws on non-2xx.
 * @param {string} url
 * @param {number} timeoutMs - default 15000
 * @returns {Promise<string>} response body text
 */
export async function fetchWithTimeout(url, timeoutMs = 15000) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${url}`);
  }
  return resp.text();
}

// ─── Tweet ID Discovery ──────────────────────────────────────────────
// Scrapes twstalker.com to extract tweet IDs from a user's profile page.

/**
 * Discover tweet IDs from twstalker.com profile page.
 * @param {string} username - X handle (without @)
 * @param {number} timeoutMs - default 20000
 * @returns {Promise<string[]>} deduplicated tweet IDs sorted newest-first
 */
export async function discoverTweetIds(username, timeoutMs = 20000) {
  const url = `https://twstalker.com/${username}`;
  const html = await fetchWithTimeout(url, timeoutMs);

  // Match /username/status/1234567890123456789 followed by a non-digit boundary.
  // Escapes the username so regex metacharacters won't break the pattern.
  const regex = new RegExp(`/${esc(username)}/status/(\\d{19})(?=\\D|$)`, 'g');
  const ids = new Set();
  for (const match of html.matchAll(regex)) {
    ids.add(match[1]);
  }

  // Sort newest-first (snowflake ID → extract timestamp bits via BigInt shift)
  return [...ids].sort((a, b) => Number((BigInt(b) >> 22n) - (BigInt(a) >> 22n)));
}

// ─── Browser Fallback (Playwright) ─────────────────────────────────
// When every free API fails, use a headless browser to scrape x.com directly.
// This is slower and less reliable, but acts as a last resort.

/**
 * Scrape tweet content directly from x.com using Playwright.
 * This is a last-resort fallback when all free APIs fail.
 * @param {string} username
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function fetchTweetViaBrowser(username, id) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('[scraper] Playwright not installed, skipping browser fallback');
    return null;
  }

  const url = `https://x.com/${username}/status/${id}`;
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

    // Wait for tweet text to appear
    await page.waitForSelector('[data-testid="tweetText"]', { timeout: 10000 });

    const tweetText = await page.$eval(
      '[data-testid="tweetText"]',
      (el) => el.innerText,
    );

    // Try to get engagement stats
    const stats = await page.evaluate(() => {
      const getStat = (label) => {
        const el = document.querySelector(`[aria-label*="${label}"]`);
        return el ? el.getAttribute('aria-label') : null;
      };
      return {
        likes: getStat('likes') || getStat('Like'),
        retweets: getStat('reposts') || getStat('Repost'),
        replies: getStat('replies') || getStat('Reply'),
      };
    });

    return {
      id,
      text: tweetText || '',
      // We don't know exact creation time from a raw scrape; use now as approximation.
      timestamp: new Date().toISOString(),
      date_epoch: Math.floor(Date.now() / 1000),
      permalink: url,
      likes: stats.likes || '',
      retweets: stats.retweets || '',
      replies: stats.replies || '',
      views: '',
      lang: '',
      hashtags: [],
      mediaURLs: [],
      quotedTweet: null,
      isReply: false,
      replyingTo: null,
    };
  } catch (err) {
    console.error(`[scraper] Browser fallback failed for ${url}: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Tweet Content Fetching ──────────────────────────────────────────

/**
 * Fetch structured tweet content from vxtwitter API with fallback hosts.
 * Returns normalized shape. Returns null if all hosts fail.
 *
 * @param {string} username
 * @param {string} id - tweet ID
 * @param {string[]} fallbackHosts - additional hosts to try
 * @param {object} retryOptions - { maxRetries, baseDelayMs }
 * @param {TweetCache|null} cache - optional disk cache
 * @param {boolean} useBrowserFallback - enable Playwright fallback
 * @returns {Promise<object|null>}
 */
export async function fetchTweetContent(
  username,
  id,
  fallbackHosts = [],
  retryOptions = {},
  cache = null,
  useBrowserFallback = false,
) {
  // Check cache first to avoid unnecessary network requests.
  if (cache) {
    const cached = cache.get(username, id);
    if (cached) {
      console.error(`[scraper] Cache hit for ${username}/${id}`);
      return cached;
    }
  }

  const { maxRetries = 3, baseDelayMs = 3000 } = retryOptions;
  const primaryHost = 'api.vxtwitter.com';
  const allHosts = [primaryHost, ...fallbackHosts];

  // Filter out hosts with open circuit breaker.
  const availableHosts = allHosts.filter((h) => !breaker.isOpen(h));

  if (availableHosts.length === 0) {
    console.error(`[scraper] All API hosts in cooldown, skipping ${username}/${id}`);
    // Fall through to browser fallback below.
  } else {
    for (const host of availableHosts) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const url = `https://${host}/${username}/status/${id}`;
          const text = await fetchWithTimeout(url);

          let data;
          try {
            data = JSON.parse(text);
          } catch {
            // Non-JSON response — host is misbehaving, try next host.
            breaker.recordFailure(host);
            break;
          }

          if (data && data.text) {
            const tweet = normalizeTweet(data, username, id);
            if (cache) cache.set(username, id, tweet);
            breaker.recordSuccess(host);
            return tweet;
          }

          // JSON but no text — host returned metadata only, try next host.
          breaker.recordFailure(host);
          break;
        } catch (err) {
          const is429 = err.message.includes('429');
          const is5xx = /HTTP 5\d\d/.test(err.message);
          if ((is429 || is5xx) && attempt < maxRetries) {
            // Exponential backoff with jitter to space out retries.
            const jitter = Math.random() * baseDelayMs;
            const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
            console.error(
              `[scraper] ${host} ${is429 ? '429' : '5xx'} for ${id}, retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`,
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          breaker.recordFailure(host);
          break;
        }
      }
    }
  }

  // All API hosts failed — try browser fallback if enabled.
  if (useBrowserFallback) {
    console.error(`[scraper] Trying browser fallback for ${username}/${id}`);
    const tweet = await fetchTweetViaBrowser(username, id);
    if (tweet && cache) cache.set(username, id, tweet);
    return tweet;
  }

  console.error(`[scraper] All hosts failed for ${username}/${id}`);
  return null;
}

// ─── Lookback Filtering ──────────────────────────────────────────────

/**
 * Filter posts to those within the lookback window.
 * @param {object[]} posts
 * @param {number} lookbackHours
 * @returns {object[]}
 */
export function filterByLookbackHours(posts, lookbackHours) {
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  return posts.filter(
    (post) => post.timestamp && new Date(post.timestamp).getTime() >= cutoff,
  );
}

// Twitter/X snowflake epoch in milliseconds (Nov 4, 2010 01:42:54.657 UTC).
const TWITTER_EPOCH_MS = 1288834974657n;

/**
 * Check whether a tweet ID is likely within the lookback window
 * by decoding its snowflake timestamp.
 * @param {string} tweetId
 * @param {number} lookbackHours
 * @returns {boolean}
 */
export function isTweetWithinLookback(tweetId, lookbackHours) {
  const cutoffMs = BigInt(Date.now() - lookbackHours * 60 * 60 * 1000);
  const tweetMs = (BigInt(tweetId) >> 22n) + TWITTER_EPOCH_MS;
  return tweetMs >= cutoffMs;
}

// ─── Cache Factory ───────────────────────────────────────────────────

/**
 * Create a tweet cache instance.
 * @param {string} cachePath - path to cache JSON file
 * @returns {TweetCache}
 */
export function createCache(cachePath) {
  return new TweetCache(cachePath);
}

// ─── Internal Helpers ────────────────────────────────────────────────

// Convert a date string to ISO format, returning null if invalid.
function safeISOString(d) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Escape regex special characters in a string.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normalize raw API response into a consistent internal shape.
function normalizeTweet(data, username, id) {
  return {
    id: data.tweetID || id,
    text: data.text,
    timestamp: data.date ? safeISOString(data.date) : null,
    date_epoch: data.date_epoch,
    permalink: data.tweetURL || `https://x.com/${username}/status/${id}`,
    likes: data.likes,
    retweets: data.retweets,
    replies: data.replies,
    views: data.views,
    lang: data.lang,
    hashtags: data.hashtags || [],
    mediaURLs: data.mediaURLs || [],
    quotedTweet: data.qrt
      ? {
          text: data.qrt.text,
          permalink: data.qrt.tweetURL,
          user: data.qrt.user_screen_name,
        }
      : null,
    isReply: !!data.replyingTo,
    replyingTo: data.replyingTo,
  };
}
