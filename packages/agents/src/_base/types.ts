export interface RetryConfig {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 2000,
  backoffMultiplier: 2,
};

export interface CrmRecordSnapshot {
  /** Which Zoho module the record came from. */
  readonly module: 'Leads' | 'Deals' | 'Contacts' | 'Accounts';
  /** Zoho record id. */
  readonly id: string;
  /** Whitelisted subset of record fields agents may safely reference in prompts. */
  readonly fields: Readonly<Record<string, unknown>>;
}

/**
 * Aggregated CRM dataset pre-fetched by the orchestrator for analytics
 * agents. The shape is intentionally loose — each analytics agent declares
 * what it expects from its system prompt (e.g. pipeline-health expects
 * `openDeals` array with Stage and Amount; deal-risk expects `openDeals`
 * + per-deal `activitiesByDealId`).
 */
export interface CrmDataset {
  /** Human label of the dataset (e.g. "open-deals", "closed-90d"). */
  readonly label: string;
  /** Free-form payload; agent prompts narrate the shape they expect. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Diagnostic counts for the prompt header (e.g. { deals: 42, reps: 4 }). */
  readonly counts: Readonly<Record<string, number>>;
  /** ISO timestamp when this snapshot was taken. */
  readonly fetchedAt: string;
}

export interface AgentExecutionContext {
  readonly brandContextVersion: string;
  readonly brandContextPrompt: string;
  readonly anthropicApiKey: string;
  readonly planModel: string;
  readonly executeModel: string;
  readonly lightModel: string;
  /**
   * Optional CRM record snapshot pre-fetched by the orchestrator when the
   * Brief carries `context.leadId` or `context.dealId`. Sales outreach
   * agents personalize from this; marketing agents ignore it.
   */
  readonly crmRecord?: CrmRecordSnapshot;
  /**
   * Optional aggregated CRM dataset for analytics agents (pipeline-health,
   * deal-risk, win-loss, rep-scorecard). The orchestrator dispatches on
   * `brief.agentId` to fetch the right shape via `ZohoService` bulk reads.
   */
  readonly crmDataset?: CrmDataset;
}
