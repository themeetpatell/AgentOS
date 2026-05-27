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

interface AgentGroup {
  readonly label: string;
  readonly options: ReadonlyArray<AgentOption>;
}

const AGENT_GROUPS: ReadonlyArray<AgentGroup> = [
  {
    label: 'Marketing',
    options: [
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
        id: 'email-nurture',
        name: 'Email Nurture',
        description: '3-5 step welcome/onboarding sequence with timing notes.',
      },
      {
        id: 'newsletter',
        name: 'Newsletter',
        description: 'Weekly digest: subject, intro, 3 sections, sign-off.',
      },
    ],
  },
  {
    label: 'Sales outreach (requires Zoho lead)',
    options: [
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
    ],
  },
  {
    label: 'Sales analytics (aggregates from Zoho)',
    options: [
      {
        id: 'pipeline-health',
        name: 'Pipeline Health',
        description:
          'Stage + owner breakdown of open deals with risks and recommendations.',
      },
      {
        id: 'deal-risk',
        name: 'Deal Risk Audit',
        description:
          'Stalled / missing-touch / closing-cold flags across open deals.',
      },
      {
        id: 'win-loss',
        name: 'Win/Loss Analysis',
        description:
          'Patterns across closed-won vs closed-lost (window defaults to 90 days).',
      },
      {
        id: 'rep-scorecard',
        name: 'Rep Scorecard',
        description:
          'Per-rep activities, pipeline, win rate, quota attainment.',
      },
    ],
  },
  {
    label: 'Day-to-day (paste-in, no integration needed)',
    options: [
      {
        id: 'meeting-prep',
        name: 'Meeting Prep',
        description:
          'Agenda + context -> talking points, questions, risks, success criteria.',
      },
      {
        id: 'meeting-summary',
        name: 'Meeting Summary',
        description:
          'Transcript or notes -> summary, decisions, action items, follow-up email.',
      },
    ],
  },
  {
    label: 'HR (paste-in, no integration needed)',
    options: [
      {
        id: 'interview-debrief',
        name: 'Interview Debrief',
        description:
          'Interview notes -> strengths, concerns, hire/no-hire + next-round questions.',
      },
      {
        id: 'job-description',
        name: 'Job Description',
        description:
          'Rough requirements -> polished JD + interview rubric.',
      },
      {
        id: 'onboarding-plan',
        name: 'Onboarding Plan',
        description:
          'Role + start date + context -> first-30-days plan with milestones.',
      },
    ],
  },
  {
    label: 'Internal finance (paste-in, no integration needed)',
    options: [
      {
        id: 'financial-commentary',
        name: 'Financial Commentary',
        description:
          'P&L + KPI numbers -> management-report narrative (never invents numbers).',
      },
      {
        id: 'variance-explainer',
        name: 'Variance Explainer',
        description:
          'Budget vs actual -> ranked variance drivers + questions for owners.',
      },
    ],
  },
];

const AGENT_OPTIONS: ReadonlyArray<AgentOption> = AGENT_GROUPS.flatMap(
  (g) => g.options,
);

const ANALYTICS_AGENT_IDS: ReadonlySet<AgentId> = new Set<AgentId>([
  'pipeline-health',
  'deal-risk',
  'win-loss',
  'rep-scorecard',
]);

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
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">Agent</legend>
          {AGENT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <div className="grid gap-2">
                {group.options.map((opt) => (
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
            </div>
          ))}
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
            placeholder={titlePlaceholder(agentId)}
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
            placeholder={instructionsPlaceholder(agentId)}
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

function titlePlaceholder(agentId: AgentId): string {
  switch (agentId) {
    case 'cold-outreach':
      return 'Subject hint or campaign theme';
    case 'follow-up':
      return 'Thread topic';
    case 'discovery-prep':
      return 'Call topic / agenda';
    case 'email-nurture':
      return 'Sequence theme (e.g. "Welcome to Finanshels")';
    case 'newsletter':
      return "This week's theme or hook";
    case 'pipeline-health':
      return 'Pipeline check label (e.g. "Q3 health")';
    case 'deal-risk':
      return 'Audit scope (e.g. "This-quarter deals")';
    case 'win-loss':
      return 'Window label (e.g. "Q2 win-loss")';
    case 'rep-scorecard':
      return 'Period (e.g. "April 2026")';
    case 'meeting-prep':
      return 'Meeting title (e.g. "Acme Corp discovery call")';
    case 'meeting-summary':
      return 'Meeting title (e.g. "Weekly leadership 1:1")';
    case 'interview-debrief':
      return 'Candidate + role (e.g. "Maryam — Senior Accountant")';
    case 'job-description':
      return 'Role title (e.g. "Senior Tax Manager — UAE CT")';
    case 'onboarding-plan':
      return 'Role + start date (e.g. "Bookkeeper — starts 2026-06-02")';
    case 'financial-commentary':
      return 'Period (e.g. "April 2026 management report")';
    case 'variance-explainer':
      return 'Scope (e.g. "April 2026 budget vs actual")';
    default:
      return 'UAE Corporate Tax thresholds for SMEs';
  }
}

function instructionsPlaceholder(agentId: AgentId): string {
  switch (agentId) {
    case 'cold-outreach':
      return 'Offer, hook, constraints. Anchors to mention. What we know about this lead.';
    case 'follow-up':
      return 'Paste the prior thread, then describe the outcome (e.g. "no reply 5d", "asked for time").';
    case 'discovery-prep':
      return 'Focus areas, knowns, suspected pain, anything the lead has already told us.';
    case 'email-nurture':
      return 'Audience, the journey, what each step should accomplish, timing per step.';
    case 'newsletter':
      return '3-5 source links or notes; brief summary per item.';
    case 'pipeline-health':
      return 'Focus questions (e.g. "where is coverage thinnest?", "which stages are bloated?").';
    case 'deal-risk':
      return 'Thresholds + focus (e.g. "stale = 14d, missing-touch = 7d, prioritize >AED 100k deals").';
    case 'win-loss':
      return 'Focus questions (e.g. "what kills enterprise deals?", "which source converts best?"). Set context.daysBack to change window.';
    case 'rep-scorecard':
      return 'Quota notes (e.g. "AED 250k/rep/month") and any rep-specific context.';
    case 'meeting-prep':
      return 'Agenda + attendees + objective + any context the attendees should know.';
    case 'meeting-summary':
      return 'Paste the transcript or rough notes from the meeting. Owners mentioned by name will be threaded into action items.';
    case 'interview-debrief':
      return 'Paste interview notes + the JD + any prior signals (resume highlights, referral notes).';
    case 'job-description':
      return 'Rough requirements: level, team, must-haves, what success looks like, comp range if any.';
    case 'onboarding-plan':
      return 'Manager, team, first projects, must-meet people, tools to provision.';
    case 'financial-commentary':
      return 'Paste P&L numbers + KPIs + prior-period comparisons. The agent will never invent numbers — only what you paste here is in the report.';
    case 'variance-explainer':
      return 'Paste budget vs actual numbers, line-item or summary. Include owner names per line if known.';
    default:
      return 'Beginner audience. Cover the 375k AED threshold, free-zone exemptions, filing deadlines.';
  }
}
