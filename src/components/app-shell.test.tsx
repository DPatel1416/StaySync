import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { clearDemoEmployeeSession, saveDemoEmployeeSession } from "@/lib/demo-auth";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/front-desk" }));

describe("property selector", () => {
  it("shows the dropdown affordance and single assigned property state", () => {
    render(<AppShell role="front-desk"><div>Dashboard</div></AppShell>);
    expect(screen.getByTestId("staysync-mark")).toHaveClass("bg-[#caff4d]");
    const selector = screen.getByRole("button", { name: /Current property: Ottawa Downtown/ });
    expect(selector).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(selector);
    expect(selector).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("This is the only property assigned to your account.")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Ottawa Downtown" })).toHaveAttribute("aria-checked", "true");
  });

  it("applies the current department theme to the complete workspace", () => {
    render(<AppShell role="housekeeping"><div>Housekeeping dashboard content</div></AppShell>);
    expect(screen.getByText("Housekeeping dashboard content").closest("[data-department-theme]")).toHaveAttribute("data-department-theme", "housekeeping");
    expect(screen.getByRole("button", { name: /Current property: Ottawa Downtown/ }).parentElement).toHaveClass("border-brand-border", "bg-brand-soft");
  });

  it("hides Room Updates from Housekeeping attendants", () => {
    saveDemoEmployeeSession("priya.shah");
    render(<AppShell role="housekeeping"><div>Attendant dashboard</div></AppShell>);
    expect(screen.queryByRole("link", { name: "Room Updates" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Assigned Rooms" }).length).toBeGreaterThan(0);
    clearDemoEmployeeSession();
  });

  it("keeps annual Maintenance reports in the supervisor workspace", () => {
    saveDemoEmployeeSession("jordan.lee");
    const technician = render(<AppShell role="maintenance"><div>Technician dashboard</div></AppShell>);
    expect(screen.queryByRole("link", { name: "Maintenance Reports" })).not.toBeInTheDocument();
    technician.unmount();
    clearDemoEmployeeSession();
    render(<AppShell role="maintenance"><div>Supervisor dashboard</div></AppShell>);
    expect(screen.getAllByRole("link", { name: "Maintenance Reports" }).length).toBeGreaterThan(0);
  });

  it("shows Food & Beverage only its two operational modules", () => {
    render(<AppShell role="food-beverage"><div>Food and Beverage dashboard</div></AppShell>);
    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(navigation).getByRole("link", { name: "Operations Log" })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Incident Reports" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "Service Requests" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "Reports" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "People" })).not.toBeInTheDocument();
  });
});
