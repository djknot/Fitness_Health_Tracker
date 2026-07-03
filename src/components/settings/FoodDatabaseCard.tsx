import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button, CardTitle, Field, TextInput } from '../ui';
import { useSavedFlash } from './shared';

/** Optional USDA FoodData Central API key for the food search. */
export default function FoodDatabaseCard() {
  const usdaApiKey = useAppStore((s) => s.prefs.usdaApiKey);
  const setPrefs = useAppStore((s) => s.setPrefs);

  const [draft, setDraft] = useState(usdaApiKey ?? '');
  const [saved, flashSaved] = useSavedFlash();

  const save = () => {
    const trimmed = draft.trim();
    setPrefs({ usdaApiKey: trimmed || undefined });
    setDraft(trimmed);
    flashSaved();
  };

  const clear = () => {
    setPrefs({ usdaApiKey: undefined });
    setDraft('');
  };

  return (
    <section className="card">
      <CardTitle
        title="Food database"
        sub="Food search always includes the built-in foods and Open Food Facts."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="USDA API key (optional)">
          <TextInput
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste your key"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
      </div>
      <p className="mt-2 text-xs text-ink2">
        {usdaApiKey
          ? 'USDA search enabled.'
          : 'Add a free key to include USDA FoodData Central in search.'}{' '}
        <a
          href="https://fdc.nal.usda.gov/api-key-signup"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent-strong"
        >
          Get a free key
        </a>
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={save}>Save</Button>
        <Button variant="ghost" onClick={clear} disabled={!usdaApiKey && draft.trim() === ''}>
          Clear
        </Button>
        {saved && <span className="text-xs text-good">Saved ✓</span>}
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {
          'Privacy: food search terms are sent to Open Food Facts — and to USDA FoodData Central when a key is set. Nothing else leaves this device.'
        }
      </p>
    </section>
  );
}
