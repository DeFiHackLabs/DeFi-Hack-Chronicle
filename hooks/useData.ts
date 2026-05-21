/**
 * @file useData — Central data hook
 *
 * Owns all filter state (categories, blockchains, time range, search),
 * computes derived data (filtered events, total loss, navigation bounds),
 * and exposes everything as a flat return object consumed by page.tsx.
 *
 * Architecture: init loads schema + events via lib/data.ts, then all
 * downstream computation is synchronous (useCallback / useMemo).
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  HackEvent, Category, Blockchain, Language, Ecosystem,
  AccountType, ViewMode, TimeFilter, PanelViewMode
} from '@/lib/types';
import { loadSchema, loadHackIndex, loadHackEvents } from '@/lib/data';
import { isSameDay, getWeekStart, getEventCategories, getEventBlockchains } from '@/lib/utils';

/** Shared toggle-set helper: flip one ID in/out of a Set<string> */
function createToggle(setter: (fn: (prev: Set<string>) => Set<string>) => void) {
  return (id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
}

export function useData() {
  // ── Raw data ──────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blockchains, setBlockchains] = useState<Blockchain[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);

  // ── View state ────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HackEvent | null>(null);

  // ── Filter state ──────────────────────────────────────────────────
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeBlockchains, setActiveBlockchains] = useState<Set<string>>(new Set());
  const [activeLanguages, setActiveLanguages] = useState<Set<string>>(new Set());
  const [activeEcosystems, setActiveEcosystems] = useState<Set<string>>(new Set());

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [searchQuery, setSearchQuery] = useState('');

  // ── Panel state ───────────────────────────────────────────────────
  const [panelViewMode, setPanelViewMode] = useState<PanelViewMode>('empty');
  const [panelListEvents, setPanelListEvents] = useState<HackEvent[]>([]);
  const [panelListDate, setPanelListDate] = useState<Date | null>(null);

  // ── Derived extremes ──────────────────────────────────────────────
  const [earliestEventDate, setEarliestEventDate] = useState<Date | null>(null);
  const [latestEventDate, setLatestEventDate] = useState<Date | null>(null);

  // ── Init: load all data once ──────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [schema, index] = await Promise.all([loadSchema(), loadHackIndex()]);
        const meta = schema._metadata;
        setCategories(meta.categories);
        setLanguages(meta.languages);
        setEcosystems(meta.ecosystems);
        setBlockchains(meta.blockchains);
        setAccountTypes(meta.accountTypes);

        // Start with everything selected
        setActiveCategories(new Set(meta.categories.map((c) => c.id)));
        setActiveBlockchains(new Set(meta.blockchains.map((b) => b.id)));
        setActiveLanguages(new Set(meta.languages.map((l) => l.id)));
        setActiveEcosystems(new Set(meta.ecosystems.map((e) => e.id)));

        const loadedEvents = await loadHackEvents(index);
        setEvents(loadedEvents);

        const sorted = [...loadedEvents].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        const earliest = sorted[0]?.dateObj || new Date(2016, 0, 1);
        const latest = sorted[sorted.length - 1]?.dateObj || new Date();
        setEarliestEventDate(earliest);
        setLatestEventDate(latest);

        const today = new Date();
        if (today < earliest) {
          setCurrentDate(new Date(earliest));
        }
        setDateRange({ start: earliest, end: today });

        setReady(true);
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
    init();
  }, []);

  // ── Time computation helper ───────────────────────────────────────
  const DAY_MS = 24 * 60 * 60 * 1000;

  /** Check if an event passes the active time filter + date range */
  const matchesTime = useCallback(
    (event: HackEvent, now: Date): boolean => {
      if (timeFilter === '90') return event.dateObj >= new Date(now.getTime() - 90 * DAY_MS);
      if (timeFilter === '180') return event.dateObj >= new Date(now.getTime() - 180 * DAY_MS);
      if (timeFilter === '365') return event.dateObj >= new Date(now.getTime() - 365 * DAY_MS);
      // 'all' or 'custom': use explicit dateRange
      if (dateRange.start && dateRange.end) {
        return event.dateObj >= dateRange.start && event.dateObj <= dateRange.end;
      }
      return true;
    },
    [timeFilter, dateRange]
  );

  // ── Event filtering ───────────────────────────────────────────────

  /**
   * Core filter logic shared by getFilteredEvents and getExportEvents.
   * Checks all dimensions except searchQuery (only getFilteredEvents uses search).
   */
  const matchesFilters = useCallback(
    (event: HackEvent): boolean => {
      const eventCategories = getEventCategories(event);
      const matchesCategory = eventCategories.some((cat) => activeCategories.has(cat));

      const eventBlockchains = getEventBlockchains(event);
      const matchesBlockchain = eventBlockchains.some((bc) => activeBlockchains.has(bc));

      const matchesLanguage = activeLanguages.has(event.language);
      const matchesEcosystem = activeEcosystems.has(event.ecosystem);

      return matchesCategory && matchesBlockchain && matchesLanguage && matchesEcosystem;
    },
    [activeCategories, activeBlockchains, activeLanguages, activeEcosystems]
  );

  const getFilteredEvents = useCallback((): HackEvent[] => {
    const now = new Date();
    return events.filter((event) => {
      if (!matchesFilters(event)) return false;
      if (!matchesTime(event, now)) return false;

      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || event.title.toLowerCase().includes(q) || event.protocol.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [events, matchesFilters, matchesTime, searchQuery]);

  /** Like getFilteredEvents but skips searchQuery — used for CSV/JSON export */
  const getExportEvents = useCallback((): HackEvent[] => {
    const now = new Date();
    return events.filter((event) => matchesFilters(event) && matchesTime(event, now));
  }, [events, matchesFilters, matchesTime]);

  const getEventsForDate = useCallback(
    (date: Date): HackEvent[] => {
      const filtered = getFilteredEvents();
      return filtered
        .filter((event) => isSameDay(event.dateObj, date))
        .sort((a, b) => {
          const timeA = a.attackTime?.startTime ? new Date(a.attackTime.startTime) : a.dateObj;
          const timeB = b.attackTime?.startTime ? new Date(b.attackTime.startTime) : b.dateObj;
          return timeA.getTime() - timeB.getTime();
        });
    },
    [getFilteredEvents]
  );

  // ── View helpers ──────────────────────────────────────────────────

  const getViewDateRange = useCallback((): { start: Date; end: Date } => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) };
    } else if (viewMode === 'week') {
      const start = getWeekStart(d);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      return { start: new Date(d.getFullYear(), 0, 1), end: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999) };
    }
  }, [currentDate, viewMode]);

  const totalLoss = useMemo(() => {
    const { start, end } = getViewDateRange();
    return getFilteredEvents()
      .filter((e) => e.dateObj >= start && e.dateObj <= end)
      .reduce((sum, e) => {
        const loss = e.estimatedLoss ? parseInt(e.estimatedLoss.totalUSD) || 0 : 0;
        return sum + loss;
      }, 0);
  }, [getFilteredEvents, getViewDateRange]);

  // ── Navigation ────────────────────────────────────────────────────

  const canNavigatePrev = useCallback((): boolean => {
    if (!earliestEventDate) return false;
    const check = new Date(currentDate);
    if (viewMode === 'month') {
      check.setMonth(check.getMonth() - 1);
      if (check.getFullYear() < earliestEventDate.getFullYear()) return false;
      if (check.getFullYear() === earliestEventDate.getFullYear() && check.getMonth() < earliestEventDate.getMonth()) return false;
    } else if (viewMode === 'week') {
      check.setDate(check.getDate() - 7);
      if (getWeekStart(check) < earliestEventDate) return false;
    } else {
      check.setFullYear(check.getFullYear() - 1);
      if (check.getFullYear() < earliestEventDate.getFullYear()) return false;
    }
    return true;
  }, [currentDate, viewMode, earliestEventDate]);

  const canNavigateNext = useCallback((): boolean => {
    const today = new Date();
    const check = new Date(currentDate);
    if (viewMode === 'month') {
      check.setMonth(check.getMonth() + 1);
      if (check.getFullYear() > today.getFullYear()) return false;
      if (check.getFullYear() === today.getFullYear() && check.getMonth() > today.getMonth()) return false;
    } else if (viewMode === 'week') {
      check.setDate(check.getDate() + 7);
      if (check > today) return false;
    } else {
      check.setFullYear(check.getFullYear() + 1);
      if (check.getFullYear() > today.getFullYear()) return false;
    }
    return true;
  }, [currentDate, viewMode]);

  const navigatePrev = useCallback(() => {
    if (!canNavigatePrev()) return;
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  }, [currentDate, viewMode, canNavigatePrev]);

  const navigateNext = useCallback(() => {
    if (!canNavigateNext()) return;
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  }, [currentDate, viewMode, canNavigateNext]);

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // ── Toggle helpers (generated per dimension) ──────────────────────

  const toggleCategory = useCallback(createToggle(setActiveCategories), []);
  const toggleBlockchain = useCallback(createToggle(setActiveBlockchains), []);
  const toggleLanguage = useCallback(createToggle(setActiveLanguages), []);
  const toggleEcosystem = useCallback(createToggle(setActiveEcosystems), []);

  const selectAllCategories = useCallback(() => setActiveCategories(new Set(categories.map((c) => c.id))), [categories]);
  const deselectAllCategories = useCallback(() => setActiveCategories(new Set()), []);

  const selectAllBlockchains = useCallback(() => setActiveBlockchains(new Set(blockchains.map((b) => b.id))), [blockchains]);
  const deselectAllBlockchains = useCallback(() => setActiveBlockchains(new Set()), []);

  const selectAllLanguages = useCallback(() => setActiveLanguages(new Set(languages.map((l) => l.id))), [languages]);
  const deselectAllLanguages = useCallback(() => setActiveLanguages(new Set()), []);

  const selectAllEcosystems = useCallback(() => setActiveEcosystems(new Set(ecosystems.map((e) => e.id))), [ecosystems]);
  const deselectAllEcosystems = useCallback(() => setActiveEcosystems(new Set()), []);

  // ── Time filter ───────────────────────────────────────────────────

  const applyTimeFilter = useCallback(
    (filter: TimeFilter) => {
      setTimeFilter(filter);
      const today = new Date();
      let start: Date | null = null;
      let end: Date | null = today;

      if (filter === '90') start = new Date(today.getTime() - 90 * DAY_MS);
      else if (filter === '180') start = new Date(today.getTime() - 180 * DAY_MS);
      else if (filter === '365') start = new Date(today.getTime() - 365 * DAY_MS);
      else start = earliestEventDate || new Date(today.getFullYear(), 0, 1);

      setDateRange({ start, end });
    },
    [earliestEventDate, DAY_MS]
  );

  // ── Expose ────────────────────────────────────────────────────────
  return {
    ready,
    events,
    categories,
    blockchains,
    languages,
    ecosystems,
    accountTypes,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    selectedEvent,
    setSelectedEvent,
    activeCategories,
    activeBlockchains,
    activeLanguages,
    activeEcosystems,
    timeFilter,
    setTimeFilter,
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    panelViewMode,
    setPanelViewMode,
    panelListEvents,
    setPanelListEvents,
    panelListDate,
    setPanelListDate,
    earliestEventDate,
    latestEventDate,
    getFilteredEvents,
    getExportEvents,
    getEventsForDate,
    getViewDateRange,
    totalLoss,
    canNavigatePrev,
    canNavigateNext,
    navigatePrev,
    navigateNext,
    goToday,
    toggleCategory,
    toggleBlockchain,
    toggleLanguage,
    toggleEcosystem,
    selectAllCategories,
    deselectAllCategories,
    selectAllBlockchains,
    deselectAllBlockchains,
    selectAllLanguages,
    deselectAllLanguages,
    selectAllEcosystems,
    deselectAllEcosystems,
    applyTimeFilter,
  };
}
