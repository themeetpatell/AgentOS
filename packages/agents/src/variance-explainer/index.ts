import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'variance-explainer';

/**
 * Variance explainer agent (internal finance).
 * Input: brief.title         = scope (e.g. "April 2026 budget vs actual").
 *        brief.instructions  = paste budget + actual numbers, line-item or summary,
 *                              owner names if known.
 * Output: Draft with markdown variance report (Top Variances table,
 *         Plausible Drivers, Questions for Owners, Recommended Actions).
 */
export const varianceExplainerAgent = createClaudeAgent({
  id: ID,
  name: 'Variance Explainer',
  description:
    'Ranks budget-vs-actual variances, suggests plausible drivers, drafts questions to ask line-owners.',

  planSystemPrompt: (brand) => `${brand}

You plan a budget-vs-actual variance review.
Respond ONLY with JSON:
{
  "summary": "the headline variance theme (e.g. 'opex over by AED 240k, revenue on plan')",
  "outline": [
    { "heading": "top variances", "notes": "ranked table: line item | budget | actual | variance | % | favorable/unfavorable" },
    { "heading": "plausible drivers", "notes": "for each top variance, the most likely cause based on input only" },
    { "heading": "questions for owners", "notes": "specific questions to ask each line-owner (named where possible)" },
    { "heading": "recommended actions", "notes": "3-5 concrete actions for finance leadership" }
  ],
  "references": []
}
Hard rule: every number cited must appear in the pasted input. Never invent. Mark unknowns as "n/a".`,

  planUserPrompt: (brief) => `Scope: ${brief.title}
Budget + actual + context:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the variance report as markdown.
Rules:
- ## Top Variances: markdown table with columns Line Item | Budget | Actual | Variance | % | Direction. Rank top 10 by absolute variance.
- ## Plausible Drivers: for each top variance, "<line item>: <1-2 sentence driver hypothesis>. Confidence: low|med|high."
- ## Questions for Owners: numbered, each "Owner: <name | unassigned> — Question: ...".
- ## Recommended Actions: numbered, 3-5 items, each names the line item + action + owner.
- AED format "AED 1,250,000". % format "+12%" or "-7%". Direction is "favorable" or "unfavorable".
- Never invent. If owner unknown, write "unassigned".
- 400-700 words total.

Respond ONLY with JSON:
{
  "title": "Variance: <scope>",
  "body": "Markdown report"
}`,

  executeUserPrompt: (brief, plan) => `Scope: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Budget + actual + context:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the variance report: brand voice, all four sections, top-variances table has 6 columns and is ranked correctly, drivers cite a confidence level, questions name owners or 'unassigned', recommendations are specific, every number traces back to the input.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
