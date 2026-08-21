import { describe, expect, it } from "vitest";
import { authenticateDemoEmployee } from "./demo-auth";

describe("demo employee authentication", () => {
  it("routes Housekeeping credentials to Housekeeping", () => {
    expect(authenticateDemoEmployee("priya.shah", "staysync-demo")?.workspace).toBe("housekeeping");
    expect(authenticateDemoEmployee("sofia.martin", "staysync-demo")?.isSupervisor).toBe(true);
    expect(authenticateDemoEmployee("priya.shah", "staysync-demo")?.isSupervisor).not.toBe(true);
    expect(authenticateDemoEmployee("elena.ruiz", "staysync-demo")?.isSupervisor).not.toBe(true);
  });

  it("routes Maintenance credentials to Maintenance", () => {
    expect(authenticateDemoEmployee("jordan.lee", "staysync-demo")?.workspace).toBe("maintenance");
  });

  it("rejects an incorrect password", () => {
    expect(authenticateDemoEmployee("jordan.lee", "wrong-password")).toBeNull();
  });
});
