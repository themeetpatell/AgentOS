import {
  contentPlanSchema,
  draftSchema,
  validationReportSchema,
  type AgentId,
  type Brief,
  type ContentPlan,
  type Draft,
} from '@finanshels-neuro/shared';
import type { z } from 'zod';
import type {
  Agent,
  ExecuteResult,
  PlanResult,
  ValidateResult,
} from './agent';
import { ClaudeClient } from './claude-client';

export interface ClaudeAgentConfig<TPlan = ContentPlan, TDraft = Draft> {
  readonly id: AgentId;
  readonly name: string;
  readonly description: string;

  readonly planSystemPrompt: (brand: string) => string;
  readonly planUserPrompt: (brief: Brief) => string;
  readonly planSchema?: z.ZodType<TPlan>;
  readonly planMaxTokens?: number;

  readonly executeSystemPrompt: (brand: string) => string;
  readonly executeUserPrompt: (brief: Brief, plan: TPlan) => string;
  readonly executeSchema?: z.ZodType<TDraft>;
  readonly executeMaxTokens?: number;

  readonly validateSystemPrompt: (brand: string) => string;
  readonly validateUserPrompt: (draft: TDraft) => string;
  readonly validateMaxTokens?: number;
}

/**
 * Factory for the standard two-pass Claude agent (plan -> execute -> validate).
 * Each phase calls ClaudeClient.callJson with the configured prompt and the
 * shared Zod schema (overridable per agent for non-standard plan/draft shapes).
 */
export function createClaudeAgent<TPlan = ContentPlan, TDraft = Draft>(
  config: ClaudeAgentConfig<TPlan, TDraft>,
): Agent {
  const planSchema = (config.planSchema ?? contentPlanSchema) as unknown as z.ZodType<TPlan>;
  const draftSchemaResolved = (config.executeSchema ?? draftSchema) as unknown as z.ZodType<TDraft>;

  return {
    id: config.id,
    name: config.name,
    description: config.description,

    async plan(brief, context): Promise<PlanResult> {
      const client = new ClaudeClient(context.anthropicApiKey);
      const result = await client.callJson(
        {
          model: context.planModel,
          system: config.planSystemPrompt(context.brandContextPrompt),
          user: config.planUserPrompt(brief),
          maxTokens: config.planMaxTokens,
        },
        (raw) => planSchema.parse(JSON.parse(raw)),
      );
      return {
        plan: result.value as unknown as ContentPlan,
        tokenUsage: result.tokenUsage,
      };
    },

    async execute(brief, plan, context): Promise<ExecuteResult> {
      const client = new ClaudeClient(context.anthropicApiKey);
      const result = await client.callJson(
        {
          model: context.executeModel,
          system: config.executeSystemPrompt(context.brandContextPrompt),
          user: config.executeUserPrompt(brief, plan as unknown as TPlan),
          maxTokens: config.executeMaxTokens ?? 8192,
        },
        (raw) => draftSchemaResolved.parse(JSON.parse(raw)),
      );
      return {
        draft: result.value as unknown as Draft,
        tokenUsage: result.tokenUsage,
      };
    },

    async validate(draft, context): Promise<ValidateResult> {
      const client = new ClaudeClient(context.anthropicApiKey);
      const result = await client.callJson(
        {
          model: context.lightModel,
          system: config.validateSystemPrompt(context.brandContextPrompt),
          user: config.validateUserPrompt(draft as unknown as TDraft),
          maxTokens: config.validateMaxTokens,
        },
        (raw) => validationReportSchema.parse(JSON.parse(raw)),
      );
      return { report: result.value, tokenUsage: result.tokenUsage };
    },
  };
}
