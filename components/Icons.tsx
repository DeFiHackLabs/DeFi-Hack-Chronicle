/**
 * @file SVG icon components used across the application.
 *
 * All icons are pure presentational components — no client-side hooks required.
 * Each icon accepts an optional `size` prop controlling both width and height.
 * Default sizes are chosen per icon for visual consistency in their usage context.
 */

interface IconProps {
  size?: number;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Chevron pointing left (←).
 *
 * Used as a back button in:
 * - Main page year/month pagination (page.tsx)
 * - Chart page navigation (chart/page.tsx)
 */
export function IconChevronLeft({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Chevron pointing right (→).
 *
 * Used in main page year/month pagination (page.tsx).
 */
export function IconChevronRight({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Sidebar filters ─────────────────────────────────────────────────────────

/**
 * Simple calendar icon (rect + grid line).
 *
 * Used in Sidebar filter bar — default "Any date" state.
 */
export function IconCalendar({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Calendar month view icon (rect + tick marks + grid line).
 *
 * Used in Sidebar filter bar — "Month" view indicator.
 */
export function IconCalendarMonth({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Calendar week view icon (rect + tick marks, no grid line).
 *
 * Used in Sidebar filter bar — "Week" view indicator.
 * Differs from CalendarMonth: omits the horizontal grid line for visual distinction.
 */
export function IconCalendarWeek({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
    </svg>
  );
}

// ─── General purpose ─────────────────────────────────────────────────────────

/**
 * Magnifying glass search icon (circle + handle).
 *
 * Used in the main page search bar (page.tsx).
 */
export function IconSearch({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * Export / share icon (box with up-arrow).
 *
 * Used in Sidebar for data export action.
 */
export function IconExport({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/**
 * GitHub logo (filled silhouette).
 *
 * Linked in the Sidebar footer — opens the project repository.
 */
export function IconGitHub({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/**
 * Bar chart icon (three vertical bars of varying height).
 *
 * Used in the main page — likely a toggle or navigation to the chart view
 * (app/chart/page.tsx).
 */
export function IconChart({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

/**
 * Info circle icon (circled "i").
 *
 * Used in Sidebar and DetailPanel for tooltips / contextual information.
 */
export function IconInfo({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="7" />
      {/* Vertical line of the "i" — stroke extends from 7.5 to 12 */}
      <path d="M8 12V7.5" strokeLinecap="round" />
      {/* Dot — rendered as filled circle atop the vertical line */}
      <circle cx="8" cy="4.5" r="1" fill="currentColor" />
    </svg>
  );
}
