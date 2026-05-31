"use client";

import { useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import JSZip from 'jszip';
import { useData } from '@/hooks/useData';
import { useI18n } from '@/hooks/useI18n';
import { formatDate, parseLocalDateString } from '@/lib/utils';
import type { HackEvent } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import YearView from '@/components/YearView';
import MonthView from '@/components/MonthView';
import WeekView from '@/components/WeekView';
import DetailPanel from '@/components/DetailPanel';
import LoadingScreen from '@/components/LoadingScreen';
import { IconChevronLeft, IconChevronRight, IconSearch, IconChart } from '@/components/Icons';

export default function HomePage() {
  const data = useData();
  const { t, currentLang, setCurrentLang, ready: i18nReady, months, weekdays } = useI18n();

  const ready = data.ready && i18nReady;

  // Deep-link: support /?event=<id> to auto-navigate to a specific hack event
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (!eventId) return;
    const target = data.events.find((e) => e.id === eventId);
    if (!target) return;
    data.setViewMode('year');
    data.setCurrentDate(target.dateObj);
    data.setSelectedDate(target.dateObj);
    data.setSelectedEvent(target);
    data.setPanelViewMode('detail');
    data.setPanelListEvents([]);
    data.setPanelListDate(null);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Header label: "2024 March" (month), "03/10 - 03/16" (week), or "2024" (year)
  const periodLabel = useMemo(() => {
    if (data.viewMode === 'month') {
      return `${data.currentDate.getFullYear()} ${months()[data.currentDate.getMonth()]}`;
    } else if (data.viewMode === 'week') {
      // Compute Sunday–Saturday range anchored at currentDate
      const ws = new Date(data.currentDate);
      const day = ws.getDay();
      ws.setDate(ws.getDate() - day);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return `${formatDate(ws, 'MM/dd')} - ${formatDate(we, 'MM/dd')}`;
    }
    return `${data.currentDate.getFullYear()}`;
  }, [data.currentDate, data.viewMode, months]);

  const handleDayClick = useCallback((date: Date) => {
    data.setSelectedDate(date);
    const events = data.getEventsForDate(date);
    if (events.length === 1) {
      data.setSelectedEvent(events[0]);
      data.setPanelViewMode('detail');
      data.setPanelListEvents([]);
      data.setPanelListDate(null);
    } else if (events.length > 1) {
      data.setPanelListEvents(events);
      data.setPanelListDate(date);
      data.setPanelViewMode('list');
      data.setSelectedEvent(null);
    } else {
      data.setSelectedEvent(null);
      data.setPanelViewMode('empty');
      data.setPanelListEvents([]);
      data.setPanelListDate(null);
    }
  }, [data]);

  const handleEventClick = useCallback((event: HackEvent) => {
    data.setSelectedDate(event.dateObj);
    data.setSelectedEvent(event);
    data.setPanelViewMode('detail');
  }, [data]);

  const handleDateRangeChange = useCallback((startStr: string, endStr: string) => {
    data.setTimeFilter('custom');
    data.setDateRange({
      start: startStr ? parseLocalDateString(startStr) : null,
      end: endStr ? parseLocalDateString(endStr) : null,
    });
  }, [data]);

  const handleTimeFilterChange = useCallback((f: 'all' | '90' | '180' | '365' | 'custom') => {
    data.applyTimeFilter(f as 'all' | '90' | '180' | '365');
  }, [data]);

  const handleBackToList = useCallback(() => {
    if (data.panelListEvents.length > 0 && data.panelListDate) {
      data.setPanelViewMode('list');
      data.setSelectedEvent(null);
    }
  }, [data]);

  const handleEventSelect = useCallback((event: HackEvent) => {
    data.setSelectedEvent(event);
    data.setPanelViewMode('detail');
  }, [data]);

  const handleExport = useCallback(async () => {
    const exportEvents = data.getExportEvents();
    if (exportEvents.length === 0) {
      alert('No events match the current filters.');
      return;
    }
    const zip = new JSZip();
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    await Promise.all(
      exportEvents.map(async (event) => {
        if (!event.file) return;
        const res = await fetch(`${base}/data/hacks/${event.file}`);
        if (!res.ok) return;
        const blob = await res.blob();
        zip.file(event.file, blob);
      })
    );
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'defi-hack-events.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  if (!ready) {
    return <LoadingScreen />;
  }

  const viewKey = `${data.viewMode}-${data.currentDate.getFullYear()}-${data.currentDate.getMonth()}-${data.currentDate.getDate()}`;

  return (
    <div className="app-container">
      <Sidebar
        totalLoss={data.totalLoss}
        categories={data.categories}
        blockchains={data.blockchains}
        languages={data.languages}
        ecosystems={data.ecosystems}
        activeCategories={data.activeCategories}
        activeBlockchains={data.activeBlockchains}
        activeLanguages={data.activeLanguages}
        activeEcosystems={data.activeEcosystems}
        viewMode={data.viewMode}
        timeFilter={data.timeFilter}
        dateRangeStart={data.dateRange.start ? formatDate(data.dateRange.start, 'yyyy-MM-dd') : ''}
        dateRangeEnd={data.dateRange.end ? formatDate(data.dateRange.end, 'yyyy-MM-dd') : ''}
        t={t}
        onViewChange={data.setViewMode}
        onToggleCategory={data.toggleCategory}
        onToggleBlockchain={data.toggleBlockchain}
        onToggleLanguage={data.toggleLanguage}
        onToggleEcosystem={data.toggleEcosystem}
        onSelectAllCategories={data.selectAllCategories}
        onDeselectAllCategories={data.deselectAllCategories}
        onSelectAllBlockchains={data.selectAllBlockchains}
        onDeselectAllBlockchains={data.deselectAllBlockchains}
        onSelectAllLanguages={data.selectAllLanguages}
        onDeselectAllLanguages={data.deselectAllLanguages}
        onSelectAllEcosystems={data.selectAllEcosystems}
        onDeselectAllEcosystems={data.deselectAllEcosystems}
        onTimeFilterChange={handleTimeFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onExport={handleExport}
      />

      <main className="main-content">
        <div className="watermark-container" style={{ opacity: data.viewMode === 'year' ? 0.12 : 0 }}>
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/defihacklabs-watermark.png`} alt="DeFiHackLabs" className="watermark" />
        </div>

        <header className="calendar-header">
          <div className="nav-controls">
            <button className={`nav-btn ${!data.canNavigatePrev() ? 'disabled' : ''}`} onClick={data.navigatePrev} disabled={!data.canNavigatePrev()}>
              <IconChevronLeft />
            </button>
            <h1 className="current-period">{periodLabel}</h1>
            <button className={`nav-btn ${!data.canNavigateNext() ? 'disabled' : ''}`} onClick={data.navigateNext} disabled={!data.canNavigateNext()}>
              <IconChevronRight />
            </button>
            <button className="today-btn" onClick={data.goToday}>{t('nav.today')}</button>
          </div>
          <div className="header-actions">
            <Link href="/chart" className="chart-link">
              <IconChart size={16} />
              Price Impact
            </Link>
            <div className="search-box">
              <IconSearch size={16} />
              <input
                type="text"
                placeholder={t('app.searchPlaceholder')}
                value={data.searchQuery}
                onChange={(e) => data.setSearchQuery(e.target.value)}
              />
            </div>
            <div className="language-dropdown-switch header-toggle">
              <select className="lang-select" value={currentLang} onChange={(e) => setCurrentLang(e.target.value)}>
                <option value="en">🇺🇸 English</option>
                <option value="zh-TW">🇹🇼 繁體中文</option>
                <option value="ja">🇯🇵 日文</option>
              </select>
            </div>
          </div>
        </header>

        <div className="calendar-container">
          <AnimatePresence mode="wait">
            {data.viewMode === 'year' && (
              <motion.div
                key={`year-${data.currentDate.getFullYear()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <YearView
                  year={data.currentDate.getFullYear()}
                  events={data.events}
                  categories={data.categories}
                  selectedDate={data.selectedDate}
                  getEventsForDate={data.getEventsForDate}
                  months={months()}
                  weekdays={weekdays()}
                  onDayClick={handleDayClick}
                />
              </motion.div>
            )}
            {data.viewMode === 'month' && (
              <motion.div
                key={`month-${data.currentDate.getFullYear()}-${data.currentDate.getMonth()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <MonthView
                  currentDate={data.currentDate}
                  events={data.events}
                  categories={data.categories}
                  selectedDate={data.selectedDate}
                  getEventsForDate={data.getEventsForDate}
                  months={months()}
                  weekdays={weekdays()}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              </motion.div>
            )}
            {data.viewMode === 'week' && (
              <motion.div
                key={`week-${data.currentDate.getFullYear()}-${data.currentDate.getMonth()}-${data.currentDate.getDate()}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <WeekView
                  currentDate={data.currentDate}
                  categories={data.categories}
                  selectedDate={data.selectedDate}
                  getEventsForDate={data.getEventsForDate}
                  weekdays={weekdays()}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <DetailPanel
        selectedEvent={data.selectedEvent}
        panelViewMode={data.panelViewMode}
        panelListEvents={data.panelListEvents}
        panelListDate={data.panelListDate}
        categories={data.categories}
        blockchains={data.blockchains}
        accountTypes={data.accountTypes}
        attackerRoles={data.attackerRoles}
        victimRoles={data.victimRoles}
        transactionRoles={data.transactionRoles}
        currentLang={currentLang}
        t={t}
        onEventSelect={handleEventSelect}
        onBackToList={handleBackToList}
      />
    </div>
  );
}
