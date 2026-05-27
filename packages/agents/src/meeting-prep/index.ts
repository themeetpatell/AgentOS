import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'meeting-prep';

/**
 * Meeting prep agent (universal).
 * Input: brief.title         = meeting title.
 *        brief.instructions  = agenda + attendees + context + objective.
 * Output: Draft with markdown brief (Objective, Attendees, Talking Points,
 *         Questions to Ask, Risks/Blockers, Success Criteria).
 * No external integration. Paste-in, paste-out.
 */
export const meetingPrepAgent = createClaudeAgent({
  id: ID,
  name: 'Meeting Prep',
  description:
    'Generates pre-meeting talking points, questions, and success criteria from an agenda and context.',

  planSystemPrompt: (brand) => `${brand}

You plan a focused pre-meeting brief.
Respond ONLY with JSON:
{
  "summary": "the one-sentence purpose of this meeting + the single outcome you want",
  "outline": [
    { "heading": "objective", "notes": "what 'success' looks like in one sentence" },
    { "heading": "attendees", "notes": "who, role, what each likely cares about" },
    { "heading": "talking points", "notes": "3-5 points ranked by importance" },
    { "heading": "questions to ask", "notes": "open questions ordered by sequence" },
    { "heading": "risks / blockers", "notes": "anticipated objections + response" },
    { "heading": "success criteria", "notes": "how you'll know it worked" }
  ],
  "references": []
}`,

  planUserPrompt: (brief) => `Meeting: ${brief.title}
Agenda + attendees + context:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the meeting brief as markdown.
Rules:
- Sections in this order: ## Objective, ## Attendees, ## Talking Points, ## Questions to Ask, ## Risks / Blockers, ## Success Criteria.
- Objective: one sentence.
- Talking points: numbered list, 3-5 items.
- Questions: numbered list, open-ended, ordered by sequence.
- Risks / Blockers: "Risk: ... -> Response: ..." format.
- Success Criteria: 2-3 bullets.
- Total length 250-500 words. No fluff.

Respond ONLY with JSON:
{
  "title": "Prep: <meeting title>",
  "body": "Markdown brief"
}`,

  executeUserPrompt: (brief, plan) => `Meeting: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Agenda + attendees + context:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the prep brief: brand voice, all six sections present, objective is one sentence, questions are open-ended (not yes/no), risks use the prescribed format, no fluff.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
