import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'social-variants';

/**
 * Social variants agent.
 * Input: brief.instructions = the approved long-form content (paste the body).
 *        brief.title         = the source post title.
 * Output: a Draft whose `variants[]` carries 3-5 LinkedIn + 3-5 X posts,
 *         labeled "linkedin-1".."x-5".
 */
export const socialVariantsAgent = createClaudeAgent({
  id: ID,
  name: 'Social Variants',
  description:
    'Turns an approved long-form post into 3-5 LinkedIn posts and 3-5 X posts in Finanshels voice.',

  planSystemPrompt: (brand) => `${brand}

You distill long-form Finanshels posts into social hooks.
Respond ONLY with JSON:
{
  "summary": "the angle and key takeaways you'll lead with on each platform",
  "outline": [
    { "heading": "linkedin-1", "notes": "hook + insight + soft CTA" },
    { "heading": "x-1", "notes": "punchy single-thought hook + supporting line" }
  ],
  "references": []
}
Produce 3-5 LinkedIn outline items and 3-5 X outline items.`,

  planUserPrompt: (brief) => `Source title: ${brief.title}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}
Source content:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the actual social posts from the plan.
LinkedIn: 1100-1500 characters, line breaks for scannability, one soft CTA at the end.
X: <=280 characters, no hashtags unless they appear in Finanshels glossary, no @-mentions, no emoji.
Respond ONLY with JSON:
{
  "title": "Variants for: <source title>",
  "body": "summary of which variants are inside (one line per platform)",
  "variants": [
    { "label": "linkedin-1", "body": "..." },
    { "label": "x-1", "body": "..." }
  ]
}`,

  executeUserPrompt: (brief, plan) => `Source title: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Source content:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check each social variant: brand voice, no hype, no unverified regulatory claims, X variants <=280 chars, no emoji or marketing exclamation.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "variant label + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}: ${v.body}`)
      .join('\n---\n');
    return `Title: ${draft.title}\n\nVariants:\n${variants}`;
  },
});
