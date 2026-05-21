"use client";

import type { HackEvent, Category } from '@/lib/types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, formatDate, getEventCategoryColor, getDayEventColor } from '@/lib/utils';

/**
 * @file MonthView — calendar grid showing all days in a month with event indicators.
 *
 * Grid structure (42 cells = 6 rows × 7 columns):
 *   • Leading padding: days from previous month to align day 1 to the correct weekday
 *   • Current month: 28–31 cells, each showing day number + up to 3 event labels
 *   • Trailing padding: days from next month to fill the remaining 6-row grid
 *
 * Each event-color comes from the earliest attack event on that day (getDayEventColor).
 * Events shown in the grid are clipped to 3 per day; extras render as "+N more".
 */

interface MonthViewProps {
  currentDate: Date;
  events: HackEvent[];
  categories: Category[];
  selectedDate: Date | null;
  getEventsForDate: (d: Date) => HackEvent[];
  months: string[];
  weekdays: string[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: HackEvent) => void;
}

export default function MonthView({ currentDate, events, categories, selectedDate, getEventsForDate, months, weekdays, onDayClick, onEventClick }: MonthViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  // How many previous month days to show before day 1
  const prevMonthDays = getDaysInMonth(year, month - 1);
  // Padding cells after the last day to fill the 42-cell grid (6 rows × 7 cols)
  const remainingCells = 42 - (firstDay + daysInMonth);

  return (
    <div className="month-view">
      {/* Weekday header row: Sun, Mon, ..., Sat */}
      <div className="month-header">
        {weekdays.map((d) => (
          <div className="month-header-cell" key={d}>{d}</div>
        ))}
      </div>

      <div className="month-grid">
        {/* Leading padding — days from the previous month (greyed out) */}
        {Array.from({ length: firstDay }, (_, i) => {
          const day = prevMonthDays - firstDay + i + 1;
          return <div className="month-day other-month" key={`prev-${i}`}><span className="day-number">{day}</span></div>;
        })}

        {/* Current month days — each shows up to 3 events */}
        {Array.from({ length: daysInMonth }, (_, day) => {
          const date = new Date(year, month, day + 1);
          const dayEvents = getEventsForDate(date);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const hasEvent = dayEvents.length > 0;
          // Day background tint: color of the earliest attack event on this day
          const eventColor = hasEvent ? getDayEventColor(dayEvents, categories) : null;

          return (
            <div
              key={day}
              className={`month-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}`}
              style={hasEvent && eventColor ? { ['--event-color' as string]: eventColor } : undefined}
              onClick={() => onDayClick(date)}
            >
              <span className="day-number">{day + 1}</span>

              {/* Event labels — capped at 3, overflow shown as "+N more" */}
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="day-event"
                    style={{
                      background: `${getEventCategoryColor(event, categories)}20`,
                      color: getEventCategoryColor(event, categories),
                      borderLeft: `2px solid ${getEventCategoryColor(event, categories)}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="day-event more">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}

        {/* Trailing padding — first few days of next month (greyed out) */}
        {Array.from({ length: remainingCells }, (_, i) => (
          <div className="month-day other-month" key={`next-${i}`}><span className="day-number">{i + 1}</span></div>
        ))}
      </div>
    </div>
  );
}
