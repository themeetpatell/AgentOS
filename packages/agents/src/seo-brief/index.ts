import type { AgentId } from '@finanshels-neuro/shared';
import type { Agent } from '../_base/agent';

const ID: AgentId = 'seo-brief';

/**
 * SEO brief agent — stub for Sprint 0.
 * Sprint 2 will implement plan/execute/validate following blog-post's pattern.
 */
export const seoBriefAgent: Agent = {
  id: ID,
  name: 'SEO Brief',
  description:
    'Produces a SERP-aware brief (intent, outline, internal links, FAQ) from a target keyword.',

  async plan() {
    throw new Error('seo-brief agent not implemented yet (Sprint 2)');
  },
  async execute() {
    throw new Error('seo-brief agent not implemented yet (Sprint 2)');
  },
  async validate() {
    throw new Error('seo-brief agent not implemented yet (Sprint 2)');
  },
};
