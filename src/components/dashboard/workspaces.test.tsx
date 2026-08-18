import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrontDeskDashboard, HousekeepingDashboard } from "./workspaces";

describe("dashboard late checkout previews", () => {
  it("shows a compact late checkout preview on Front Desk", () => {
    render(<FrontDeskDashboard/>);
    expect(screen.getByRole("heading", { name: "Late checkouts" })).toBeInTheDocument();
    expect(screen.getByText("Room 412")).toBeInTheDocument();
    expect(screen.getByText("11:00 AM → 1:00 PM")).toBeInTheDocument();
    expect(screen.queryByText("Checkout changed from 11:00 AM to 1:00 PM.")).not.toBeInTheDocument();
  });

  it("shows the same compact late checkout preview on Housekeeping", () => {
    render(<HousekeepingDashboard/>);
    expect(screen.getByRole("heading", { name: "Late checkouts" })).toBeInTheDocument();
    expect(screen.getByText("Room 412")).toBeInTheDocument();
    expect(screen.getByText("11:00 AM → 1:00 PM")).toBeInTheDocument();
  });
});
