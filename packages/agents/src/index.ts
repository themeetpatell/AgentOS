export * from './_base/agent';
export * from './_base/claude-client';
export * from './_base/types';
export * from './_base/crm-prompt';

import type { Agent } from './_base/agent';
import { blogPostAgent } from './blog-post';
import { seoBriefAgent } from './seo-brief';
import { socialVariantsAgent } from './social-variants';
import { adCopyAgent } from './ad-copy';
import { emailNurtureAgent } from './email-nurture';
import { newsletterAgent } from './newsletter';
import { coldOutreachAgent } from './cold-outreach';
import { followUpAgent } from './follow-up';
import { discoveryPrepAgent } from './discovery-prep';
import { pipelineHealthAgent } from './pipeline-health';
import { dealRiskAgent } from './deal-risk';
import { winLossAgent } from './win-loss';
import { repScorecardAgent } from './rep-scorecard';
import { meetingPrepAgent } from './meeting-prep';
import { meetingSummaryAgent } from './meeting-summary';
import { interviewDebriefAgent } from './interview-debrief';
import { jobDescriptionAgent } from './job-description';
import { onboardingPlanAgent } from './onboarding-plan';
import { financialCommentaryAgent } from './financial-commentary';
import { varianceExplainerAgent } from './variance-explainer';

export const AGENT_REGISTRY: Readonly<Record<string, Agent>> = Object.freeze({
  // Marketing
  [blogPostAgent.id]: blogPostAgent,
  [seoBriefAgent.id]: seoBriefAgent,
  [socialVariantsAgent.id]: socialVariantsAgent,
  [adCopyAgent.id]: adCopyAgent,
  [emailNurtureAgent.id]: emailNurtureAgent,
  [newsletterAgent.id]: newsletterAgent,
  // Sales outreach
  [coldOutreachAgent.id]: coldOutreachAgent,
  [followUpAgent.id]: followUpAgent,
  [discoveryPrepAgent.id]: discoveryPrepAgent,
  // Sales analytics
  [pipelineHealthAgent.id]: pipelineHealthAgent,
  [dealRiskAgent.id]: dealRiskAgent,
  [winLossAgent.id]: winLossAgent,
  [repScorecardAgent.id]: repScorecardAgent,
  // Day-to-day (universal)
  [meetingPrepAgent.id]: meetingPrepAgent,
  [meetingSummaryAgent.id]: meetingSummaryAgent,
  // HR
  [interviewDebriefAgent.id]: interviewDebriefAgent,
  [jobDescriptionAgent.id]: jobDescriptionAgent,
  [onboardingPlanAgent.id]: onboardingPlanAgent,
  // Internal finance
  [financialCommentaryAgent.id]: financialCommentaryAgent,
  [varianceExplainerAgent.id]: varianceExplainerAgent,
});

export {
  blogPostAgent,
  seoBriefAgent,
  socialVariantsAgent,
  adCopyAgent,
  emailNurtureAgent,
  newsletterAgent,
  coldOutreachAgent,
  followUpAgent,
  discoveryPrepAgent,
  pipelineHealthAgent,
  dealRiskAgent,
  winLossAgent,
  repScorecardAgent,
  meetingPrepAgent,
  meetingSummaryAgent,
  interviewDebriefAgent,
  jobDescriptionAgent,
  onboardingPlanAgent,
  financialCommentaryAgent,
  varianceExplainerAgent,
};
