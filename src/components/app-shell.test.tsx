import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/front-desk" }));

describe("property selector", () => {
  it("shows the dropdown affordance and single assigned property state", () => {
    render(<AppShell role="front-desk"><div>Dashboard</div></AppShell>);
    expect(screen.getByTestId("staysync-mark")).toHaveClass("bg-[#0284c7]");
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
});
