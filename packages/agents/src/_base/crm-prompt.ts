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
