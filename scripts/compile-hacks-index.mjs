/**
 * compile-hacks-index.mjs
 *
 * Scans public/data/hacks/*.json (excluding index.json), extracts id / date /
 * protocol from each file, and regenerates public/data/hacks/index.json.
 *
 * ── Usage ────────────────────────────────────────────────────────────────
 *   node scripts/compile-hacks-index.mjs
 *
 * ── Behavior ─────────────────────────────────────────────────────────────
 *   • Files with broken JSON or missing required fields are skipped (⚠).
 *   • Entries are sorted by date ascending.
 * ──────────────────────────────────────────────────────────────────────────
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HACKS_DIR = path.resolve(__dirname, '../public/data/hacks');
const INDEX_FILE = path.join(HACKS_DIR, 'index.json');

const REQUIRED_FIELDS = ['id', 'date', 'protocol'];

function main() {
  const files = fs.readdirSync(HACKS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .sort();

  const entries = [];
  const skipped = [];

  for (const file of files) {
    const filePath = path.join(HACKS_DIR, file);

    let data;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      data = JSON.parse(content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      skipped.push(`${file}: read/parse error — ${message}`);
      continue;
    }

    const missing = REQUIRED_FIELDS.filter((k) => !data[k]);
    if (missing.length > 0) {
      skipped.push(`${file}: missing field(s) — ${missing.join(', ')}`);
      continue;
    }

    entries.push({
      id: data.id,
      date: data.date,
      protocol: data.protocol,
      file,
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  const index = {
    metadata: {
      title: 'DeFi Hack History',
      description: 'Historical record of major DeFi security incidents',
      lastUpdated: new Date().toISOString().split('T')[0],
    },
    files: entries,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8');

  console.log(`✓ Generated index.json with ${entries.length} entries.`);
  if (skipped.length > 0) {
    console.log(`\n⚠ Skipped ${skipped.length} file(s):`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }
}

main();
