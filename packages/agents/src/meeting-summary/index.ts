import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'meeting-summary';

/**
 * Meeting summary agent (universal — eats the manual post-meeting work).
 * Input: brief.title         = meeting title.
 *        brief.instructions  = raw transcript OR rough notes from the meeting.
 * Output: Draft with markdown summary in `body` and a draft follow-up
 *         email in `variants[{label:"follow-up-email"}]`.
 */
export const meetingSummaryAgent = createClaudeAgent({
  id: ID,
  name: 'Meeting Summary',
  description:
    'Turns a transcript or rough notes into a summary, decisions, action items with owners, and a drafted follow-up email.',

  planSystemPrompt: (brand) => `${brand}

You plan the structure of a post-meeting note.
Respond ONLY with JSON:
{
  "summary": "the one-sentence outcome of the meeting",
  "outline": [
    { "heading": "summary", "notes": "3-5 sentences of what happened and what changed" },
    { "heading": "decisions", "notes": "explicit decisions made + by whom" },
    { "heading": "action items", "notes": "each with owner, due date (infer if mentioned), and the specific deliverable" },
    { "heading": "open questions", "notes": "things still unresolved + who owns the answer" },
    { "heading": "follow-up email", "notes": "concise email to send to attendees with summary + actions" }
  ],
  "references": []
}
Never invent. If an action has no owner mentioned, write "owner: unassigned".`,

  planUserPrompt: (brief) => `Meeting: ${brief.title}
Transcript or notes:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the meeting summary as markdown, plus a draft follow-up email.
Rules:
- ## Summary: 3-5 sentences, lead with the outcome.
- ## Decisions: bulleted, each "Decision: ... — by <person>".
- ## Action Items: numbered, each "Owner: <name> | Due: <date|unassigned> | <specific deliverable>".
- ## Open Questions: bulleted, each "Q: ... — owner: <name>".
- Total markdown 300-600 words.
- Follow-up email variant: <=160 words, subject + body, no exclamation, recipients = attendees.

Respond ONLY with JSON:
{
  "title": "Summary: <meeting title>",
  "body": "Markdown summary",
  "variants": [
    { "label": "follow-up-email", "body": "Subject: ...\\n\\nFull email" }
  ]
}`,

  executeUserPrompt: (brief, plan) => `Meeting: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Transcript or notes:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the summary + email: brand voice, all four markdown sections, every action item has owner + due + deliverable, follow-up email has subject + body, no fabricated decisions, no exclamation.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}:\n${v.body}`)
      .join('\n---\n');
    return `Title: ${draft.title}\n\nBody:\n${draft.body}\n\nVariants:\n${variants}`;
  },
});
