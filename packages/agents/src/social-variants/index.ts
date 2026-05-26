import type { AgentId } from '@finanshels-neuro/shared';
import type { Agent } from '../_base/agent';

const ID: AgentId = 'social-variants';

/**
 * Social variants agent — stub for Sprint 0.
 * Sprint 2 will turn an approved long-form post into 3-5 LinkedIn + 3-5 X variants.
 */
export const socialVariantsAgent: Agent = {
  id: ID,
  name: 'Social Variants',
  description:
    'Turns an approved blog post into 3-5 LinkedIn and 3-5 X posts in Finanshels voice.',

  async plan() {
    throw new Error('social-variants agent not implemented yet (Sprint 2)');
  },
  async execute() {
    throw new Error('social-variants agent not implemented yet (Sprint 2)');
  },
  async validate() {
    throw new Error('social-variants agent not implemented yet (Sprint 2)');
  },
};
