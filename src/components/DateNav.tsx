import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { addDays, todayISO } from '../lib/dates';
import { Button, TextInput } from './ui';

/**
 * Global day navigator: previous/next day, a date picker, and a Today reset.
 * Reads and writes the store's `selectedDate`, so every day-scoped page moves in
 * lockstep — changing the date here re-scopes the whole app to that day. Future
 * dates are disallowed (the app never logs ahead of today).
 */
export function DateNav({ className = '' }: { className?: string }) {
  const date = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setSelectedDate);
  const today = todayISO();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button variant="ghost" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
        <ChevronLeft size={18} />
      </Button>
      <TextInput
        type="date"
        value={date}
        max={today}
        aria-label="Selected date"
        onChange={(e) => {
          const v = e.target.value;
          if (v && v <= today) setDate(v);
        }}
        className="w-40"
      />
      <Button
        variant="ghost"
        aria-label="Next day"
        disabled={date >= today}
        onClick={() => setDate(addDays(date, 1))}
      >
        <ChevronRight size={18} />
      </Button>
      {date !== today && (
        <Button variant="ghost" onClick={() => setDate(today)}>
          Today
        </Button>
      )}
    </div>
  );
}
