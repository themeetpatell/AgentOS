import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';
import { renderCrmRecord } from '../_base/crm-prompt';

const ID: AgentId = 'discovery-prep';

/**
 * Discovery call prep agent.
 * Input: brief.context.leadId OR dealId (orchestrator pre-fetches the record).
 *        brief.title         = call topic / agenda hint.
 *        brief.instructions  = focus areas, knowns, suspected pain.
 * Output: Draft with body=markdown brief (Background, Pain hypotheses,
 *         Talking points, Qualifying questions, Objections). No variants.
 */
export const discoveryPrepAgent = createClaudeAgent({
  id: ID,
  name: 'Discovery Prep',
  description:
    'Pre-call brief for a Finanshels discovery call: background, pain hypotheses, talking points, qualifying questions, objection prep.',

  planSystemPrompt: (brand) => `${brand}

You plan a discovery-call brief for a Finanshels rep.
Respond ONLY with JSON:
{
  "summary": "the bet: what we think this lead's biggest pain is and why",
  "outline": [
    { "heading": "background", "notes": "5 bullets from CRM + public signals; never invent" },
    { "heading": "pain hypotheses", "notes": "3 ranked guesses + the question that tests each" },
    { "heading": "talking points", "notes": "value props mapped to the hypotheses, not a feature list" },
    { "heading": "qualifying questions", "notes": "5-7 open questions ordered by sequence" },
    { "heading": "objections", "notes": "anticipated objections + a one-line answer each" }
  ],
  "references": []
}`,

  planUserPrompt: (brief, context) => `Call topic: ${brief.title}
Focus / knowns: ${brief.instructions}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}

${renderCrmRecord(context)}`,

  executeSystemPrompt: (brand) => `${brand}

Write the full discovery-call brief.
Rules:
- Markdown sections in this order: Background, Pain Hypotheses, Talking Points, Qualifying Questions, Objections.
- Background: bullets only, max 6, each tied to a CRM field or stated public signal. Never invent.
- Qualifying questions: numbered, open-ended, 5-7 total.
- Objections: each as "Objection: ... -> Reply: ...".
- Total length 350-700 words.

Respond ONLY with JSON:
{
  "title": "Discovery prep: <call topic>",
  "body": "Markdown brief"
}`,

  executeUserPrompt: (brief, plan, context) => `Call topic: ${brief.title}
Focus / knowns: ${brief.instructions}
Plan:
${JSON.stringify(plan, null, 2)}

${renderCrmRecord(context)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the discovery prep: brand voice, all five sections present, no fabricated client facts, 5-7 qualifying questions, objections in the prescribed format, no unverified regulated claims.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
