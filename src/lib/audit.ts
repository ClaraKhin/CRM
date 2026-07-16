import { supabase } from './supabase';

type AuditActionType = 'login' | 'logout' | 'signup' | 'password_reset' | 'create' | 'update' | 'delete' | 'read' | 'export';

type WriteAuditParams = {
  userId: string | undefined;
  action: string;
  actionType?: AuditActionType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

function parseUserAgent(ua: string) {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|chromium|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macos/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = 'mobile';
  else if (/ipad|tablet/i.test(ua)) deviceType = 'tablet';

  return { browser, os, deviceType };
}

export async function writeAuditLog({
  userId,
  action,
  actionType,
  entityType,
  entityId,
  metadata = {},
}: WriteAuditParams): Promise<void> {
  if (!userId) return;
  const ua = navigator.userAgent;
  const { browser, os, deviceType } = parseUserAgent(ua);

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    action_type: actionType ?? null,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata,
    user_agent: ua,
    browser,
    os,
    device_type: deviceType,
  });
}
