'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { BrandContext } from '@finanshels-neuro/shared';
import { api } from '../../lib/api-client';

interface BrandContextResponse {
  readonly brandContext: BrandContext;
}

export default function BrandPage() {
  const { data, error, isLoading, mutate } = useSWR<BrandContextResponse>(
    '/brand-context',
    (path) => api.get<BrandContextResponse>(path),
  );

  const [draft, setDraft] = useState<BrandContext | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (data?.brandContext && !draft) {
      setDraft(data.brandContext);
    }
  }, [data, draft]);

  if (isLoading || !draft) {
    return (
      <Layout>
        <p className="text-sm text-muted">
          {error ? `Error: ${error instanceof Error ? error.message : 'load failed'}` : 'Loading…'}
        </p>
      </Layout>
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<BrandContextResponse>('/brand-context', draft);
      await mutate(updated, { revalidate: false });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Brand Context</h1>
          <p className="text-sm text-muted">
            Version {draft.version}. Runs pin the version they used.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-xs text-muted">Saved {savedAt}</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-accent text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <Field
        label="Version"
        value={draft.version}
        onChange={(v) => setDraft({ ...draft, version: v })}
      />
      <TextField
        label="Voice"
        value={draft.voice}
        rows={4}
        onChange={(v) => setDraft({ ...draft, voice: v })}
      />
      <TextField
        label="ICP"
        value={draft.icp}
        rows={4}
        onChange={(v) => setDraft({ ...draft, icp: v })}
      />

      <ListEditor
        label="Glossary"
        items={draft.glossary}
        onChange={(next) => setDraft({ ...draft, glossary: next })}
        empty={{ term: '', definition: '' }}
        renderItem={(item, update) => (
          <div className="flex gap-2 w-full">
            <input
              value={item.term}
              onChange={(e) => update({ ...item, term: e.target.value })}
              placeholder="Term"
              className="w-24 rounded-md bg-muted/10 border border-muted/40 px-2 py-1 text-sm font-mono"
            />
            <input
              value={item.definition}
              onChange={(e) => update({ ...item, definition: e.target.value })}
              placeholder="Definition"
              className="flex-1 rounded-md bg-muted/10 border border-muted/40 px-2 py-1 text-sm"
            />
          </div>
        )}
      />

      <div className="grid sm:grid-cols-2 gap-6">
        <StringListEditor
          label="Do"
          items={draft.dos}
          onChange={(next) => setDraft({ ...draft, dos: next })}
        />
        <StringListEditor
          label="Don't"
          items={draft.donts}
          onChange={(next) => setDraft({ ...draft, donts: next })}
        />
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-red-400">
          {saveError}
        </p>
      )}
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-8 max-w-3xl mx-auto space-y-6">
      {children}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 text-sm"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 text-sm"
      />
    </label>
  );
}

function ListEditor<T>({
  label,
  items,
  empty,
  onChange,
  renderItem,
}: {
  label: string;
  items: ReadonlyArray<T>;
  empty: T;
  onChange: (next: ReadonlyArray<T>) => void;
  renderItem: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium">{label}</h2>
        <button
          onClick={() => onChange([...items, empty])}
          className="text-xs text-accent hover:underline"
        >
          + Add
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 items-center">
            {renderItem(item, (next) => {
              const copy = [...items];
              copy[i] = next;
              onChange(copy);
            })}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-xs text-red-300 hover:text-red-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: ReadonlyArray<string>;
  onChange: (next: ReadonlyArray<string>) => void;
}) {
  return (
    <ListEditor<string>
      label={label}
      items={items}
      empty=""
      onChange={onChange}
      renderItem={(item, update) => (
        <input
          value={item}
          onChange={(e) => update(e.target.value)}
          className="flex-1 rounded-md bg-muted/10 border border-muted/40 px-2 py-1 text-sm"
        />
      )}
    />
  );
}
