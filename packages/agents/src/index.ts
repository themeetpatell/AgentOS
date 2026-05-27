export * from './_base/agent';
export * from './_base/claude-client';
export * from './_base/types';
export * from './_base/crm-prompt';

import type { Agent } from './_base/agent';
import { blogPostAgent } from './blog-post';
import { seoBriefAgent } from './seo-brief';
import { socialVariantsAgent } from './social-variants';
import { adCopyAgent } from './ad-copy';
import { coldOutreachAgent } from './cold-outreach';
import { followUpAgent } from './follow-up';
import { discoveryPrepAgent } from './discovery-prep';

export const AGENT_REGISTRY: Readonly<Record<string, Agent>> = Object.freeze({
  [blogPostAgent.id]: blogPostAgent,
  [seoBriefAgent.id]: seoBriefAgent,
  [socialVariantsAgent.id]: socialVariantsAgent,
  [adCopyAgent.id]: adCopyAgent,
  [coldOutreachAgent.id]: coldOutreachAgent,
  [followUpAgent.id]: followUpAgent,
  [discoveryPrepAgent.id]: discoveryPrepAgent,
});

export {
  blogPostAgent,
  seoBriefAgent,
  socialVariantsAgent,
  adCopyAgent,
  coldOutreachAgent,
  followUpAgent,
  discoveryPrepAgent,
};
