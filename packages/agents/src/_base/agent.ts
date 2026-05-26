import type {
  AgentId,
  Brief,
  ContentPlan,
  Draft,
  TokenUsage,
  ValidationReport,
} from '@finanshels-neuro/shared';
import type { AgentExecutionContext } from './types';

/**
 * Pluggable agent contract.
 * Each agent (blog-post, seo-brief, etc.) implements this interface.
 * The platform shell (orchestrator) calls plan -> execute -> validate.
 */
export interface Agent {
  readonly id: AgentId;
  readonly name: string;
  readonly description: string;

  plan(
    brief: Brief,
    context: AgentExecutionContext,
  ): Promise<PlanResult>;

  execute(
    brief: Brief,
    plan: ContentPlan,
    context: AgentExecutionContext,
  ): Promise<ExecuteResult>;

  validate(
    draft: Draft,
    context: AgentExecutionContext,
  ): Promise<ValidateResult>;
}

export interface PlanResult {
  readonly plan: ContentPlan;
  readonly tokenUsage: TokenUsage;
}

export interface ExecuteResult {
  readonly draft: Draft;
  readonly tokenUsage: TokenUsage;
}

export interface ValidateResult {
  readonly report: ValidationReport;
  readonly tokenUsage: TokenUsage;
}
