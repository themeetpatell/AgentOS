import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'ad-copy';

/**
 * Ad copy agent.
 * Input: brief.title         = campaign goal (e.g. "VAT registration lead-gen, Q3 UAE SMEs")
 *        brief.instructions  = audience, offer, restrictions, examples to emulate or avoid.
 *        brief.targetAudience= optional refinement of the persona.
 * Output: a Draft whose `variants[]` carries labeled headline + primary text pairs:
 *         "meta-1".."meta-3" and "linkedin-1".."linkedin-3", each variant body
 *         is "Headline: ...\\nPrimary: ..." for direct copy/paste into ad platforms.
 */
export const adCopyAgent = createClaudeAgent({
  id: ID,
  name: 'Ad Copy',
  description:
    'Produces headline and primary-text variants for Meta and LinkedIn ads from a campaign goal and audience.',

  planSystemPrompt: (brand) => `${brand}

You plan paid-social ad variants for Finanshels.
Respond ONLY with JSON:
{
  "summary": "the campaign hypothesis: who, what offer, why now",
  "outline": [
    { "heading": "angle-1", "notes": "the message and proof point for this variant" }
  ],
  "references": []
}
Produce 3 distinct angles. Each angle becomes one Meta + one LinkedIn variant in execute.`,

  planUserPrompt: (brief) => `Campaign goal: ${brief.title}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}
Offer + constraints:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the actual ad copy from the plan.
Meta: headline <=40 chars, primary text <=125 chars, no emoji, no exclamation.
LinkedIn: headline <=70 chars, primary text <=600 chars.
Each variant body must be formatted exactly:
Headline: <text>
Primary: <text>

Respond ONLY with JSON:
{
  "title": "Ads for: <campaign goal>",
  "body": "one-line summary of the three angles",
  "variants": [
    { "label": "meta-1", "body": "Headline: ...\\nPrimary: ..." },
    { "label": "linkedin-1", "body": "Headline: ...\\nPrimary: ..." }
  ]
}`,

  executeUserPrompt: (brief, plan) => `Campaign: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Offer + constraints:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check every ad variant: brand voice, no hype, no unverified regulatory claims, character limits respected, headline+primary format used, no emoji, no exclamation, no "guaranteed" or "best" claims.
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
