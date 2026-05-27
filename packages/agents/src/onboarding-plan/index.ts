import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'onboarding-plan';

/**
 * Onboarding plan agent (HR).
 * Input: brief.title         = "Role + start date".
 *        brief.instructions  = manager, team, first projects, must-meet people, tooling.
 * Output: Draft with first-30-days plan (Week 1-4 milestones, intro list,
 *         first deliverable) in markdown.
 */
export const onboardingPlanAgent = createClaudeAgent({
  id: ID,
  name: 'Onboarding Plan',
  description:
    'Drafts a first-30-days onboarding plan with week-by-week milestones, intro list, and first deliverable.',

  planSystemPrompt: (brand) => `${brand}

You plan a new hire's first 30 days at Finanshels.
Respond ONLY with JSON:
{
  "summary": "the one-sentence outcome by end of day 30",
  "outline": [
    { "heading": "context", "notes": "the role + manager + team in 2 sentences" },
    { "heading": "week 1", "notes": "orient: tooling access, intros, codebase/process tour" },
    { "heading": "week 2", "notes": "shadow + first small deliverable" },
    { "heading": "week 3", "notes": "owns a small project end-to-end" },
    { "heading": "week 4", "notes": "delivers + retro + 30-day review checklist" },
    { "heading": "people to meet", "notes": "5-8 named (or role-named) intros + why each" },
    { "heading": "first deliverable", "notes": "what they ship by day 30 + how 'good' looks" }
  ],
  "references": []
}`,

  planUserPrompt: (brief) => `Role + start date: ${brief.title}
Manager + team + context:
${brief.instructions}`,

  executeSystemPrompt: (brand) => `${brand}

Write the onboarding plan as markdown.
Rules:
- Sections: ## Context, ## Week 1, ## Week 2, ## Week 3, ## Week 4, ## People to Meet, ## First Deliverable.
- Each week: 3-5 bulleted milestones with the day-of-week if known.
- People to Meet: bulleted, each "Name (role) — why".
- First Deliverable: "Ships: ... | Definition of done: ... | Reviewed by: ...".
- 350-700 words total.

Respond ONLY with JSON:
{
  "title": "Onboarding: <role + start>",
  "body": "Markdown plan"
}`,

  executeUserPrompt: (brief, plan) => `Role + start date: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Manager + team + context:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the onboarding plan: brand voice, all seven sections, each week has 3-5 milestones, people-to-meet has 5-8 entries with reason, first deliverable has all three fields (ships/done/reviewer), no fluff.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Title: ${draft.title}\n\nBody:\n${draft.body}`,
});
