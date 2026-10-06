// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getAuthenticatedViewer, type AuthenticatedViewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/auth/viewer", () => ({ getAuthenticatedViewer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/employee-management", () => ({ departmentCodeFromWorkspace: () => "MANAGEMENT" }));

const viewer = {
  id: "owner", organizationId: "org", workspace: "manager", accountKind: "ACCOUNT_HOLDER",
  activePropertyId: "b", permissions: ["CREATE_OPERATION_LOG"],
  properties: [{ id: "a", name: "Same name", isDefault: true }, { id: "b", name: "Same name", isDefault: false }],
} as AuthenticatedViewer;

describe("property-specific operations", () => {
  const inserted: Record<string, unknown>[] = [];
  beforeEach(() => {
    inserted.length = 0;
    vi.mocked(getAuthenticatedViewer).mockResolvedValue(viewer);
    const from = (table: string) => {
      let rows: Record<string, unknown>[] = ["a", "b", "other"].map((property) => ({
        id: property, property_id: property, organization_id: "org", user_id: "owner",
        content: `Message ${property}`, body: `Alert ${property}`, priority: "STANDARD",
        created_at: "2026-10-06T12:00:00Z", author_id: "owner", archived_at: null,
      }));
      if (table === "users" || table === "departments") rows = [];
      const query = {
        select: () => query, order: () => query,
        eq: (key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; },
        in: (key: string, values: unknown[]) => { rows = rows.filter((row) => values.includes(row[key])); return query; },
        is: (key: string, value: unknown) => { rows = rows.filter((row) => row[key] === value); return query; },
        insert: (value: Record<string, unknown>) => { inserted.push(value); return query; },
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: "b" }, error: null }),
        then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return query;
    };
    vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
  });

  it.each(["operation-logs", "notifications"])("returns only the selected property's %s", async (resource) => {
    const response = await GET(new Request(`https://example.com/api/operations?resource=${resource}`));
    expect(response.status).toBe(200);
    expect((await response.json()).records.map((row: { id: string }) => row.id)).toEqual(["b"]);
    vi.mocked(getAuthenticatedViewer).mockResolvedValue({ ...viewer, activePropertyId: "a" });
    const switched = await GET(new Request(`https://example.com/api/operations?resource=${resource}`));
    expect((await switched.json()).records.map((row: { id: string }) => row.id)).toEqual(["a"]);
  });

  it("creates messages in the selected property", async () => {
    const response = await POST(new Request("https://example.com/api/operations?resource=operation-logs", {
      method: "POST", body: JSON.stringify({ record: { message: "New update" } }),
    }));
    expect(response.status).toBe(201);
    expect(inserted[0]).toMatchObject({ property_id: "b", organization_id: "org", content: "New update" });
  });

  it("does not insert into unauthorized properties", async () => {
    const response = await POST(new Request("https://example.com/api/operations?resource=operation-logs", {
      method: "POST", body: JSON.stringify({ record: { message: "Update", propertyId: "other" } }),
    }));
    expect(response.ok).toBe(false);
    expect(inserted).toEqual([]);
  });
});
