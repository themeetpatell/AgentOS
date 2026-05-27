import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmDataset } from '../_base/crm-prompt';

const ID: AgentId = 'pipeline-health';

/**
 * Pipeline health report agent.
 * Input: brief.title         = report scope label (e.g. "Q3 pipeline check").
 *        brief.instructions  = focus questions (e.g. "where is coverage thinnest?").
 *        context.crmDataset  = orchestrator pre-fetches { openDeals: ZohoDeal[] }.
 * Output: Draft with markdown report (Summary, Stage Breakdown, Owner
 *         Breakdown, Risks, Recommendations).
 */
export const pipelineHealthAgent = createClaudeAgent({
  id: ID,
  name: 'Pipeline Health',
  description:
    'Reports on the current sales pipeline: stage distribution, owner coverage, value at risk, recommended actions.',

  planSystemPrompt: (brand) => `${brand}

You plan a pipeline-health report from Zoho deal data.
Respond ONLY with JSON:
{
  "summary": "the headline finding (one sentence)",
  "outline": [
    { "heading": "summary", "notes": "headline number + delta interpretation" },
    { "heading": "stage breakdown", "notes": "count + sum(Amount) per Stage, ordered by stage" },
    { "heading": "owner breakdown", "notes": "count + sum(Amount) per Owner; flag coverage gaps" },
    { "heading": "risks", "notes": "top 5 concerns: stale, missing-stage, lopsided coverage" },
    { "heading": "recommendations", "notes": "3 concrete next actions for sales leadership" }
  ],
  "references": []
}
Never invent numbers. If a field is missing from a deal, exclude it from totals and note the exclusion.`,

  planUserPrompt: (brief, context) => `Scope: ${brief.title}
Focus: ${brief.instructions}

${renderCrmDataset(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the pipeline-health report as markdown.
Rules:
- ## Summary: 2-3 sentences, lead with the headline number.
- ## Stage Breakdown: a markdown table with columns Stage | Count | Total Value (AED).
- ## Owner Breakdown: a markdown table with columns Owner | Count | Total Value (AED).
- ## Risks: numbered list of 5 ranked concerns (most material first).
- ## Recommendations: numbered list of 3 concrete actions, each tied to a risk.
- Use AED format like "AED 1,250,000". Never invent numbers; cite "n/a" for missing fields.
- Total length 400-700 words.

Respond ONLY with JSON:
{
  "title": "Pipeline health: <scope>",
  "body": "Markdown report"
}`,

  executeUserPrompt: (brief, plan, context) => `Scope: ${brief.title}
Focus: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmDataset(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the pipeline report: brand voice, all five sections present, two tables formatted correctly, 5 risks + 3 recs, no fabricated numbers (every number must trace back to the dataset), no hype.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
