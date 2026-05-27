import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmDataset } from '../_base/crm-prompt';

const ID: AgentId = 'win-loss';

/**
 * Win/loss analysis agent.
 * Input: brief.title         = analysis window label (e.g. "Q2 win-loss").
 *        brief.instructions  = focus questions (e.g. "what kills enterprise deals?").
 *        context.crmDataset  = { closedDeals: ZohoDeal[] } (won + lost in window).
 * Output: Draft with markdown analysis (Summary, Win patterns, Loss patterns,
 *         Comparison table, Recommendations).
 */
export const winLossAgent = createClaudeAgent({
  id: ID,
  name: 'Win/Loss Analysis',
  description:
    'Analyzes closed-won vs closed-lost deals in a window: patterns by source, vertical, deal size, stage of loss.',

  planSystemPrompt: (brand) => `${brand}

You plan a win/loss analysis from Zoho closed deals (won + lost) in the window.
Respond ONLY with JSON:
{
  "summary": "the headline pattern (e.g. 'we lose F&B mid-market in proposal stage')",
  "outline": [
    { "heading": "summary", "notes": "win rate + average deal size + headline pattern" },
    { "heading": "win patterns", "notes": "3-5 attributes correlated with wins (source, vertical, owner, time-in-stage)" },
    { "heading": "loss patterns", "notes": "3-5 attributes correlated with losses + the stage where losses happen" },
    { "heading": "comparison table", "notes": "side-by-side won vs lost on key dimensions" },
    { "heading": "recommendations", "notes": "3 changes to qualification, ICP, or process" }
  ],
  "references": []
}
Never invent. If a field is missing on a deal, exclude it from the relevant rate calculation and note the exclusion.`,

  planUserPrompt: (brief, context) => `Window: ${brief.title}
Focus: ${brief.instructions}

${renderCrmDataset(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the win/loss analysis as markdown.
Rules:
- ## Summary: lead with win rate (e.g. "won 32 of 87, 36.8%"), average won AED, average lost AED.
- ## Win Patterns: 3-5 ranked bullets with the supporting numbers in parentheses.
- ## Loss Patterns: 3-5 ranked bullets, including the stage where losses concentrate.
- ## Comparison Table: markdown table with columns Dimension | Won | Lost | Delta.
- ## Recommendations: numbered list of 3 changes; each tied to a pattern above.
- AED format "AED 1,250,000". Never invent numbers.
- Total length 400-700 words.

Respond ONLY with JSON:
{
  "title": "Win/loss: <window>",
  "body": "Markdown analysis"
}`,

  executeUserPrompt: (brief, plan, context) => `Window: ${brief.title}
Focus: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmDataset(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the analysis: brand voice, all five sections present, comparison table has 4 columns, every claimed pattern cites a supporting count from the data, no fabricated numbers, recommendations are specific.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
