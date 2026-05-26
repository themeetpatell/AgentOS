import {
  contentPlanSchema,
  draftSchema,
  validationReportSchema,
  type AgentId,
} from '@finanshels-neuro/shared';
import type {
  Agent,
  ExecuteResult,
  PlanResult,
  ValidateResult,
} from '../_base/agent';
import { ClaudeClient } from '../_base/claude-client';

const ID: AgentId = 'blog-post';

export const blogPostAgent: Agent = {
  id: ID,
  name: 'Blog Post',
  description:
    'Drafts 800-1500 word blog posts with H2/H3 structure, meta description, and SEO title in Finanshels voice.',

  async plan(brief, context): Promise<PlanResult> {
    const client = new ClaudeClient(context.anthropicApiKey);
    const result = await client.callJson(
      {
        model: context.planModel,
        system: planSystemPrompt(context.brandContextPrompt),
        user: planUserPrompt(brief),
      },
      (raw) => contentPlanSchema.parse(JSON.parse(raw)),
    );
    return { plan: result.value, tokenUsage: result.tokenUsage };
  },

  async execute(brief, plan, context): Promise<ExecuteResult> {
    const client = new ClaudeClient(context.anthropicApiKey);
    const result = await client.callJson(
      {
        model: context.executeModel,
        system: executeSystemPrompt(context.brandContextPrompt),
        user: executeUserPrompt(brief, plan),
        maxTokens: 8192,
      },
      (raw) => draftSchema.parse(JSON.parse(raw)),
    );
    return { draft: result.value, tokenUsage: result.tokenUsage };
  },

  async validate(draft, context): Promise<ValidateResult> {
    const client = new ClaudeClient(context.anthropicApiKey);
    const result = await client.callJson(
      {
        model: context.lightModel,
        system: validateSystemPrompt(context.brandContextPrompt),
        user: validateUserPrompt(draft),
      },
      (raw) => validationReportSchema.parse(JSON.parse(raw)),
    );
    return { report: result.value, tokenUsage: result.tokenUsage };
  },
};

function planSystemPrompt(brandContext: string): string {
  return `${brandContext}

You produce structured editorial outlines for Finanshels blog posts.
Respond ONLY with JSON matching this schema:
{
  "summary": "one-paragraph thesis",
  "outline": [{ "heading": "H2 heading", "notes": "what this section covers" }],
  "seoTitle": "<=60 char SEO title",
  "metaDescription": "<=160 char meta",
  "references": ["url or source label"]
}`;
}

function planUserPrompt(brief: {
  title: string;
  instructions: string;
  targetAudience?: string;
  wordCountTarget?: number;
}): string {
  return `Title: ${brief.title}
Instructions: ${brief.instructions}
Target audience: ${brief.targetAudience ?? 'Finanshels ICP — UAE/MENA founders and finance leads'}
Word count target: ${brief.wordCountTarget ?? 1200}`;
}

function executeSystemPrompt(brandContext: string): string {
  return `${brandContext}

You draft full blog posts from a structured plan.
Respond ONLY with JSON matching this schema:
{
  "title": "post title",
  "body": "markdown body with H2/H3 structure",
  "seoTitle": "<=60 char",
  "metaDescription": "<=160 char"
}`;
}

function executeUserPrompt(
  brief: { title: string; wordCountTarget?: number },
  plan: unknown,
): string {
  return `Brief title: ${brief.title}
Target length: ${brief.wordCountTarget ?? 1200} words.
Plan:
${JSON.stringify(plan, null, 2)}`;
}

function validateSystemPrompt(brandContext: string): string {
  return `${brandContext}

You check Finanshels drafts for brand-voice fit and regulated-claim risk.
Respond ONLY with JSON:
{
  "brandVoiceOk": true | false,
  "issues": [{ "severity": "info" | "warning" | "error", "message": "what is wrong" }]
}`;
}

function validateUserPrompt(draft: { title: string; body: string }): string {
  return `Title: ${draft.title}\n\nBody:\n${draft.body}`;
}
