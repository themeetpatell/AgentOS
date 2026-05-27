import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'interview-debrief';

/**
 * Interview debrief agent (HR).
 * Input: brief.title         = candidate name + role.
 *        brief.instructions  = interview notes + JD + any prior signals.
 * Output: Draft with structured eval (Strengths, Concerns, Missing Info,
 *         Recommendation, Next-Round Questions).
 */
export const interviewDebriefAgent = createClaudeAgent({
  id: ID,
  name: 'Interview Debrief',
  description:
    'Turns interview notes into a structured candidate evaluation with a hire/no-hire recommendation.',

  planSystemPrompt: (brand) => `${brand}

You plan a structured interview debrief.
Respond ONLY with JSON:
{
  "summary": "the headline read: strongest signal + biggest concern",
  "outline": [
    { "heading": "strengths", "notes": "3-5 concrete strengths, each tied to a moment in the interview" },
    { "heading": "concerns", "notes": "3-5 concerns; differentiate 'red flag' from 'gap to verify'" },
    { "heading": "missing info", "notes": "what we didn't get to that the next round must cover" },
    { "heading": "recommendation", "notes": "hire | no-hire | maybe + confidence + one-line reason" },
    { "heading": "next-round questions", "notes": "5-7 specific questions targeting the gaps" }
  ],
  "references": []
}
Never invent. If a strength or concern lacks evidence in the notes, omit it.`,

  planUserPrompt: (brief) => `Candidate + role: ${brief.title}
Interview notes + JD + signals:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the debrief as markdown.
Rules:
- Sections: ## Strengths, ## Concerns, ## Missing Info, ## Recommendation, ## Next-Round Questions.
- Each strength + concern: "<one line claim>. Evidence: <quote or moment from notes>."
- Recommendation: bold one of HIRE / NO HIRE / MAYBE + a one-sentence reason + confidence (low/med/high).
- Next-round questions: numbered, 5-7 items, each targeting a gap from Missing Info or Concerns.
- Total length 300-600 words.

Respond ONLY with JSON:
{
  "title": "Debrief: <candidate + role>",
  "body": "Markdown evaluation"
}`,

  executeUserPrompt: (brief, plan) => `Candidate + role: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Notes + JD + signals:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the debrief: brand voice, all five sections, every claim cites evidence from the notes, recommendation is one of HIRE/NO HIRE/MAYBE with confidence, 5-7 next-round questions, no fabricated evidence.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
