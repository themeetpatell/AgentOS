'use client';

import useSWR from 'swr';
import { ACTIVE_STATUSES, type AgentRun } from '@finanshels-neuro/shared';

interface RunsResponse {
  readonly runs: ReadonlyArray<AgentRun>;
}

async function fetcher(url: string): Promise<RunsResponse> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return res.json();
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

export default function RunsPage() {
  // Sprint 0: these endpoints 404 until /runs is implemented in Sprint 1.
  // Dashboard surface mirrors neuro-app's grouped Active + History pattern.
  const active = useSWR<RunsResponse>(
    `${API_BASE}/runs?status=active`,
    fetcher,
    { refreshInterval: 5000 },
  );
  const history = useSWR<RunsResponse>(
    `${API_BASE}/runs?status=history`,
    fetcher,
    { refreshInterval: 30000 },
  );

  return (
    <main className="min-h-screen px-6 py-8 max-w-5xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Runs</h1>
        <p className="text-sm text-muted">
          Active and recent agent runs. Submit a brief to start a new run.
        </p>
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
          <li
            key={run.id}
            className="rounded-md border border-muted/40 px-4 py-3 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{run.agentId}</p>
              <p className="text-xs text-muted">
                #{run.id.slice(0, 8)} · attempt {run.attempts}
              </p>
            </div>
            <StatusBadge status={run.status} />
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
