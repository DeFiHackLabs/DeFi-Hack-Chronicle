"use client";

import { useMemo } from 'react';
import type { Category, Blockchain, Language, Ecosystem, ViewMode, TimeFilter } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { IconCalendar, IconCalendarMonth, IconCalendarWeek, IconExport, IconGitHub, IconInfo } from './Icons';

/**
 * @file Sidebar — left navigation panel with view switcher, category filters, and export.
 *
 * Structure:
 *   • Header: logo + total loss counter
 *   • View switcher: year / month / week toggle
 *   • FilterSection × 4: event type (with color dots), ecosystem, language, blockchain
 *   • Time filter: preset ranges (All / 90d / 180d / 365d) + manual date range
 *   • Actions: export button
 *   • Footer: GitHub link + attribution
 *
 * FilterSection is extracted as a reusable sub-component since all four
 * filter categories share identical toggle + select-all/deselect-all logic.
 */

interface SidebarProps {
  totalLoss: number;
  categories: Category[];
  blockchains: Blockchain[];
  languages: Language[];
  ecosystems: Ecosystem[];
  activeCategories: Set<string>;
  activeBlockchains: Set<string>;
  activeLanguages: Set<string>;
  activeEcosystems: Set<string>;
  viewMode: ViewMode;
  timeFilter: TimeFilter;
  dateRangeStart: string;
  dateRangeEnd: string;
  t: (key: string) => string;
  onViewChange: (v: ViewMode) => void;
  onToggleCategory: (id: string) => void;
  onToggleBlockchain: (id: string) => void;
  onToggleLanguage: (id: string) => void;
  onToggleEcosystem: (id: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  onSelectAllBlockchains: () => void;
  onDeselectAllBlockchains: () => void;
  onSelectAllLanguages: () => void;
  onDeselectAllLanguages: () => void;
  onSelectAllEcosystems: () => void;
  onDeselectAllEcosystems: () => void;
  onTimeFilterChange: (f: 'all' | '90' | '180' | '365') => void;
  onDateRangeChange: (start: string, end: string) => void;
  onExport: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    totalLoss, categories, blockchains, languages, ecosystems,
    activeCategories, activeBlockchains, activeLanguages, activeEcosystems,
    viewMode, timeFilter, dateRangeStart, dateRangeEnd, t,
    onViewChange, onToggleCategory, onToggleBlockchain, onToggleLanguage, onToggleEcosystem,
    onSelectAllCategories, onDeselectAllCategories,
    onSelectAllBlockchains, onDeselectAllBlockchains,
    onSelectAllLanguages, onDeselectAllLanguages,
    onSelectAllEcosystems, onDeselectAllEcosystems,
    onTimeFilterChange, onDateRangeChange, onExport
  } = props;

  return (
    <aside className="sidebar">
      {/* ── Header: logo + total loss ── */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🔒</span>
          <span className="logo-text">DeFi Hack</span>
        </div>
        <div className="total-loss">
          <span className="loss-label">{t('app.totalLoss')}</span>
          <span className="loss-amount">{formatCurrency(totalLoss)}</span>
        </div>
      </div>

      {/* ── View switcher: year / month / week ── */}
      <nav className="view-switcher">
        <button className={`view-btn ${viewMode === 'year' ? 'active' : ''}`} onClick={() => onViewChange('year')}>
          <IconCalendar size={16} />
          <span>{t('nav.year')}</span>
        </button>
        <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => onViewChange('month')}>
          <IconCalendarMonth size={16} />
          <span>{t('nav.month')}</span>
        </button>
        <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => onViewChange('week')}>
          <IconCalendarWeek size={16} />
          <span>{t('nav.week')}</span>
        </button>
      </nav>

      {/* ── Event type filter (with color dots) ── */}
      <FilterSection
        title={t('filters.eventType')}
        tooltip={t('filters.eventTypeTooltip')}
        items={categories}
        activeSet={activeCategories}
        onToggle={onToggleCategory}
        onSelectAll={onSelectAllCategories}
        onDeselectAll={onDeselectAllCategories}
        showDot
      />

