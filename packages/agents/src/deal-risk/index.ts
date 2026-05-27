import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmDataset } from '../_base/crm-prompt';

const ID: AgentId = 'deal-risk';

/**
 * Deal risk audit agent.
 * Input: brief.title         = audit scope (e.g. "This-quarter deals").
 *        brief.instructions  = focus / thresholds (e.g. "stale = 14d, missing-touch = 7d").
 *        context.crmDataset  = { openDeals: ZohoDeal[], activitiesByDealId: Record<id, ZohoActivity[]> }
 * Output: Draft with markdown report (Summary, At-Risk Deals table,
 *         Risk Patterns, Recommendations).
 */
export const dealRiskAgent = createClaudeAgent({
  id: ID,
  name: 'Deal Risk Audit',
  description:
    'Audits open deals for stalled, missing-touch, and closing-without-recent-contact risk.',

  planSystemPrompt: (brand) => `${brand}

You plan a deal-risk audit from Zoho open deals + their related activities.
Respond ONLY with JSON:
{
  "summary": "the headline risk theme",
  "outline": [
    { "heading": "summary", "notes": "count of at-risk deals + their total value" },
    { "heading": "at-risk deals", "notes": "ranked table of the worst offenders with the specific risk trigger per deal" },
    { "heading": "risk patterns", "notes": "3-5 patterns across the at-risk set (e.g. owner pattern, stage pattern)" },
    { "heading": "recommendations", "notes": "3 next actions for the sales lead, named owner + due date where possible" }
  ],
  "references": []
}
Risk triggers to apply:
- "stale": Modified_Time > N days ago (default 14)
- "no recent touch": no activity in > N days (default 7)
- "closing soon, cold": Closing_Date within 30d AND no touch in 7d
- "no owner": Owner missing
- "no amount": Amount missing or 0
Use the thresholds in brief.instructions if specified; otherwise the defaults.`,

  planUserPrompt: (brief, context) => `Scope: ${brief.title}
Thresholds / focus: ${brief.instructions}

${renderCrmDataset(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the deal-risk audit as markdown.
Rules:
- ## Summary: 2-3 sentences, lead with at-risk count and total AED value.
- ## At-Risk Deals: a markdown table with columns Deal | Owner | Stage | Amount (AED) | Days Since Touch | Risk Trigger. Top 15 only, ranked by Amount × risk weight.
- ## Risk Patterns: 3-5 ranked bullets.
- ## Recommendations: numbered list, each item names the deal + owner + the specific next action.
- Use AED format like "AED 1,250,000". Never invent numbers.
- Total length 400-700 words.

Respond ONLY with JSON:
{
  "title": "Deal risk audit: <scope>",
  "body": "Markdown report"
}`,

  executeUserPrompt: (brief, plan, context) => `Scope: ${brief.title}
Thresholds / focus: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmDataset(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the audit: brand voice, all four sections present, table has 6 columns, recommendations are specific (name deal + owner + action, not vague), no fabricated numbers, no hype.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
