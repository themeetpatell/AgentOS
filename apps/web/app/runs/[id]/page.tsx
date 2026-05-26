'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  ACTIVE_STATUSES,
  type AgentRun,
  type Draft,
  type ReviewAction,
} from '@finanshels-neuro/shared';
import { api } from '../../../lib/api-client';

interface RunResponse {
  readonly run: AgentRun;
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, error, isLoading, mutate } = useSWR<RunResponse>(
    id ? `/runs/${id}` : null,
    (path) => api.get<RunResponse>(path),
    {
      refreshInterval: (latest) => {
        if (!latest?.run) return 5000;
        return (ACTIVE_STATUSES as ReadonlyArray<string>).includes(latest.run.status)
          ? 5000
          : 30000;
      },
    },
  );

  const run = data?.run;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState<Draft | null>(null);

  async function submitReview(action: ReviewAction) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await api.post<RunResponse>(
        `/runs/${id}/review`,
        action,
      );
      await mutate(updated, { revalidate: false });
      setEditing(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <Layout><p className="text-sm text-muted">Loading…</p></Layout>;
  }
  if (error || !run) {
    return (
      <Layout>
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : 'Run not found'}
        </p>
      </Layout>
    );
  }

  const canReview =
    run.status === 'AWAITING_REVIEW' || run.status === 'EDITED';

  return (
    <Layout>
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/runs')}
            className="text-xs text-muted hover:text-fg"
          >
            ← All runs
          </button>
          <h1 className="text-2xl font-semibold">{run.agentId}</h1>
          <p className="text-xs text-muted">
            #{run.id.slice(0, 8)} · attempt {run.attempts} ·{' '}
            {new Date(run.updatedAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${
            (ACTIVE_STATUSES as ReadonlyArray<string>).includes(run.status)
              ? 'bg-accent/20 text-accent'
              : 'bg-muted/20 text-muted'
          }`}
        >
          {run.status}
        </span>
      </header>

      {run.errorMessage && (
        <section className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{run.errorMessage}</p>
        </section>
      )}

      {run.plan && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Plan</h2>
          <p className="text-sm">{run.plan.summary}</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {run.plan.outline.map((item, i) => (
              <li key={i}>
                <span className="font-medium">{item.heading}</span>
                <span className="text-muted"> — {item.notes}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {run.draft && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Draft</h2>
            {canReview && !editing && (
              <button
                onClick={() => {
                  setEditedDraft(run.draft ?? null);
                  setEditing(true);
                }}
                className="text-xs text-accent hover:underline"
              >
                Edit
              </button>
            )}
          </div>
          {editing && editedDraft ? (
            <DraftEditor
              draft={editedDraft}
              onChange={setEditedDraft}
              onCancel={() => setEditing(false)}
              onSave={(d) => submitReview({ action: 'edit', draft: d })}
              busy={busy}
            />
          ) : (
            <article className="rounded-md border border-muted/40 px-4 py-3 space-y-2 text-sm">
              <h3 className="font-semibold">{run.draft.title}</h3>
              {run.draft.metaDescription && (
                <p className="text-xs text-muted italic">
                  {run.draft.metaDescription}
                </p>
              )}
              <pre className="whitespace-pre-wrap font-sans">{run.draft.body}</pre>
            </article>
          )}
        </section>
      )}

      {run.validation && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Validation</h2>
          <p className="text-sm">
            Brand voice:{' '}
            <span
              className={
                run.validation.brandVoiceOk ? 'text-green-400' : 'text-red-300'
              }
            >
              {run.validation.brandVoiceOk ? 'OK' : 'Issues'}
            </span>
          </p>
          <ul className="space-y-1 text-sm">
            {run.validation.issues.map((issue, i) => (
              <li key={i}>
                <span className="uppercase text-xs text-muted">
                  [{issue.severity}]
                </span>{' '}
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.tokenUsage && (
        <p className="text-xs text-muted">
          Tokens: {run.tokenUsage.inputTokens.toLocaleString()} in /{' '}
          {run.tokenUsage.outputTokens.toLocaleString()} out · est cost $
          {run.tokenUsage.costUsd.toFixed(4)}
        </p>
      )}

      {canReview && !editing && (
        <section className="flex gap-3 pt-4 border-t border-muted/30">
          <button
            onClick={() => submitReview({ action: 'approve' })}
            disabled={busy}
            className="rounded-md bg-accent text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => {
              const reason = window.prompt('Reason for rejecting?');
              if (reason && reason.trim()) {
                submitReview({ action: 'reject', reason: reason.trim() });
              }
            }}
            disabled={busy}
            className="rounded-md border border-red-500/40 text-red-300 px-4 py-2 hover:bg-red-500/10 disabled:opacity-50"
          >
            Reject
          </button>
        </section>
      )}

      {actionError && (
        <p role="alert" className="text-sm text-red-400">
          {actionError}
        </p>
      )}
    </Layout>
  );
}

interface DraftEditorProps {
  readonly draft: Draft;
  readonly onChange: (d: Draft) => void;
  readonly onCancel: () => void;
  readonly onSave: (d: Draft) => void;
  readonly busy: boolean;
}

function DraftEditor({ draft, onChange, onCancel, onSave, busy }: DraftEditorProps) {
  return (
    <div className="space-y-2 rounded-md border border-accent/40 px-4 py-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium">Title</span>
        <input
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium">Body</span>
        <textarea
          value={draft.body}
          onChange={(e) => onChange({ ...draft, body: e.target.value })}
          rows={16}
          className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 font-mono text-xs"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(draft)}
          disabled={busy}
          className="rounded-md bg-accent text-white px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Save edit
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-md border border-muted/40 px-3 py-1.5 text-sm hover:bg-muted/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-8 max-w-3xl mx-auto space-y-8">
      {children}
    </main>
  );
}
