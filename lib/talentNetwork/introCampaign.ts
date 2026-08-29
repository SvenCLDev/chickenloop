export const TALENT_NETWORK_INTRO_CAMPAIGN_ID = '2026-cutover';

export function getTalentNetworkIntroSessionKey(campaignId: string = TALENT_NETWORK_INTRO_CAMPAIGN_ID): string {
  return `tn_intro_prompted_${campaignId}`;
}

export function shouldShowTalentNetworkIntro(params: {
  role?: string | null;
  canEdit: boolean;
  dismissedCampaign?: string | null;
}): boolean {
  if (params.role !== 'job-seeker' || !params.canEdit) {
    return false;
  }
  return params.dismissedCampaign !== TALENT_NETWORK_INTRO_CAMPAIGN_ID;
}
