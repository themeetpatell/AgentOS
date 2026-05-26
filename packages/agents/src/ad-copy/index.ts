import type { AgentId } from '@finanshels-neuro/shared';
import type { Agent } from '../_base/agent';

const ID: AgentId = 'ad-copy';

/**
 * Ad copy agent — stub for Sprint 0.
 * Sprint 2 will produce headline + primary text variants for Meta/LinkedIn ads.
 */
export const adCopyAgent: Agent = {
  id: ID,
  name: 'Ad Copy',
  description:
    'Produces headline and primary-text variants for Meta/LinkedIn ads from a campaign goal and audience.',

  async plan() {
    throw new Error('ad-copy agent not implemented yet (Sprint 2)');
  },
  async execute() {
    throw new Error('ad-copy agent not implemented yet (Sprint 2)');
  },
  async validate() {
    throw new Error('ad-copy agent not implemented yet (Sprint 2)');
  },
};
