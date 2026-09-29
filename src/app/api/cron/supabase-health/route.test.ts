// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

describe("database health cron", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    vi.mocked(createAdminClient).mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  const request = (token = "test-secret") => new Request("https://example.com/api/cron/supabase-health", {
    headers: { authorization: `Bearer ${token}` },
  });

  it("rejects unauthorized requests before accessing the database", async () => {
    expect((await GET(request("wrong"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request(""))).status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  function mockDatabase(error: unknown = null) {
    const abortSignal = vi.fn().mockResolvedValue({ data: [{ id: "private-record" }], error });
    const from = vi.fn().mockReturnValue({ select: () => ({ limit: () => ({ abortSignal }) }) });
    vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
  }

  it("reports success without exposing database records and disables caching", async () => {
    mockDatabase();
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports database failures without exposing error details", async () => {
    mockDatabase({ message: "sensitive detail" });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Database health check failed" });
  });

  it("reports missing configuration or network exceptions as failures", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => { throw new Error("configuration"); });
    expect((await GET(request())).status).toBe(503);
  });
});
