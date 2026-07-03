import { useRef } from 'react';

export type Mood = 1 | 2 | 3 | 4 | 5;

export const MOODS: { value: Mood; emoji: string; desc: string }[] = [
  { value: 1, emoji: '😞', desc: 'Awful' },
  { value: 2, emoji: '😕', desc: 'Low' },
  { value: 3, emoji: '😐', desc: 'Okay' },
  { value: 4, emoji: '🙂', desc: 'Good' },
  { value: 5, emoji: '😄', desc: 'Great' },
];

/** Narrow a stored `MetricEntry.mood` number to the 1–5 scale (undefined otherwise). */
export function toMood(n: number | undefined): Mood | undefined {
  return n != null && Number.isInteger(n) && n >= 1 && n <= 5 ? (n as Mood) : undefined;
}

export function moodEmoji(n: number | undefined): string | null {
  const mood = toMood(n);
  return mood != null ? MOODS[mood - 1].emoji : null;
}

export function moodDesc(n: number | undefined): string | null {
  const mood = toMood(n);
  return mood != null ? MOODS[mood - 1].desc : null;
}

interface MoodPickerProps {
  /** 1 (worst) – 5 (best); undefined = not set. */
  value?: Mood;
  onChange: (value: Mood | undefined) => void;
  /** Visible label above the group; also the radiogroup's accessible name. */
  label?: string;
  className?: string;
}

/**
 * Five-point mood scale as a radiogroup of emoji toggle buttons.
 * Clicking the selected value clears it (mood is optional). All buttons are
 * tabbable; arrow keys also move selection like a native radio group.
 */
export function MoodPicker({ value, onChange, label = 'Mood', className = '' }: MoodPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const step = (from: Mood, delta: 1 | -1) => {
    const next = Math.min(5, Math.max(1, from + delta)) as Mood;
    refs.current[next - 1]?.focus();
    onChange(next);
  };

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      <div role="radiogroup" aria-label={label || 'Mood'} className="flex flex-wrap gap-1.5">
        {MOODS.map((m) => {
          const selected = value === m.value;
          return (
            <button
              key={m.value}
              ref={(el) => {
                refs.current[m.value - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${m.value} of 5 — ${m.desc}`}
              title={m.desc}
              onClick={() => onChange(selected ? undefined : m.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  step(m.value, 1);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  step(m.value, -1);
                }
              }}
              className={`flex min-w-10 flex-col items-center gap-0.5 rounded-xl border px-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? 'border-accent bg-accent-wash'
                  : 'border-line hover:border-edge hover:bg-accent-wash'
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {m.emoji}
              </span>
              <span
                className={`text-[10px] font-medium tabular-nums ${
                  selected ? 'text-accent' : 'text-muted'
                }`}
              >
                {m.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
