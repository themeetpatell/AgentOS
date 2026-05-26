export * from './_base/agent';
export * from './_base/claude-client';
export * from './_base/types';

import type { Agent } from './_base/agent';
import { blogPostAgent } from './blog-post';
import { seoBriefAgent } from './seo-brief';
import { socialVariantsAgent } from './social-variants';
import { adCopyAgent } from './ad-copy';

export const AGENT_REGISTRY: Readonly<Record<string, Agent>> = Object.freeze({
  [blogPostAgent.id]: blogPostAgent,
  [seoBriefAgent.id]: seoBriefAgent,
  [socialVariantsAgent.id]: socialVariantsAgent,
  [adCopyAgent.id]: adCopyAgent,
});

export {
  blogPostAgent,
  seoBriefAgent,
  socialVariantsAgent,
  adCopyAgent,
};