      {/* ── Ecosystem filter ── */}
      <FilterSection
        title={t('filters.ecosystem')}
        items={ecosystems}
        activeSet={activeEcosystems}
        onToggle={onToggleEcosystem}
        onSelectAll={onSelectAllEcosystems}
        onDeselectAll={onDeselectAllEcosystems}
      />

      {/* ── Language filter ── */}
      <FilterSection
        title={t('filters.language')}
        items={languages}
        activeSet={activeLanguages}
        onToggle={onToggleLanguage}
        onSelectAll={onSelectAllLanguages}
        onDeselectAll={onDeselectAllLanguages}
      />

      {/* ── Blockchain filter ── */}
      <FilterSection
        title={t('filters.blockchain')}
        items={blockchains}
        activeSet={activeBlockchains}
        onToggle={onToggleBlockchain}
        onSelectAll={onSelectAllBlockchains}
        onDeselectAll={onDeselectAllBlockchains}
      />

      {/* ── Time range filter ── */}
      <div className="filter-section time-filter">
        <h3>{t('filters.timeRange')}</h3>
        <div className="time-list">
          {(['all', '90', '180', '365'] as const).map((f) => (
            <div
              key={f}
              className={`time-item ${timeFilter === f ? 'active' : ''}`}
              onClick={() => onTimeFilterChange(f)}
            >
              <span>{t(`filters.${f === 'all' ? 'allTime' : f === '90' ? 'last90Days' : f === '180' ? 'last180Days' : 'last365Days'}`)}</span>
            </div>
          ))}
        </div>

        {/* Custom date range — start and end date inputs */}
        <div className="date-range-filter">
          <div className="date-input-group">
            <label>{t('filters.startDate')}</label>
            <input type="date" className="date-input" value={dateRangeStart}
              onChange={(e) => onDateRangeChange(e.target.value, dateRangeEnd)} />
          </div>
          <div className="date-input-group">
            <label>{t('filters.endDate')}</label>
            <input type="date" className="date-input" value={dateRangeEnd}
              onChange={(e) => onDateRangeChange(dateRangeStart, e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Export button ── */}
      <div className="sidebar-actions">
        <button className="export-btn" onClick={onExport}>
          <IconExport size={16} />
          <span>Export</span>
        </button>
      </div>

      {/* ── Footer: GitHub + attribution ── */}
      <div className="sidebar-footer">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="github-link">
          <IconGitHub size={16} />
          <span>{t('github')}</span>
        </a>
        <div className="sidebar-attribution">
          Built by whiteberets.eth
        </div>
      </div>
    </aside>
  );
}

/**
 * FilterSection — reusable toggle list with select-all/deselect-all control.
 *
 * Used 4 times in the sidebar for: event categories, ecosystems, languages, blockchains.
 * When `showDot` is true, each item renders a colored circle next to its name.
 * The select-all button uses a computed `allSelected` state to decide
 * whether to invoke onSelectAll or onDeselectAll.
 */
function FilterSection({
  title, tooltip, items, activeSet, onToggle, onSelectAll, onDeselectAll, showDot
}: {
  title: string;
  tooltip?: string;
  items: Array<{ id: string; name: string; color?: string }>;
  activeSet: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  showDot?: boolean;
}) {
  const allSelected = items.length > 0 && items.every((i) => activeSet.has(i.id));
  return (
    <div className="filter-section">
      {/* Section header: title with optional tooltip, plus toggle-all button */}
      <div className="filter-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {title}
          {tooltip && (
            <span className="loss-label-icon">
              <IconInfo />
              <span className="loss-tooltip" style={{ whiteSpace: 'pre-wrap' }}>{tooltip}</span>
            </span>
          )}
        </h3>
        <button className="select-all-btn" onClick={() => allSelected ? onDeselectAll() : onSelectAll()}>
          {allSelected ? 'deselect all' : 'select all'}
        </button>
      </div>

      {/* Filter item list — each item toggles its category on click */}
      <div className="category-list">
        {items.map((item) => {
          const isActive = activeSet.has(item.id);
          return (
            <div
              key={item.id}
              className={`category-item ${isActive ? 'active' : ''}`}
              style={isActive && item.color ? { borderLeftColor: item.color } : undefined}
              onClick={() => onToggle(item.id)}
            >
              {showDot && item.color && <span className="category-dot" style={{ background: item.color }}></span>}
              <span className="category-name">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
