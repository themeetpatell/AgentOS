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

export interface AgentExecutionContext {
  readonly brandContextVersion: string;
  readonly brandContextPrompt: string;
  readonly anthropicApiKey: string;
  readonly planModel: string;
  readonly executeModel: string;
  readonly lightModel: string;
  /**
   * Optional CRM record snapshot pre-fetched by the orchestrator when the
   * Brief carries `context.leadId` or `context.dealId`. Sales agents
   * personalize from this; marketing agents ignore it.
   */
  readonly crmRecord?: CrmRecordSnapshot;
}
