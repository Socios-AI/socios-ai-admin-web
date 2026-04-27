export type AuditCursor = { created_at: string; id: number };

export function encodeCursor(c: AuditCursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(s: string | undefined): AuditCursor | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.created_at === "string" &&
      typeof parsed.id === "number"
    ) {
      return { created_at: parsed.created_at, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}
