import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmRecord } from '../_base/crm-prompt';

const ID: AgentId = 'follow-up';

/**
 * Follow-up sequence agent.
 * Input: brief.instructions carries the prior thread + outcome ("no reply 5d").
 *        brief.context.leadId optional (orchestrator pre-fetches if present).
 * Output: Draft with body = one-line cadence summary;
 *         variants[] = three full emails labeled nudge-1, nudge-2, breakup.
 */
export const followUpAgent = createClaudeAgent({
  id: ID,
  name: 'Follow-up',
  description:
    'Three-step follow-up cadence (nudge, value-add, breakup) for a stalled outreach thread.',

  planSystemPrompt: (brand) => `${brand}

You plan a three-touch follow-up cadence to a Finanshels lead who did not reply.
Respond ONLY with JSON:
{
  "summary": "the read on the silence + the cadence rationale",
  "outline": [
    { "heading": "nudge-1", "notes": "short bump 3-4 days after last email; reference prior touchpoint" },
    { "heading": "nudge-2", "notes": "value-add 7-10 days later: 1 useful resource or insight, no ask repeat" },
    { "heading": "breakup", "notes": "final 14 days later: assume bad timing; leave door open, low pressure" }
  ],
  "references": []
}`,

  planUserPrompt: (brief, context) => `Prior thread + outcome:
${brief.instructions}

Audience: ${brief.targetAudience ?? 'Finanshels ICP'}

${renderCrmRecord(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the three follow-up emails.
Rules:
- Each subject <=55 chars, prefer "Re:" prefix when continuing the thread.
- Each body <=110 words, plain text.
- nudge-1: bump only. nudge-2: must add concrete value (a stat, a one-liner takeaway, a question). breakup: short, no guilt-trip, no exclamation.

Respond ONLY with JSON:
{
  "title": "Follow-up cadence for: <thread topic>",
  "body": "One sentence summary of the cadence",
  "variants": [
    { "label": "nudge-1", "body": "Subject: ...\\n\\nFull email" },
    { "label": "nudge-2", "body": "Subject: ...\\n\\nFull email" },
    { "label": "breakup", "body": "Subject: ...\\n\\nFull email" }
  ]
}`,

  executeUserPrompt: (brief, plan, context) => `Prior thread + outcome:
${brief.instructions}

Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmRecord(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the three follow-ups: brand voice, no hype, no exclamation, no emoji, no guilt-trip language, character limits, nudge-2 actually adds value (not a repeated ask), breakup is gracious.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "variant label + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}:\n${v.body}`)
      .join('\n---\n');
    return `Title: ${draft.title}\n\nVariants:\n${variants}`;
  },
});
