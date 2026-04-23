type CookieReader = { get(name: string): { value: string } | undefined };

// @supabase/ssr chunks the auth cookie when the JWT exceeds the per-cookie size
// budget (common with ES256 tokens). Chunks are stored as `<base>.0`, `<base>.1`,
// etc. and must be concatenated in order to recover the original payload.
export function readSessionCookie(cookies: CookieReader, baseName: string): string | null {
  if (cookies.get(`${baseName}.0`)) {
    let assembled = "";
    let i = 0;
    while (true) {
      const c = cookies.get(`${baseName}.${i}`);
      if (!c) break;
      assembled += c.value;
      i++;
    }
    return assembled || null;
  }
  return cookies.get(baseName)?.value ?? null;
}

// Cookie value formats from @supabase/ssr:
//   - JSON-stringified array `[access_token, refresh_token, ...]` (most common)
//   - same array, base64-encoded with a `base64-` prefix
//   - bare access token (test/legacy)
export function extractAccessToken(cookieValue: string): string {
  if (!cookieValue.startsWith("[") && !cookieValue.startsWith("base64-")) {
    return cookieValue;
  }
  try {
    const raw = cookieValue.startsWith("base64-")
      ? Buffer.from(cookieValue.slice("base64-".length), "base64").toString("utf-8")
      : cookieValue;
    const parsed = JSON.parse(raw) as [string, ...unknown[]];
    return parsed[0] ?? cookieValue;
  } catch {
    return cookieValue;
  }
}
