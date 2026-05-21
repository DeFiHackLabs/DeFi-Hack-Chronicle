"use client";

import type { HackEvent, Category } from '@/lib/types';
import { isSameDay, formatDate, getWeekStart, getEventCategoryColor, formatCurrency } from '@/lib/utils';

/**
 * @file WeekView — 7-day weekly calendar with 24-hour time grid.
 *
 * Layout:
 *   • Left column: 24 hourly labels (00:00–23:00)
 *   • 7 day columns: each shows its events positioned vertically by index
 *
 * Event positioning is approximate (stacked by index, not by actual time).
 * Each event shows: start time, title, and estimated loss.
 * Event color is derived from its primary category via getEventCategoryColor.
 */

interface WeekViewProps {
  currentDate: Date;
  categories: Category[];
  selectedDate: Date | null;
  getEventsForDate: (d: Date) => HackEvent[];
  weekdays: string[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: HackEvent) => void;
}

export default function WeekView({ currentDate, categories, selectedDate, getEventsForDate, weekdays, onDayClick, onEventClick }: WeekViewProps) {
  // getWeekStart returns the Sunday (or locale-aware start) of the week
  const weekStart = getWeekStart(currentDate);
  const today = new Date();

  return (
    <div className="week-view">
      {/* Day headers: weekday name + date number, with today highlighted */}
      <div className="week-header">
        <div className="week-header-cell"></div>
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const isToday = isSameDay(date, today);
          return (
            <div className="week-header-cell" key={i}>
              <div className="week-day-name">{weekdays[i]}</div>
              <div className={`week-day-number ${isToday ? 'today' : ''}`}>{date.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="week-grid">
        {/* Hour labels column */}
        <div className="week-time-column">
          {Array.from({ length: 24 }, (_, hour) => (
            <div className="time-slot" key={hour}>{String(hour).padStart(2, '0')}:00</div>
          ))}
        </div>

        {/* 7 day columns with event cards */}
        {Array.from({ length: 7 }, (_, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dayEvents = getEventsForDate(date);
          const hasEvent = dayEvents.length > 0;

          return (
            <div
              key={i}
              className={`week-day-column ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}`}
              onClick={() => onDayClick(date)}
            >
              {/* Hour grid lines — visual references only */}
              {Array.from({ length: 24 }, (_, h) => (
                <div className="hour-line" key={h}></div>
              ))}

              {/* Event cards stacked vertically: top = 60 + (index × 80)px offset */}
              {dayEvents.map((event, idx) => {
                const top = 60 + (idx * 80);
                const color = getEventCategoryColor(event, categories);
                return (
                  <div
                    key={event.id}
                    className="week-event"
                    style={{ top: `${top}px`, background: `${color}20`, borderLeft: `3px solid ${color}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    <div className="week-event-time">{event.attackTime?.startTime || ''}</div>
                    <div className="week-event-title">{event.title}</div>
                    <div className="week-event-amount">{formatCurrency(event.estimatedLoss?.totalUSD)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
