/**
 * Domain types shared across web, api, and agent packages.
 * Mirrors the neuro-app BotJob/Plan/Diff shape, adapted for content workflows.
 */

export type AgentId =
  | 'blog-post'
  | 'seo-brief'
  | 'social-variants'
  | 'ad-copy'
  | 'cold-outreach'
  | 'follow-up'
  | 'discovery-prep';

export type RunStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'EDITED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'CANCELLED'
  | 'FAILED'
  | 'BUDGET_BLOCKED';

export const ACTIVE_STATUSES: ReadonlyArray<RunStatus> = [
  'QUEUED',
  'PLANNING',
  'EXECUTING',
  'VALIDATING',
  'AWAITING_REVIEW',
];

export const TERMINAL_STATUSES: ReadonlyArray<RunStatus> = [
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
  'CANCELLED',
  'FAILED',
];

export interface Brief {
  readonly id: string;
  readonly agentId: AgentId;
  readonly title: string;
  readonly instructions: string;
  readonly targetAudience?: string;
  readonly wordCountTarget?: number;
  readonly attachmentUrls: ReadonlyArray<string>;
  /**
   * Free-form context bag for CRM refs and other structured pointers.
   * Sales agents look up `context.leadId` / `context.dealId` to fetch the
   * matching Zoho record before planning.
   */
  readonly context?: Readonly<Record<string, string>>;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface ContentPlan {
  readonly summary: string;
  readonly outline: ReadonlyArray<{
    readonly heading: string;
    readonly notes: string;
  }>;
  readonly seoTitle?: string;
  readonly metaDescription?: string;
  readonly references: ReadonlyArray<string>;
}

export interface Draft {
  readonly title: string;
  readonly body: string;
  readonly seoTitle?: string;
  readonly metaDescription?: string;
  readonly variants?: ReadonlyArray<{ label: string; body: string }>;
}

export interface ValidationReport {
  readonly brandVoiceOk: boolean;
  readonly issues: ReadonlyArray<{
    readonly severity: 'info' | 'warning' | 'error';
    readonly message: string;
  }>;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
}

export interface AgentRun {
  readonly id: string;
  readonly briefId: string;
  readonly agentId: AgentId;
  readonly status: RunStatus;
  readonly attempts: number;
  readonly plan?: ContentPlan;
  readonly draft?: Draft;
  readonly validation?: ValidationReport;
  readonly tokenUsage?: TokenUsage;
  readonly errorMessage?: string;
  readonly createdBy: string;
  readonly reviewedBy?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BrandContext {
  readonly version: string;
  readonly voice: string;
  readonly icp: string;
  readonly glossary: ReadonlyArray<{ term: string; definition: string }>;
  readonly dos: ReadonlyArray<string>;
  readonly donts: ReadonlyArray<string>;
}

export interface AuditEvent {
  readonly id: string;
  readonly runId: string;
  readonly actor: string;
  readonly action:
    | 'BRIEF_SUBMITTED'
    | 'PLAN_GENERATED'
    | 'DRAFT_GENERATED'
    | 'VALIDATED'
    | 'EDITED'
    | 'APPROVED'
    | 'REJECTED'
    | 'PUBLISHED'
    | 'CANCELLED';
  readonly before?: unknown;
  readonly after?: unknown;
  readonly createdAt: string;
}
