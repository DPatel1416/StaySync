import { NextResponse } from "next/server";

export function isDuplicateIdentityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /already (?:been )?registered|already exists|duplicate|email.*registered|user.*registered/i.test(message);
}

export function isSupabaseUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /fetch failed|failed to fetch|network|timeout|timed out|connection|service unavailable|project.*paused|502|503|504/i.test(message);
}

export function unavailableResponse(operation = "Authentication") {
  return NextResponse.json({ error: `${operation} is temporarily unavailable. Confirm that the Supabase project is active, then try again.` }, { status: 503 });
}
