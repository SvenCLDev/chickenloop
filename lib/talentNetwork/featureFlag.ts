import type { TalentNetworkUserContext } from './types';

export function isTalentNetworkGloballyEnabled(): boolean {
  return process.env.TALENT_NETWORK_ENABLED === 'true';
}

export function canUseTalentNetworkEditor(user: TalentNetworkUserContext): boolean {
  if (!isTalentNetworkGloballyEnabled()) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return user.role === 'job-seeker' && user.talentNetworkBeta === true;
}

export function shouldRenderTalentNetworkView(
  profileSchemaVersion?: number | null
): boolean {
  return profileSchemaVersion === 2;
}

export function getTalentNetworkAccess(user: TalentNetworkUserContext): {
  enabled: boolean;
  canEdit: boolean;
} {
  const enabled = isTalentNetworkGloballyEnabled();
  const canEdit = canUseTalentNetworkEditor(user);
  return { enabled, canEdit };
}
