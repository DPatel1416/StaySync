import { describe, expect, it } from "vitest";
import { selectAuthorizedProperty } from "./property-scope";

describe("authorized property selection", () => {
  const properties = [{ id: "a", name: "Hotel" }, { id: "b", name: "Hotel" }];
  it("selects by ID even when names match", () => {
    expect(selectAuthorizedProperty(properties, "b")?.id).toBe("b");
  });
  it("falls back safely for a stale or tampered selection", () => {
    expect(selectAuthorizedProperty(properties, "unauthorized")?.id).toBe("a");
    expect(selectAuthorizedProperty([], "unauthorized")).toBeUndefined();
  });
  it("rejects an explicit unauthorized write target", () => {
    expect(() => selectAuthorizedProperty(properties, "b", "unauthorized")).toThrow();
  });
});
