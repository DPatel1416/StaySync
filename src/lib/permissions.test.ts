import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("permission model", () => {
  it("allows Front Desk to create service requests", () => expect(can("front-desk", "CREATE_SERVICE_REQUEST")).toBe(true));
  it("does not expose property management to department employees", () => expect(can("housekeeping", "MANAGE_PROPERTIES")).toBe(false));
  it("allows managers to manage quality scores", () => expect(can("manager", "MANAGE_DEPARTMENT_SCORE")).toBe(true));
  it("allows Maintenance to manage work orders", () => expect(can("maintenance", "CREATE_WORK_ORDER")).toBe(true));
  it("limits Food & Beverage to logs and incident reporting", () => {
    expect(can("food-beverage", "CREATE_OPERATION_LOG")).toBe(true);
    expect(can("food-beverage", "CREATE_INCIDENT")).toBe(true);
    expect(can("food-beverage", "VIEW_INCIDENT")).toBe(true);
    expect(can("food-beverage", "VIEW_SERVICE_REQUEST")).toBe(false);
    expect(can("food-beverage", "VIEW_REPORTS")).toBe(false);
    expect(can("food-beverage", "MANAGE_USERS")).toBe(false);
  });
});
