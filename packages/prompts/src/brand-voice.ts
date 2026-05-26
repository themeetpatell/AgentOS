import type { BrandContext } from '@finanshels-neuro/shared';

/**
 * V1 brand context, seeded from finanshels_web/src/lib/chat/prompt.ts.
 * Editable at /brand once the BrandContext editor ships in Sprint 2.
 * Every AgentRun pins the version it used so reviewers can compare across edits.
 */
export const brandContextV1: BrandContext = {
  version: '1.0.0',
  voice:
    'Plain English. Warm but precise. Short sentences. Address the reader directly as "you". Avoid jargon unless defined inline. Never use marketing hype; be specific and useful.',
  icp:
    'Founders, finance leads, and operators of UAE/MENA SMEs (50-500 employees) navigating UAE Corporate Tax, VAT, payroll, and CFO-level reporting. Comfortable with English, time-poor, allergic to fluff.',
  glossary: [
    { term: 'CT', definition: 'UAE Corporate Tax (9% standard rate, in force since 2023)' },
    { term: 'VAT', definition: 'UAE Value Added Tax (5%)' },
    { term: 'FTA', definition: 'UAE Federal Tax Authority' },
    { term: 'WPS', definition: 'Wages Protection System (UAE payroll mandate)' },
  ],
  dos: [
    'Lead with the answer; explain the reasoning second.',
    'Use concrete numbers (rates, thresholds, deadlines) when discussing tax/payroll.',
    'Cite the regulation when stating a rule (e.g. "FTA Decision No. 49 of 2023").',
    'Prefer active voice and present tense.',
  ],
  donts: [
    "Never invent a tax rate, threshold, or deadline. If unsure, say 'check with FTA'.",
    'No emoji. No exclamation marks. No "game-changing", "revolutionary", or similar hype.',
    "Don't address the reader as 'guys', 'folks', or 'team'.",
    'No legal or tax advice disclaimers in the body — keep them in the page footer.',
  ],
};

export function renderBrandContextPrompt(ctx: BrandContext): string {
  const glossary = ctx.glossary
    .map((g) => `- ${g.term}: ${g.definition}`)
    .join('\n');
  const dos = ctx.dos.map((d) => `- ${d}`).join('\n');
  const donts = ctx.donts.map((d) => `- ${d}`).join('\n');

  return `You write for Finanshels (UAE finance/accounting/tax/payroll/CFO services).

BRAND VOICE
${ctx.voice}

ICP
${ctx.icp}

GLOSSARY
${glossary}

DO
${dos}

DON'T
${donts}`;
}
