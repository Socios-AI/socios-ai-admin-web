export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    if (!payload) return null;
    // Validate that the payload only contains base64url-safe characters
    if (!/^[A-Za-z0-9\-_]*$/.test(payload)) return null;
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    try {
      return JSON.parse(json) as T;
    } catch {
      return {} as T;
    }
  } catch {
    return null;
  }
}
