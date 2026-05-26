'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ACTIVE_STATUSES, type AgentRun } from '@finanshels-neuro/shared';
import { api } from '../../lib/api-client';

interface RunsResponse {
  readonly runs: ReadonlyArray<AgentRun>;
}

export default function RunsPage() {
  const router = useRouter();
  const active = useSWR<RunsResponse>(
    '/runs?status=active',
    (path) => api.get<RunsResponse>(path),
    { refreshInterval: 5000 },
  );
  const history = useSWR<RunsResponse>(
    '/runs?status=history',
    (path) => api.get<RunsResponse>(path),
    { refreshInterval: 30000 },
  );

  return (
    <main className="min-h-screen px-6 py-8 max-w-5xl mx-auto space-y-10">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Runs</h1>
          <p className="text-sm text-muted">
            Active and recent agent runs. Submit a brief to start a new run.
          </p>
          <nav className="flex gap-3 text-xs text-muted pt-1">
            <Link href="/brand" className="hover:text-fg">Brand</Link>
            <Link href="/guardrails" className="hover:text-fg">Guardrails</Link>
          </nav>
        </div>
        <button
          onClick={() => router.push('/briefs/new')}
          className="rounded-md bg-accent text-white px-4 py-2 font-medium hover:opacity-90"
        >
          New brief
        </button>
      </header>

      <Section
        title="Active"
        runs={active.data?.runs ?? []}
        loading={!active.data && !active.error}
        error={active.error}
        emptyHint="No active runs. Submit a brief to start one."
      />

      <Section
        title="History"
        runs={history.data?.runs ?? []}
        loading={!history.data && !history.error}
        error={history.error}
        emptyHint="History will appear here once runs complete."
      />
    </main>
  );
}

interface SectionProps {
  readonly title: string;
  readonly runs: ReadonlyArray<AgentRun>;
  readonly loading: boolean;
  readonly error: unknown;
  readonly emptyHint: string;
}

function Section({ title, runs, loading, error, emptyHint }: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error != null && (
        <p className="text-sm text-red-400">
          Failed to load: {error instanceof Error ? error.message : String(error)}
        </p>
      )}
      {!loading && !error && runs.length === 0 && (
        <p className="text-sm text-muted">{emptyHint}</p>
      )}
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <Link
              href={`/runs/${run.id}`}
              className="block rounded-md border border-muted/40 px-4 py-3 flex justify-between items-center hover:border-accent/60"
            >
              <div>
                <p className="font-medium">{run.agentId}</p>
                <p className="text-xs text-muted">
                  #{run.id.slice(0, 8)} · attempt {run.attempts}
                </p>
              </div>
              <StatusBadge status={run.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: AgentRun['status'] }) {
  const isActive = (ACTIVE_STATUSES as ReadonlyArray<string>).includes(status);
  return (
    <span
      className={`text-xs px-2 py-1 rounded ${
        isActive ? 'bg-accent/20 text-accent' : 'bg-muted/20 text-muted'
      }`}
    >
      {status}
    </span>
  );
}
