import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmDataset } from '../_base/crm-prompt';

const ID: AgentId = 'rep-scorecard';

/**
 * Sales rep scorecard agent.
 * Input: brief.title         = scorecard period (e.g. "April 2026").
 *        brief.instructions  = focus / quota notes (e.g. "AED 250k/rep quota").
 *        context.crmDataset  = {
 *          users: ZohoUser[],
 *          dealsByOwnerId: Record<userId, ZohoDeal[]>,     // open + closed in window
 *          activitiesByOwnerId: Record<userId, ZohoActivity[]>
 *        }
 * Output: Draft with markdown scorecard (Summary, Per-rep table,
 *         Standouts, Coaching opportunities).
 */
export const repScorecardAgent = createClaudeAgent({
  id: ID,
  name: 'Rep Scorecard',
  description:
    'Per-rep performance scorecard: activities, pipeline coverage, win rate, quota attainment, coaching flags.',

  planSystemPrompt: (brand) => `${brand}

You plan a per-rep scorecard from Zoho data.
Respond ONLY with JSON:
{
  "summary": "team-level headline + the biggest dispersion (e.g. 'top rep at 142% of quota; bottom rep at 31%')",
  "outline": [
    { "heading": "summary", "notes": "team count + average attainment + range" },
    { "heading": "per-rep table", "notes": "one row per active rep with activities, open pipeline AED, won AED, win rate, % of quota" },
    { "heading": "standouts", "notes": "top 2 reps + what specifically is driving their performance from the data" },
    { "heading": "coaching opportunities", "notes": "bottom 2-3 reps + specific deficit (low activities? low conversion? thin pipeline?) and a coaching suggestion" }
  ],
  "references": []
}
Never invent. Reps with no deals or no activities in the period appear in the table with explicit 0s, not omitted.`,

  planUserPrompt: (brief, context) => `Period: ${brief.title}
Focus / quota: ${brief.instructions}

${renderCrmDataset(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the rep scorecard as markdown.
Rules:
- ## Summary: 2-3 sentences. Lead with team attainment %, then highlight dispersion.
- ## Per-Rep Table: markdown table with columns Rep | Activities | Open Pipeline (AED) | Won (AED) | Win Rate | % of Quota. Sort by % of Quota desc.
- ## Standouts: 2 numbered items; each names the rep + the specific behavior driving performance.
- ## Coaching Opportunities: 2-3 numbered items; each names the rep, the specific deficit, and a concrete coaching action.
- AED format "AED 250,000". % format "112%". Never invent.
- Total length 350-650 words.

Respond ONLY with JSON:
{
  "title": "Rep scorecard: <period>",
  "body": "Markdown scorecard"
}`,

  executeUserPrompt: (brief, plan, context) => `Period: ${brief.title}
Focus / quota: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmDataset(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the scorecard: brand voice, all four sections present, table has 6 columns and one row per active rep, every behavior claim cites a number from the data, coaching items name the rep + the specific deficit + an action (not vague), no fabricated numbers.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
