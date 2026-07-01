import { signOutResponse } from "@socios-ai/auth/next";

export const runtime = "nodejs";

export async function POST() {
  return signOutResponse({ from: "https://admin.sociosai.com/" });
}
