import Anthropic from '@anthropic-ai/sdk';
import type { TokenUsage } from '@finanshels-neuro/shared';
import { DEFAULT_RETRY_CONFIG, type RetryConfig } from './types';

export class ClaudePlanError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ClaudePlanError';
  }
}

export class ClaudeExecuteError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ClaudeExecuteError';
  }
}

export interface ClaudeCallOptions {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly retry?: RetryConfig;
}

export interface ClaudeJsonResult<T> {
  readonly value: T;
  readonly raw: string;
  readonly tokenUsage: TokenUsage;
}

/**
 * Thin wrapper around the Anthropic SDK that:
 * - retries with exponential backoff (mirrors neuro-app code-agent retry)
 * - extracts and parses a fenced JSON payload from the model response
 * - returns token usage so the orchestrator can persist cost on AgentRun
 *
 * Pricing constants are placeholders for v0 and will be wired to the
 * canonical Anthropic price list in Sprint 1.
 */
export class ClaudeClient {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  async callJson<T>(
    opts: ClaudeCallOptions,
    parse: (raw: string) => T,
  ): Promise<ClaudeJsonResult<T>> {
    const retry = opts.retry ?? DEFAULT_RETRY_CONFIG;
    let lastError: unknown;
    let delay = retry.initialDelayMs;

    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: opts.model,
          max_tokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.3,
          system: opts.system,
          messages: [{ role: 'user', content: opts.user }],
        });

        const text = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        const raw = extractJsonBlock(text);
        const value = parse(raw);

        const tokenUsage: TokenUsage = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUsd: estimateCostUsd(
            opts.model,
            response.usage.input_tokens,
            response.usage.output_tokens,
          ),
        };

        return { value, raw, tokenUsage };
      } catch (error: unknown) {
        lastError = error;
        if (attempt < retry.maxAttempts) {
          await sleep(delay);
          delay *= retry.backoffMultiplier;
        }
      }
    }

    throw new ClaudePlanError(
      `Claude call failed after ${retry.maxAttempts} attempts`,
      lastError,
    );
  }
}

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return text.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PRICING_USD_PER_MTOKEN: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_USD_PER_MTOKEN[model];
  if (!pricing) {
    return 0;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}
