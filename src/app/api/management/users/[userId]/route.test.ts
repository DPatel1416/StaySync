// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { DELETE } from "./route";
import { requireManagementPermission } from "@/lib/auth/management";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthenticatedViewer } from "@/lib/auth/viewer";

vi.mock("@/lib/auth/management", () => ({ requireManagementPermission: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/employee-management", () => ({ employeeAuthEmail: vi.fn(), prepareEmployeeAccess: vi.fn() }));

describe("delete employee account", () => {
  let accountKind: string;
  const update = vi.fn();
  const ban = vi.fn();
  const eq = vi.fn();
  const remove = async (userId: string) => {
    const response = await DELETE(new Request("https://example.com", { method: "DELETE" }), { params: Promise.resolve({ userId }) });
    if (!response) throw new Error("Missing response");
    return response;
  };
  beforeEach(() => {
    vi.clearAllMocks();
    accountKind = "EMPLOYEE";
    vi.mocked(requireManagementPermission).mockResolvedValue({ viewer: { id: "owner", organizationId: "org", accountKind: "ACCOUNT_HOLDER" } as AuthenticatedViewer });
    const query = {
      select: () => query, eq, is: () => query,
      maybeSingle: async () => ({ data: { id: "employee", account_kind: accountKind } }),
      update,
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    eq.mockReturnValue(query);
    update.mockReturnValue(query);
    ban.mockResolvedValue({ error: null });
    vi.mocked(createAdminClient).mockReturnValue({ from: () => query, auth: { admin: { updateUserById: ban } } } as unknown as ReturnType<typeof createAdminClient>);
  });
  it("allows the main account to remove an employee while preserving historical references", async () => {
    const response = await remove("employee");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(eq).toHaveBeenCalledWith("organization_id", "org");
    expect(ban).toHaveBeenCalledWith("employee", { ban_duration: "876000h" });
    expect(update).toHaveBeenCalledWith({ is_active: false, archived_at: expect.any(String) });
  });
  it("protects the primary account and self", async () => {
    expect((await remove("owner")).status).toBe(400);
    accountKind = "ACCOUNT_HOLDER";
    expect((await remove("another-owner")).status).toBe(404);
    expect(ban).not.toHaveBeenCalled();
  });
  it("rejects callers without management access", async () => {
    vi.mocked(requireManagementPermission).mockResolvedValue({ error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) });
    expect((await remove("employee")).status).toBe(403);
    expect(ban).not.toHaveBeenCalled();
  });
  it("does not report success when sign-in cannot be blocked", async () => {
    ban.mockResolvedValue({ error: { message: "Unavailable" } });
    expect((await remove("employee")).status).toBe(500);
    expect(update).not.toHaveBeenCalled();
  });
});
