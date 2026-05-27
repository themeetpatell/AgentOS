import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'financial-commentary';

/**
 * Financial commentary agent (internal finance).
 * Input: brief.title         = period label (e.g. "April 2026 management report").
 *        brief.instructions  = paste P&L numbers, KPIs, prior-period context, MoM/YoY notes.
 * Output: Draft with management-report narrative (Headline, What Changed,
 *         Why, So What, Watch List) in markdown.
 * Strict rule: never invent numbers. Every number in the output must come
 * from the pasted input.
 */
export const financialCommentaryAgent = createClaudeAgent({
  id: ID,
  name: 'Financial Commentary',
  description:
    'Turns raw P&L + KPI numbers into a human-readable narrative for a monthly management report.',

  planSystemPrompt: (brand) => `${brand}

You plan the narrative of a monthly financial commentary.
Respond ONLY with JSON:
{
  "summary": "the headline finding in one sentence (e.g. 'Revenue +18% MoM driven by CT-tax onboarding')",
  "outline": [
    { "heading": "headline", "notes": "lead with the single most important number" },
    { "heading": "what changed", "notes": "top 3-5 movements vs prior period, ranked by materiality" },
    { "heading": "why", "notes": "for each movement, the plausible driver based ONLY on what's in the input" },
    { "heading": "so what", "notes": "implications for next period: cash, hiring, runway, pricing" },
    { "heading": "watch list", "notes": "3-5 metrics or trends to watch in next period" }
  ],
  "references": []
}
Hard rule: every number you cite must appear in the pasted input. No estimates, no extrapolation.`,

  planUserPrompt: (brief) => `Period: ${brief.title}
P&L + KPIs + context:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the financial commentary as markdown.
Rules:
- Sections: ## Headline, ## What Changed, ## Why, ## So What, ## Watch List.
- AED format like "AED 1,250,000". Use the same currency as the input.
- "What Changed" is a numbered list of top 3-5 movements, each "<metric>: <prior> -> <current> (<delta %>)".
- "Why" maps each movement to a driver in 1-2 sentences. If the input doesn't support a clear cause, write "Driver unclear — investigate".
- "So What" gives 2-3 forward-looking implications.
- "Watch List" is bulleted, 3-5 items.
- 400-700 words total.
- Never invent numbers. Never estimate. If a comparison number is missing, write "n/a".

Respond ONLY with JSON:
{
  "title": "Commentary: <period>",
  "body": "Markdown commentary"
}`,

  executeUserPrompt: (brief, plan) => `Period: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
P&L + KPIs + context:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the commentary: brand voice, all five sections, every number cited traces back to the pasted input (no fabrication), watch-list has 3-5 items, no hype.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue (flag any fabricated number as error)" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
