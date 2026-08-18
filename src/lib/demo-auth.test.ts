import { describe, expect, it } from "vitest";
import { authenticateDemoEmployee } from "./demo-auth";

describe("demo employee authentication", () => {
  it("routes Housekeeping credentials to Housekeeping", () => {
    expect(authenticateDemoEmployee("priya.shah", "staysync-demo")?.workspace).toBe("housekeeping");
  });

  it("routes Maintenance credentials to Maintenance", () => {
    expect(authenticateDemoEmployee("jordan.lee", "staysync-demo")?.workspace).toBe("maintenance");
  });

  it("rejects an incorrect password", () => {
    expect(authenticateDemoEmployee("jordan.lee", "wrong-password")).toBeNull();
  });
});
