/**
 * @file Core type definitions for the DeFi Hack Chronicle
 *
 * Data model: a `HackEvent` is the central record — one per security incident.
 * Filter metadata (categories, blockchains, etc.) is loaded from `SchemaData`.
 * Internationalized strings live in `I18nData`, chart data in `PricesData` / `PinsData`.
 */

// ─── Filter Option Base ──────────────────────────────────────────────

/** Shared shape for all filterable metadata types (category, blockchain, etc.) */
export interface FilterOption {
  id: string;
  name: string;
  color: string;
  description: string;
}

// Each filter dimension extends FilterOption — may add dimension-specific fields later
export interface Category extends FilterOption {}
export interface Blockchain extends FilterOption {}
export interface Language extends FilterOption {}
export interface Ecosystem extends FilterOption {}
export interface AccountType extends FilterOption {}

// ─── Account Base ────────────────────────────────────────────────────

/** Shared fields for attackers and victims */
export interface Account {
  address: string;
  chain: string;
  role: string;
  description?: string;
  accountType?: string;
}

/** Account that carried out the attack */
export interface Attacker extends Account {}

/** Account that suffered losses */
export interface Victim extends Account {}

// ─── Attack Details ──────────────────────────────────────────────────

export interface EstimatedLoss {
  totalUSD: string;
  breakdown?: Array<{
    asset: string;
    amount: string;
    convertedUSD: string;
  }>;
  note?: string;
}

export interface AttackTime {
  startTime: string;
  endTime: string;
  date: string;
  isRange?: boolean;
  note?: string;
}

export interface Transaction {
  txHash: string;
  chain: string;
  role: string;
  description?: string;
}

// ─── Main Event Record ───────────────────────────────────────────────

/**
 * A single DeFi hack / security incident.
 *
 * `blockchain` and `category` are arrays in the JSON data,
 * but may arrive as a single string if the source file is malformed —
 * always normalize with `getEventCategories` / `getEventBlockchains` from utils.
 */
export interface HackEvent {
  id: string;
  title: string;
  protocol: string;
  blockchain: string[];
  category: string[];
  ecosystem: string;
  language: string;
  estimatedLoss: EstimatedLoss;
  attackTime: AttackTime;
  description: string;
  date: string;                    // ISO date string from JSON (e.g. "2024-03-15")
  rootCause?: string;
  attackVector?: string;
  lessons?: string[];
  references?: string[];
  transactions?: Transaction[];
  attackers?: Attacker[];
  victims?: Victim[];
  metadata?: {
    dateAdded?: string;
    lastUpdated?: string;
    human_verified?: boolean;
  };
  /** Locale-specific overrides: `{ zh: { title: "..." }, ko: { title: "..." } }` */
  locales?: Record<string, Record<string, unknown>>;

  // ── Runtime-only fields (added by data loader, not in JSON) ──
  /** Parsed Date object for fast comparisons — set by `loadHackEvents` */
  dateObj: Date;
  /** Relative file path inside data/hacks/ — used for cache key / link generation */
  file?: string;
}

// ─── Index & Schema ──────────────────────────────────────────────────

export interface HackIndex {
  metadata: {
    title: string;
    description: string;
    lastUpdated: string;
  };
  files: Array<{
    id: string;
    date: string;
    protocol: string;
    file: string;
  }>;
}

/** Schema metadata — loaded once on app init */
export interface SchemaData {
  _metadata: {
    categories: Category[];
    languages: Language[];
    ecosystems: Ecosystem[];
    blockchains: Blockchain[];
    accountTypes: AccountType[];
  };
}

// ─── I18n ────────────────────────────────────────────────────────────

export interface I18nData {
  [lang: string]: {
    app: Record<string, string>;
    nav: Record<string, string>;
    filters: Record<string, string>;
    panel: Record<string, string>;
    detail: Record<string, string>;
    modal: Record<string, string>;
    github: string;
    weekdays: string[];
    months: string[];
  };
}

// ─── View State ──────────────────────────────────────────────────────

export type ViewMode = 'year' | 'month' | 'week';
export type TimeFilter = 'all' | '90' | '180' | '365' | 'custom';
export type PanelViewMode = 'empty' | 'list' | 'detail';

// ─── Chart Data ──────────────────────────────────────────────────────

export interface PricePoint {
  date: string;
  price: number;
}

export interface CoinData {
  prices: PricePoint[];
}

export interface PricesData {
  coins: Record<string, CoinData>;
}

export interface ChartPin {
  date: string;
  tag: string;
  tagColor: string;
  protocol: string;
  description: string;
  estimatedLoss: string;
  link?: string;
}

export interface PinsData {
  pins: ChartPin[];
}
