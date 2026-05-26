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

export interface AgentExecutionContext {
  readonly brandContextVersion: string;
  readonly brandContextPrompt: string;
  readonly anthropicApiKey: string;
  readonly planModel: string;
  readonly executeModel: string;
  readonly lightModel: string;
}
