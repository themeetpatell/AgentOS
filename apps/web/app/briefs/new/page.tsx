'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentId, AgentRun, Brief } from '@finanshels-neuro/shared';
import { api } from '../../../lib/api-client';
import {
  LeadPicker,
  type ZohoSearchResult,
} from '../../../components/lead-picker';

interface AgentOption {
  readonly id: AgentId;
  readonly name: string;
  readonly description: string;
  readonly disabled?: boolean;
}

const SALES_AGENT_IDS: ReadonlySet<AgentId> = new Set<AgentId>([
  'cold-outreach',
  'follow-up',
  'discovery-prep',
]);

const AGENT_OPTIONS: ReadonlyArray<AgentOption> = [
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: '800-1500 word post with H2/H3 structure and SEO meta.',
  },
  {
    id: 'seo-brief',
    name: 'SEO Brief',
    description: 'SERP-aware brief from a target keyword.',
  },
  {
    id: 'social-variants',
    name: 'Social Variants',
    description: '3-5 LinkedIn + 3-5 X posts from approved long-form content.',
  },
  {
    id: 'ad-copy',
    name: 'Ad Copy',
    description: '3 angles, each as Meta + LinkedIn headline/primary text.',
  },
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    description:
      'First-touch email to a Zoho lead: subject + primary body + 2 variants.',
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    description:
      'Three-step cadence (nudge, value-add, breakup) for a stalled thread.',
  },
  {
    id: 'discovery-prep',
    name: 'Discovery Prep',
    description:
      'Pre-call brief: background, pain hypotheses, talking points, questions.',
  },
];

export default function NewBriefPage() {
  const router = useRouter();
  const [agentId, setAgentId] = useState<AgentId>('blog-post');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [wordCountTarget, setWordCountTarget] = useState<number>(1200);
  const [crmRecord, setCrmRecord] = useState<ZohoSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSalesAgent = SALES_AGENT_IDS.has(agentId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const context: Record<string, string> = {};
      if (isSalesAgent && crmRecord) {
        if (crmRecord.type === 'lead') context.leadId = crmRecord.id;
        if (crmRecord.type === 'deal') context.dealId = crmRecord.id;
      }

      const payload = {
        agentId,
        title,
        instructions,
        targetAudience: targetAudience || undefined,
        wordCountTarget: agentId === 'blog-post' ? wordCountTarget : undefined,
        attachmentUrls: [] as string[],
        ...(Object.keys(context).length > 0 ? { context } : {}),
      };
      const result = await api.post<{ brief: Brief; run: AgentRun }>(
        '/briefs',
        payload,
      );
      router.push(`/runs/${result.run.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-2xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">New Brief</h1>
        <p className="text-sm text-muted">
          Submit a brief and an agent will plan and draft it for review.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Agent</legend>
          <div className="grid gap-2">
            {AGENT_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex gap-3 rounded-md border px-3 py-2 cursor-pointer ${
                  agentId === opt.id
                    ? 'border-accent bg-accent/10'
                    : 'border-muted/40'
                } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="agentId"
                  value={opt.id}
                  checked={agentId === opt.id}
                  disabled={opt.disabled}
                  onChange={() => setAgentId(opt.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-xs text-muted">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {isSalesAgent && (
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Zoho lead</legend>
            <p className="text-xs text-muted">
              Pick the lead this draft is for. Required so the agent can
              personalize and the publish step can attach a Note + Task.
            </p>
            <LeadPicker
              module="leads"
              value={crmRecord}
              onSelect={setCrmRecord}
            />
          </fieldset>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2"
            placeholder={
              agentId === 'cold-outreach'
                ? 'Subject hint or campaign theme'
                : agentId === 'follow-up'
                  ? 'Thread topic'
                  : agentId === 'discovery-prep'
                    ? 'Call topic / agenda'
                    : 'UAE Corporate Tax thresholds for SMEs'
            }
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Instructions</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            required
            maxLength={8000}
            rows={6}
            className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2 font-mono text-sm"
            placeholder={
              agentId === 'cold-outreach'
                ? 'Offer, hook, constraints. Anchors to mention. What we know about this lead.'
                : agentId === 'follow-up'
                  ? 'Paste the prior thread, then describe the outcome (e.g. "no reply 5d", "asked for time").'
                  : agentId === 'discovery-prep'
                    ? 'Focus areas, knowns, suspected pain, anything the lead has already told us.'
                    : 'Beginner audience. Cover the 375k AED threshold, free-zone exemptions, filing deadlines.'
            }
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Target audience (optional)</span>
          <input
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            maxLength={500}
            className="w-full rounded-md bg-muted/10 border border-muted/40 px-3 py-2"
            placeholder="Founders of UAE SMEs"
          />
        </label>

        {agentId === 'blog-post' && (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Word count target</span>
            <input
              type="number"
              value={wordCountTarget}
              min={300}
              max={5000}
              step={100}
              onChange={(e) => setWordCountTarget(Number(e.target.value))}
              className="w-32 rounded-md bg-muted/10 border border-muted/40 px-3 py-2"
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || (isSalesAgent && !crmRecord)}
            className="rounded-md bg-accent text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
            title={
              isSalesAgent && !crmRecord
                ? 'Pick a Zoho lead first'
                : undefined
            }
          >
            {submitting ? 'Submitting…' : 'Submit brief'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/runs')}
            className="rounded-md border border-muted/40 px-4 py-2 hover:bg-muted/10"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
