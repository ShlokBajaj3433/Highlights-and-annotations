const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'msclkid',
  'ttclid',
  'li_fat_id',
]);

const DOMAIN_ALLOWLIST: Record<string, string[]> = {
  'youtube.com': ['v', 'list', 't', 'si', 'pp', 'share'],
  'github.com': [],
  'docs.google.com': ['id', 'documentId', 'usp', 'resourcekey'],
  'notion.so': [],
  'twitter.com': ['status', 's', 't'],
  'x.com': ['status', 's', 't'],
  'arxiv.org': ['abs', 'pdf', 'format'],
  'linkedin.com': ['feedUpdate', 'trackingId'],
  'medium.com': ['source', 'sk'],
  'reddit.com': ['context', 'share_id'],
  'stackoverflow.com': ['answertab', 'pagesize'],
  'nytimes.com': ['smid', 'shareType'],
  'washingtonpost.com': ['tid', 'share'],
  'theguardian.com': ['CMP', 'share'],
};

export function getCanonicalUrl(document: Document): string | null {
  const link = document.querySelector('link[rel="canonical"]');
  return link?.getAttribute('href') || null;
}

export function normalizeUrl(raw: string, domain: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    u.hostname = u.hostname.replace(/^www\./, '');

    const allow = DOMAIN_ALLOWLIST[domain] || [];
    [...u.searchParams.keys()].forEach((k) => {
      if (!allow.includes(k) && TRACKING_PARAMS.has(k.toLowerCase())) {
        u.searchParams.delete(k);
      }
    });

    u.searchParams.sort();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return (
      u.hostname +
      path +
      (u.searchParams.toString() ? `?${u.searchParams.toString()}` : '') +
      u.hash
    );
  } catch {
    return raw;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export async function getPageKey(normalizedUrl: string, workspaceSecret: string): Promise<string> {
  return hmacSha256(workspaceSecret, normalizedUrl);
}

export function matchesDomainRule(url: string, ruleDomain: string): boolean {
  const urlDomain = extractDomain(url);
  const rule = ruleDomain.toLowerCase();
  const urlD = urlDomain.toLowerCase();

  if (rule === urlD) {
    return true;
  }
  if (rule.startsWith('*.')) {
    const suffix = rule.slice(2);
    return urlD === suffix || urlD.endsWith(`.${suffix}`);
  }
  return false;
}

export function getShareLevelForUrl(
  url: string,
  domainRules: DomainShareRule[],
  defaultLevel: ShareLevel,
  blocklist: string[]
): ShareLevel {
  const _domain = extractDomain(url);

  for (const rule of domainRules) {
    if (rule.isBlocklist && matchesDomainRule(url, rule.domain)) {
      return 'hidden';
    }
  }

  for (const rule of domainRules) {
    if (!rule.isBlocklist && matchesDomainRule(url, rule.domain)) {
      return rule.level;
    }
  }

  for (const blocked of blocklist) {
    if (matchesDomainRule(url, blocked)) {
      return 'hidden';
    }
  }

  return defaultLevel;
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
