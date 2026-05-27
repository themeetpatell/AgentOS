import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'newsletter';

/**
 * Weekly newsletter digest agent.
 * Input: brief.title         = the week's theme or hook.
 *        brief.instructions  = 3-5 source links/notes, optionally with summaries.
 * Output: Draft with title=subject, body=intro + 3 sections + sign-off (markdown).
 */
export const newsletterAgent = createClaudeAgent({
  id: ID,
  name: 'Newsletter (weekly digest)',
  description:
    'Drafts a weekly Finanshels newsletter: subject, intro hook, 3 sections, sign-off.',

  planSystemPrompt: (brand) => `${brand}

You plan a weekly Finanshels newsletter.
Respond ONLY with JSON:
{
  "summary": "the through-line tying the week's items together",
  "outline": [
    { "heading": "intro", "notes": "the hook + why this week matters" },
    { "heading": "section-1", "notes": "the lead story + the takeaway" },
    { "heading": "section-2", "notes": "second story + takeaway" },
    { "heading": "section-3", "notes": "third story + takeaway (optional 'quick hits' bullets)" },
    { "heading": "sign-off", "notes": "one CTA + a one-line PS" }
  ],
  "seoTitle": "subject line (<=55 chars, no exclamation)",
  "references": []
}`,

  planUserPrompt: (brief) => `Week's theme/hook: ${brief.title}
Source notes:
${brief.instructions}
Audience: ${brief.targetAudience ?? 'Finanshels ICP'}`,

  executeSystemPrompt: (brand) => `${brand}

Write the newsletter as markdown.
Rules:
- Subject in title; <=55 chars, no exclamation.
- Body sections: ## Intro, ## <story-1 H2>, ## <story-2 H2>, ## <story-3 H2 or Quick hits>, ## Sign-off.
- Each story 80-140 words. Quick hits = 3-5 bullets <=15 words each.
- Sign-off includes one CTA and an optional PS (<=20 words).
- Total length 500-900 words. Plain markdown, no images.

Respond ONLY with JSON:
{
  "title": "Subject line",
  "body": "Markdown newsletter"
}`,

  executeUserPrompt: (brief, plan) => `Theme: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}
Source notes:
${brief.instructions}`,

  validateSystemPrompt: (brand) => `${brand}

Check the newsletter: brand voice, all five sections present, takeaway per section, sign-off has CTA, character limits, no hype, no exclamation in subject, no fabricated stats.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "section + issue" }]
}`,

  validateUserPrompt: (draft) => `Subject: ${draft.title}\n\nBody:\n${draft.body}`,
});
