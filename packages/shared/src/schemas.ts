import { z } from 'zod';

export const agentIdSchema = z.enum([
  'blog-post',
  'seo-brief',
  'social-variants',
  'ad-copy',
  'cold-outreach',
  'follow-up',
  'discovery-prep',
]);

export const runStatusSchema = z.enum([
  'QUEUED',
  'PLANNING',
  'EXECUTING',
  'VALIDATING',
  'AWAITING_REVIEW',
  'APPROVED',
  'EDITED',
  'REJECTED',
  'PUBLISHED',
  'ARCHIVED',
  'CANCELLED',
  'FAILED',
  'BUDGET_BLOCKED',
]);

export const briefInputSchema = z.object({
  agentId: agentIdSchema,
  title: z.string().min(1).max(200),
  instructions: z.string().min(1).max(8000),
  targetAudience: z.string().max(500).optional(),
  wordCountTarget: z.number().int().positive().max(20000).optional(),
  attachmentUrls: z.array(z.string().url()).max(20).default([]),
  /** Free-form CRM refs (e.g. { leadId, dealId, contactId }) for sales agents. */
  context: z.record(z.string(), z.string().max(200)).optional(),
});

export const contentPlanSchema = z.object({
  summary: z.string().min(1),
  outline: z
    .array(
      z.object({
        heading: z.string().min(1),
        notes: z.string(),
      }),
    )
    .min(1),
  seoTitle: z.string().max(80).optional(),
  metaDescription: z.string().max(180).optional(),
  references: z.array(z.string()).default([]),
});

export const draftSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  seoTitle: z.string().max(80).optional(),
  metaDescription: z.string().max(180).optional(),
  variants: z
    .array(z.object({ label: z.string(), body: z.string() }))
    .optional(),
});

export const validationReportSchema = z.object({
  brandVoiceOk: z.boolean(),
  issues: z.array(
    z.object({
      severity: z.enum(['info', 'warning', 'error']),
      message: z.string(),
    }),
  ),
});

export const reviewActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().min(1) }),
  z.object({ action: z.literal('edit'), draft: draftSchema }),
]);

export type BriefInput = z.infer<typeof briefInputSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;
