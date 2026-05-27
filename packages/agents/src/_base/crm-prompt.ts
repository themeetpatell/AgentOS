import type { AgentExecutionContext } from './types';

/**
 * Render the optional CRM record from AgentExecutionContext into a
 * deterministic prompt block. Sales agents include this in user prompts so
 * the model has Lead/Deal context. Returns a "(none)" line when no record
 * is present, so prompts stay valid and the model can still draft from
 * brief.instructions alone.
 */
export function renderCrmRecord(context: AgentExecutionContext): string {
  const record = context.crmRecord;
  if (!record) {
    return 'CRM record: (none — no lead/deal pre-fetched).';
  }
  const lines = Object.entries(record.fields)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${formatValue(v)}`)
    .join('\n');
  return `CRM record (${record.module} #${record.id}):
${lines || '- (no displayable fields)'}`;
}

/**
 * Render the optional aggregated CRM dataset for analytics agents.
 * Embeds the full payload as JSON so the model can compute over it.
 * Truncates anything beyond MAX_DATASET_CHARS so prompts stay bounded.
 */
const MAX_DATASET_CHARS = 60_000;

export function renderCrmDataset(context: AgentExecutionContext): string {
  const ds = context.crmDataset;
  if (!ds) {
    return 'CRM dataset: (none — Zoho not configured or fetch failed).';
  }
  const countsLine = Object.entries(ds.counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  const json = JSON.stringify(ds.data, null, 2);
  const truncated = json.length > MAX_DATASET_CHARS;
  const body = truncated
    ? `${json.slice(0, MAX_DATASET_CHARS)}\n... (truncated; original was ${json.length} chars)`
    : json;
  return `CRM dataset "${ds.label}" (fetched ${ds.fetchedAt}; ${countsLine || 'no counts'}):
${body}`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  if (
    typeof value === 'object' &&
    'name' in (value as Record<string, unknown>)
  ) {
    return String((value as { name: unknown }).name);
  }
  return JSON.stringify(value);
}
