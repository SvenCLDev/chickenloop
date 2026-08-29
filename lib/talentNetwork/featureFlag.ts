import type { TalentNetworkUserContext } from './types';

export function isTalentNetworkGloballyEnabled(): boolean {
  return process.env.TALENT_NETWORK_ENABLED === 'true';
}

export function isTalentNetworkCutoverEnabled(): boolean {
  return process.env.TALENT_NETWORK_CUTOVER === 'true';
}

export function canUseTalentNetworkEditor(user: TalentNetworkUserContext): boolean {
  if (!isTalentNetworkGloballyEnabled()) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  if (user.role === 'job-seeker') {
    if (isTalentNetworkCutoverEnabled()) {
      return true;
    }
    return user.talentNetworkBeta === true;
  }
  return false;
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
