import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'job-description';

/**
 * Job description agent (HR).
 * Input: brief.title         = role title.
 *        brief.instructions  = rough requirements, team context, level, comp range if any.
 * Output: Draft with polished JD in body + interview rubric in variants.
 */
export const jobDescriptionAgent = createClaudeAgent({
  id: ID,
  name: 'Job Description',
  description:
    'Drafts a polished JD (responsibilities, must-haves, nice-to-haves, success criteria) plus a starter interview rubric.',

  planSystemPrompt: (brand) => `${brand}

You plan a Finanshels job posting.
Respond ONLY with JSON:
{
  "summary": "the one-sentence pitch for the role",
  "outline": [
    { "heading": "about Finanshels", "notes": "2-3 sentences positioning the company for this candidate type" },
    { "heading": "role overview", "notes": "what the person will own + who they work with" },
    { "heading": "responsibilities", "notes": "5-8 concrete responsibilities" },
    { "heading": "must-haves", "notes": "non-negotiable qualifications" },
    { "heading": "nice-to-haves", "notes": "advantages, not blockers" },
    { "heading": "what success looks like", "notes": "first 90 days outcomes" },
    { "heading": "interview rubric", "notes": "4-6 evaluation dimensions with what 'meets' vs 'exceeds' looks like" }
  ],
  "references": []
}`,

  planUserPrompt: (brief) => `Role: ${brief.title}
Rough requirements + context:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the JD as markdown in the body and the interview rubric as a separate variant.
JD rules:
- Sections: ## About Finanshels, ## Role Overview, ## Responsibilities, ## Must-Haves, ## Nice-to-Haves, ## What Success Looks Like (first 90 days).
- Responsibilities: 5-8 bulleted, action-verb-led.
- Must-haves: bulleted; each one a verifiable signal, no "passion for ...".
- 400-700 words total.

Rubric rules:
- 4-6 evaluation dimensions. Each: "**Dimension**: <what it covers>. Meets: <description>. Exceeds: <description>."
- Plain markdown.

Respond ONLY with JSON:
{
  "title": "<role title>",
  "body": "Markdown JD",
  "variants": [
    { "label": "interview-rubric", "body": "Markdown rubric" }
  ]
}`,

  executeUserPrompt: (brief, plan) => `Role: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Rough requirements + context:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the JD + rubric: brand voice, all six JD sections, must-haves are verifiable (no "passion"/"rockstar"/"ninja"), 5-8 responsibilities, rubric has 4-6 dimensions with meets/exceeds, no hype.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => {
    const variants = (draft.variants ?? [])
      .map((v) => `${v.label}:\n${v.body}`)
      .join('\n---\n');
    return `Title: ${draft.title}\n\nJD:\n${draft.body}\n\nVariants:\n${variants}`;
  },
});
