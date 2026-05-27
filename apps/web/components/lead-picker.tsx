'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api-client';

export interface ZohoSearchResult {
  readonly type: 'lead' | 'deal';
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
}

interface LeadPickerProps {
  readonly module: 'leads' | 'deals';
  readonly value: ZohoSearchResult | null;
  readonly onSelect: (record: ZohoSearchResult | null) => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

/**
 * Type-ahead picker for Zoho leads or deals.
 * Calls GET /zoho/search?q=&module=leads|deals; debounced 300ms.
 * Hidden behind FirebaseAuthGuard server-side.
 */
export function LeadPicker({ module, value, onSelect }: LeadPickerProps) {
  const [query, setQuery] = useState(value?.title ?? '');
  const [results, setResults] = useState<ZohoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    if (value) return;
    if (query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      return;
    }
    const myReq = ++reqRef.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ results: ZohoSearchResult[] }>(
          `/zoho/search?q=${encodeURIComponent(query.trim())}&module=${module}`,
        );
        if (myReq !== reqRef.current) return;
        setResults(res.results);
        setOpen(true);
      } catch (err: unknown) {
        if (myReq !== reqRef.current) return;
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, module, value]);

  if (value) {
    return (
      <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 flex justify-between items-center">
        <div>
          <p className="text-sm font-medium">{value.title}</p>
          <p className="text-xs text-muted">{value.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery('');
            setResults([]);
          }}
          className="text-xs text-muted hover:text-fg"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-1">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={`Search Zoho ${module} by name or email`}
        className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 text-sm"
      />
      {loading && <p className="text-xs text-muted">Searching…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border border-muted/40 bg-bg shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                  setQuery(r.title);
                }}
                className="w-full text-left px-3 py-2 hover:bg-accent/10"
              >
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted">{r.subtitle}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open &&
        !loading &&
        results.length === 0 &&
        query.trim().length >= MIN_QUERY_LEN &&
        !error && <p className="text-xs text-muted">No matches.</p>}
    </div>
  );
}
