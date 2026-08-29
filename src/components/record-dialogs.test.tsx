import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncidentDialog, LateCheckoutDialog, LostFoundDialog, ManagementIncidentDialog, OperationLogDialog, PreventiveMaintenanceDialog, QualityScoreDialog, ServiceRequestDialog } from "./record-dialogs";
import { localDateInputValue } from "@/lib/date-input-values";

describe("Front Desk creation workflows", () => {
  it("keeps Operations Log departmental and makes cross-department sharing optional", () => {
    render(<OperationLogDialog defaultOpen onCreate={vi.fn()}/>);
    const visibility = screen.getByLabelText(/^Share with another department/);
    const priority = screen.getByLabelText(/^Priority/);
    expect(visibility.tagName).toBe("SELECT");
    expect(priority.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Department only" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Maintenance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Housekeeping" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Kitchen" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Food & Beverage" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Management" })).toBeInTheDocument();
  });

  it("assigns service requests to a department", () => {
    render(<ServiceRequestDialog defaultOpen onCreate={vi.fn()}/>);
    expect(screen.getByLabelText("Assign to department *").tagName).toBe("SELECT");
    expect(screen.queryByText(/assigned employee/i)).not.toBeInTheDocument();
  });

  it("routes incidents to a department", () => {
    render(<IncidentDialog defaultOpen onCreate={vi.fn()}/>);
    expect(screen.getByLabelText("Assign to department *").tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Management" })).toBeInTheDocument();
  });

  it("asks for secure storage details instead of priority or assignment in Lost & Found", () => {
    render(<LostFoundDialog defaultOpen onCreate={vi.fn()}/>);
    expect(screen.getByLabelText("Guest room number")).toBeInTheDocument();
    expect(screen.getByLabelText("Found date and time *")).toBeInTheDocument();
    expect(screen.getByLabelText("Storage location *")).toBeInTheDocument();
    expect(screen.getByLabelText("Guest follow-up status *")).toBeInTheDocument();
    expect(screen.queryByLabelText(/priority/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assign/i)).not.toBeInTheDocument();
  });

  it("routes late checkouts to Housekeeping without priority or assignment", () => {
    render(<LateCheckoutDialog defaultOpen onCreate={vi.fn()}/>);
    expect(screen.getByText(/automatically visible to Housekeeping/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Room number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New checkout time/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/priority/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assign/i)).not.toBeInTheDocument();
  });

  it("prefills required operational dates with today's local date", () => {
    const today = localDateInputValue();
    const lostFound = render(<LostFoundDialog defaultOpen onCreate={vi.fn()}/>);
    expect((screen.getByLabelText("Found date and time *") as HTMLInputElement).value.slice(0, 10)).toBe(today);
    lostFound.unmount();

    const checkout = render(<LateCheckoutDialog defaultOpen onCreate={vi.fn()}/>);
    expect(screen.getByLabelText("Checkout date *")).toHaveValue(today);
    checkout.unmount();

    const preventive = render(<PreventiveMaintenanceDialog onCreate={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Schedule maintenance" }));
    expect(screen.getByLabelText("Next due date *")).toHaveValue(today);
    preventive.unmount();

    const incident = render(<ManagementIncidentDialog defaultOpen properties={["Test Property"]} onCreate={vi.fn()}/>);
    expect((screen.getByLabelText("Date and time occurred *") as HTMLInputElement).value.slice(0, 10)).toBe(today);
    incident.unmount();

    render(<QualityScoreDialog properties={["Test Property"]} onCreate={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", { name: "Add quality score" }));
    expect(screen.getByLabelText("Review date *")).toHaveValue(today);
  });
});
