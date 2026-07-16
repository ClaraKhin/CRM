let ipPromise: Promise<string | null> | null = null;

export function getClientIp(): Promise<string | null> {
  if (ipPromise) return ipPromise;
  ipPromise = (async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip as string | null;
    } catch {
      return null;
    }
  })();
  return ipPromise;
}

export function parseUserAgent(ua: string) {
  const device_type = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
    ? 'tablet'
    : /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
      ? 'mobile'
      : 'desktop';

  const browser = (() => {
    if (/Edg\/|Edge\//i.test(ua)) return 'Edge';
    if (/OPR\/|Opera\//i.test(ua)) return 'Opera';
    if (/Chrome\/|CriOS\//i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua)) return 'Safari';
    if (/Firefox\/|FxiOS\//i.test(ua)) return 'Firefox';
    return 'Unknown';
  })();

  const os = (() => {
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  })();

  return { device_type, browser, os };
}

export async function getClientInfo() {
  const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const ip_address = await getClientIp();
  const { device_type, browser, os } = parseUserAgent(user_agent);
  return { ip_address, user_agent, device_type, browser, os };
}

export function deriveActionType(action: string): string | null {
  const known = ['login', 'logout', 'signup', 'password_reset', 'create', 'update', 'delete', 'read', 'export'];
  return known.includes(action) ? action : null;
}
