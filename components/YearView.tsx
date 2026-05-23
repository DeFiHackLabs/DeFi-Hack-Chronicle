"use client";

import type { HackEvent, Category } from '@/lib/types';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, formatDate, getDayEventColor, formatCurrency } from '@/lib/utils';

/**
 * @file YearView — 12-month grid, each month rendered as a mini calendar.
 *
 * Each mini-month follows the same grid logic as MonthView:
 *   • Leading padding from previous month to align day 1 to correct weekday
 *   • Current month cells (28–31 days), each tinted if it has events
 *   • Day color comes from the earliest attack event on that day (getDayEventColor)
 *
 * Clicking a day navigates to the month view for that date (onDayClick).
 */

interface YearViewProps {
  year: number;
  events: HackEvent[];
  categories: Category[];
  selectedDate: Date | null;
  getEventsForDate: (d: Date) => HackEvent[];
  months: string[];
  weekdays: string[];
  onDayClick: (date: Date) => void;
}

export default function YearView({ year, events, categories, selectedDate, getEventsForDate, months, weekdays, onDayClick }: YearViewProps) {
  const today = new Date();

  return (
    <div className="year-view">
      <div className="year-grid">
        {/* Render 12 mini-calendars, one per month */}
        {Array.from({ length: 12 }, (_, month) => {
          const daysInMonth = getDaysInMonth(year, month);
          const firstDay = getFirstDayOfMonth(year, month);

          return (
            <div className="year-month" key={month}>
              <div className="year-month-header">{months[month]}</div>

              <div className="year-month-grid">
                {/* Weekday headers (single letters) */}
                {weekdays.map((d, i) => (
                  <div className="year-day-header" key={i}>{d}</div>
                ))}

                {/* Leading padding — empty cells before day 1 */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div className="year-day other-month" key={`pad-${i}`}></div>
                ))}

                {/* Current month days — each is a single cell (no event labels, just color tint) */}
                {Array.from({ length: daysInMonth }, (_, day) => {
                  const date = new Date(year, month, day + 1);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const dayEvents = getEventsForDate(date);
                  const hasEvent = dayEvents.length > 0;
                  const color = hasEvent ? getDayEventColor(dayEvents, categories) : null;

                  const eventCount = dayEvents.length;
                  const totalLoss = dayEvents.reduce((sum, e) => {
                    return sum + (parseInt(e.estimatedLoss?.totalUSD || '0') || 0);
                  }, 0);
                  const tooltipText = totalLoss > 0
                    ? `${eventCount} event${eventCount > 1 ? 's' : ''} · ${formatCurrency(totalLoss)} loss`
                    : `${eventCount} event${eventCount > 1 ? 's' : ''}`;

                  const colIndex = (firstDay + day) % 7;
                  let tooltipAlignClass = '';
                  if (colIndex <= 1) {
                    tooltipAlignClass = 'tooltip-left';
                  } else if (colIndex >= 5) {
                    tooltipAlignClass = 'tooltip-right';
                  }

                  return (
                    <div
                      key={day}
                      className={`year-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}`}
                      style={color ? { ['--event-color' as string]: color } : undefined}
                      onClick={() => onDayClick(date)}
                    >
                      {day + 1}
                      {hasEvent && (
                        <span className={`year-tooltip ${tooltipAlignClass}`.trim()}>{tooltipText}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
