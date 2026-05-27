import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'email-nurture';

/**
 * Email nurture sequence agent.
 * Input: brief.title         = sequence theme (e.g. "New CT-tax client onboarding").
 *        brief.instructions  = audience, the journey, what each step should accomplish.
 *        brief.targetAudience optional refinement.
 * Output: Draft with body = one-line cadence summary;
 *         variants[] = 3-5 full emails labeled step-1..step-5.
 */
export const emailNurtureAgent = createClaudeAgent({
  id: ID,
  name: 'Email Nurture Sequence',
  description:
    'Drafts a 3-5 step nurture sequence (welcome -> educational -> value-add -> soft-pitch -> reactivation) with timing notes.',

  planSystemPrompt: (brand) => `${brand}

You plan a multi-step email nurture sequence for Finanshels.
Respond ONLY with JSON:
{
  "summary": "the journey the reader takes and what changes by the end",
  "outline": [
    { "heading": "step-1", "notes": "what this step accomplishes + send delay (e.g. 'send on signup')" }
  ],
  "references": []
}
Produce 3 to 5 steps. Each step must have a unique purpose; do not repeat the ask.`,

  planUserPrompt: (brief) => `Sequence theme: ${brief.title}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}
Journey + goals per step: ${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write each step of the nurture sequence as a complete email.
Rules:
- Subject: <=55 chars, no exclamation, no clickbait.
- Body: <=180 words, plain text, one ask per step (or zero for pure-value steps).
- Step labels match the plan (step-1, step-2, ...).
- Include the send timing as a leading line: "Send: ...".

Respond ONLY with JSON:
{
  "title": "Nurture sequence: <theme>",
  "body": "One sentence summary of the journey",
  "variants": [
    { "label": "step-1", "body": "Send: ...\\nSubject: ...\\n\\nFull email" }
  ]
}`,

  executeUserPrompt: (brief, plan) => `Theme: ${brief.title}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}
Instructions: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the nurture sequence: brand voice, no hype, no exclamation, no emoji, character limits, distinct purpose per step, send timing present, no repeated CTAs across all steps.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "step label + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}:\n${v.body}`)
      .join('\n---\n');
    return `Title: ${draft.title}\n\nSequence:\n${variants}`;
  },
});
