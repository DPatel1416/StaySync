import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    // Real, bounded database reads; never return tenant records to the caller.
    const results = await Promise.all(
      ["organizations", "properties", "departments"].map((table) =>
        admin.from(table).select("id").limit(1).abortSignal(AbortSignal.timeout(10_000))
      )
    );
    if (results.some(({ error }) => error)) {
      return NextResponse.json({ error: "Database health check failed" }, { status: 503 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Database health check failed" }, { status: 503 });
  }
}
