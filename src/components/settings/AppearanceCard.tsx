import { useAppStore } from '../../store/useAppStore';
import type { ThemePref } from '../../types';
import { CardTitle, Field, Select } from '../ui';

/** Theme preference — App stamps the choice on <html> immediately, no save needed. */
export default function AppearanceCard() {
  const theme = useAppStore((s) => s.prefs.theme);
  const setPrefs = useAppStore((s) => s.setPrefs);

  return (
    <section className="card">
      <CardTitle title="Appearance" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Theme">
          <Select
            value={theme}
            onChange={(e) => setPrefs({ theme: e.target.value as ThemePref })}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
          <p className="mt-1 text-xs text-muted">System follows your OS setting.</p>
        </Field>
      </div>
    </section>
  );
}
