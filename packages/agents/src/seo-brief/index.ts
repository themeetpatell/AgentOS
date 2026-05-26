import type { AgentId } from '@finanshels-neuro/shared';
import { createClaudeAgent } from '../_base/claude-agent';

const ID: AgentId = 'seo-brief';

/**
 * SEO brief agent.
 * Input: brief.title = target keyword, brief.instructions = intent/notes.
 * Output: a writer-ready brief (outline, FAQ section, internal-link suggestions).
 */
export const seoBriefAgent = createClaudeAgent({
  id: ID,
  name: 'SEO Brief',
  description:
    'Produces a SERP-aware brief (intent, outline, internal links, FAQ) from a target keyword.',

  planSystemPrompt: (brand) => `${brand}

You are an SEO strategist for Finanshels.
Given a target keyword and intent notes, propose a content plan a human writer can follow.
Respond ONLY with JSON:
{
  "summary": "one-paragraph thesis covering search intent and target reader",
  "outline": [{ "heading": "H2", "notes": "what this section covers + key entities" }],
  "seoTitle": "<=60 char SEO title",
  "metaDescription": "<=160 char meta",
  "references": ["existing internal link slug or external authority"]
}`,

  planUserPrompt: (brief) => `Target keyword: ${brief.title}
Intent and notes: ${brief.instructions}
Target audience: ${brief.targetAudience ?? 'Finanshels ICP — UAE/MENA founders and finance leads'}`,

  executeSystemPrompt: (brand) => `${brand}

Expand the plan into a full SEO content brief that a writer can hand off to Drafts.
Respond ONLY with JSON:
{
  "title": "Working title for the writer",
  "body": "markdown brief with sections: Intent, Audience, Outline (H2/H3), Key Entities, Internal Links, FAQ (5 Q&A), Acceptance criteria",
  "seoTitle": "<=60 char",
  "metaDescription": "<=160 char"
}`,

  executeUserPrompt: (brief, plan) => `Target keyword: ${brief.title}
Plan:
${JSON.stringify(plan, null, 2)}`,

  validateSystemPrompt: (brand) => `${brand}

Check the SEO brief for: hallucinated stats, off-brand voice, missing FAQ, and any regulated-claim risk on UAE finance topics.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "what is wrong" }]
}`,

  validateUserPrompt: (draft) => `Brief title: ${draft.title}\n\nBody:\n${draft.body}`,
});
