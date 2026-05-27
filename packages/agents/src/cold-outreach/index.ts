import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmRecord } from '../_base/crm-prompt';

const ID: AgentId = 'cold-outreach';

/**
 * Cold outreach agent.
 * Input: brief.context.leadId (orchestrator pre-fetches the Lead).
 *        brief.title         = working subject hint / campaign theme.
 *        brief.instructions  = offer, hook, constraints, anchors to mention.
 * Output: Draft with title=subject, body=primary email,
 *         variants[{label:"variant-b"|"shorter"}].
 */
export const coldOutreachAgent = createClaudeAgent({
  id: ID,
  name: 'Cold Outreach',
  description:
    'First-touch email to a Zoho lead: subject + primary body + two alternative variants in Finanshels voice.',

  planSystemPrompt: (brand) => `${brand}

You plan a single cold outreach email to a Finanshels lead.
Respond ONLY with JSON:
{
  "summary": "the hypothesis: which pain you address and the angle you take",
  "outline": [
    { "heading": "hook", "notes": "personalized opener tying to the lead's context" },
    { "heading": "insight", "notes": "1-2 sentences of value the reader cannot get from a brochure" },
    { "heading": "ask", "notes": "soft, low-friction next step (15 min, async option)" }
  ],
  "seoTitle": "draft subject line (<=55 chars, no exclamation)",
  "references": []
}
Do not invent client facts. If the CRM record is missing a field, omit references to it.`,

  planUserPrompt: (brief, context) => `Subject hint / campaign: ${brief.title}
Offer + constraints: ${brief.instructions}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}

${renderCrmRecord(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the email and two alternative variants.
Primary email rules:
- Subject: <=55 chars, no exclamation, no clickbait.
- Body: <=130 words, 4 short paragraphs max, one ask, one PS optional.
- Personalize from CRM record where available; never fabricate.
Variants:
- variant-b: same angle, different opener and ask phrasing.
- shorter: <=60 words for replies-from-mobile.

Respond ONLY with JSON:
{
  "title": "Subject line",
  "body": "Primary email body in plain text",
  "variants": [
    { "label": "variant-b", "body": "Alt full email" },
    { "label": "shorter", "body": "Short email" }
  ]
}`,

  executeUserPrompt: (brief, plan, context) => `Subject hint: ${brief.title}
Offer + constraints: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmRecord(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the email + variants: no fabricated client facts, brand voice OK, no hype words, no exclamation, no emoji, subject <=55 chars, primary body <=130 words, both variants present, no unverified regulated claims (tax rates, thresholds, deadlines).
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "subject|primary|variant-label + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}: ${v.body}`)
      .join('\n---\n');
    return `Subject: ${draft.title}\n\nPrimary:\n${draft.body}\n\nVariants:\n${variants}`;
  },
});
