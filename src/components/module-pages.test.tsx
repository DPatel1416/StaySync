import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModulePage } from "./module-pages";
import { getDepartmentNotifications } from "@/lib/notification-store";
import { MaintenanceDashboard } from "./dashboard/workspaces";
import { clearDemoEmployeeSession, saveDemoEmployeeSession } from "@/lib/demo-auth";
import { updateServiceRequest } from "@/lib/service-request-store";

describe("Service Request reminders", () => {
  it("lets Front Desk notify the assigned department again", () => {
    const before = getDepartmentNotifications().length;
    render(<ModulePage role="front-desk" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: "Notify Maintenance again about SR-1047" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Reminder sent to Maintenance for SR-1047");
    expect(getDepartmentNotifications()).toHaveLength(before + 1);
    expect(getDepartmentNotifications()[0]).toEqual(expect.objectContaining({ department: "Maintenance", serviceRequestId: "SR-1047" }));
  });

  it("does not show reminder actions outside Front Desk or on completed requests", () => {
    const frontDesk = render(<ModulePage role="front-desk" module="service-requests"/>);
    expect(screen.queryByRole("button", { name: /Notify Housekeeping again about SR-1045/ })).not.toBeInTheDocument();
    frontDesk.unmount();
    render(<ModulePage role="maintenance" module="service-requests"/>);
    expect(screen.queryByRole("button", { name: /Notify .* again about/ })).not.toBeInTheDocument();
  });

  it("delivers a Front Desk reminder to the assigned department dashboard", () => {
    const frontDesk = render(<ModulePage role="front-desk" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: "Notify Maintenance again about SR-1047" }));
    frontDesk.unmount();
    render(<MaintenanceDashboard/>);
    expect(screen.getByRole("heading", { name: "Front Desk reminders" })).toBeInTheDocument();
    expect(screen.getAllByText("Reminder: SR-1047").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Reminder: SR-1047/ }).some((link) => link.getAttribute("href") === "/app/maintenance/service-requests?request=SR-1047")).toBe(true);
  });
});

describe("Account settings", () => {
  it("opens personal account settings and saves profile changes", () => {
    render(<ModulePage role="front-desk" module="settings"/>);
    expect(screen.getByRole("heading", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("alex.morgan")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(screen.getByRole("status")).toHaveTextContent("Profile saved");
  });
});

describe("Operations Log conversations", () => {
  it("shows department entries and entries explicitly shared with Front Desk", () => {
    render(<ModulePage role="front-desk" module="operations-log"/>);
    expect(screen.getByText(/VIP group arriving at 3:00 PM/)).toBeInTheDocument();
    expect(screen.getByText(/Room 604 remains out of service/)).toBeInTheDocument();
    expect(screen.queryByText(/East elevator returned to service/)).not.toBeInTheDocument();
  });

  it("adds an inline reply to a log entry", () => {
    render(<ModulePage role="front-desk" module="operations-log"/>);
    fireEvent.click(screen.getAllByRole("button", { name: "Reply" })[0]);
    fireEvent.change(screen.getByLabelText("Reply message"), { target: { value: "Housekeeping has been notified." } });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    expect(screen.getByText("Housekeeping has been notified.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reply (1)" })).toBeInTheDocument();
  });

  it("attaches a file and shows its metadata on the entry", () => {
    render(<ModulePage role="front-desk" module="operations-log"/>);
    const input = screen.getAllByLabelText("Attachment")[0];
    const file = new File(["handoff"], "vip-handoff.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("vip-handoff.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Added by You/)).toBeInTheDocument();
  });

  it("allows Management to review internal logs from every department", () => {
    render(<ModulePage role="manager" module="operations-log"/>);
    expect(screen.getByText(/East elevator returned to service/)).toBeInTheDocument();
  });
});

describe("Late checkout communication", () => {
  it("publishes a Front Desk late checkout into Housekeeping room updates", () => {
    const frontDesk = render(<ModulePage role="front-desk" module="room-updates" create/>);
    fireEvent.change(screen.getByLabelText(/^Room number/), { target: { value: "825" } });
    fireEvent.change(screen.getByLabelText(/^Checkout date/), { target: { value: "2026-08-17" } });
    fireEvent.change(screen.getByLabelText(/^New checkout time/), { target: { value: "14:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Notify Housekeeping" }));
    expect(screen.getByText("825")).toBeInTheDocument();
    expect(screen.getByText(/Checkout changed from 11:00 AM to 2:00 PM/)).toBeInTheDocument();
    frontDesk.unmount();

    render(<ModulePage role="housekeeping" module="room-updates"/>);
    expect(screen.getByText("825")).toBeInTheDocument();
    expect(screen.getByLabelText("Housekeeping status for room 825")).toHaveValue("Housekeeping notified");
  });

  it("allows Housekeeping to update the operational status inline", () => {
    render(<ModulePage role="housekeeping" module="room-updates"/>);
    const status = screen.getByLabelText("Housekeeping status for room 412");
    fireEvent.change(status, { target: { value: "In Progress" } });
    expect(status).toHaveValue("In Progress");
  });
});

describe("Housekeeping room assignments", () => {
  it("allows a supervisor to assign several rooms in one action and view employee workloads", () => {
    saveDemoEmployeeSession("priya.shah");
    render(<ModulePage role="housekeeping" module="assigned-rooms"/>);
    expect(screen.getByText("Supervisor assignment access")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rooms"), { target: { value: "701-703, 710" } });
    fireEvent.change(screen.getByLabelText("Assign to"), { target: { value: "Elena Ruiz" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign rooms" }));
    expect(screen.getByRole("status")).toHaveTextContent("4 rooms assigned successfully");
    expect(screen.getByLabelText("Assigned employee for room 701")).toHaveValue("Elena Ruiz");
    expect(screen.getByLabelText("Assigned employee for room 518")).toHaveValue("Elena Ruiz");
    clearDemoEmployeeSession();
  });

  it("shows an attendant only rooms assigned to that employee", () => {
    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="assigned-rooms"/>);
    expect(screen.getByText("Personal assignment view")).toBeInTheDocument();
    expect(screen.getByText("518")).toBeInTheDocument();
    expect(screen.queryByText("307")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign rooms" })).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });
});

describe("Housekeeping service request routing", () => {
  it("shows the complete Housekeeping queue to the supervisor", () => {
    saveDemoEmployeeSession("priya.shah");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.getByText("SR-1048")).toBeInTheDocument();
    expect(screen.getByText("SR-1044")).toBeInTheDocument();
    expect(screen.queryByText("SR-1047")).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });

  it("shows a room attendant only requests assigned specifically to them", () => {
    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.getByText("SR-1044")).toBeInTheDocument();
    expect(screen.queryByText("SR-1048")).not.toBeInTheDocument();
    expect(screen.queryByText("SR-1047")).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });

  it("moves a queued request to the selected employee", () => {
    saveDemoEmployeeSession("priya.shah");
    const supervisor = render(<ModulePage role="housekeeping" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: /Open SR-1048/ }));
    fireEvent.change(screen.getByLabelText("Assigned Housekeeping employee"), { target: { value: "Elena Ruiz" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Assigned" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    supervisor.unmount();

    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.getByText("SR-1048")).toBeInTheDocument();

    act(() => updateServiceRequest({ id: "SR-1048", title: "Extra towels requested", location: "Room 718", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Standard", status: "Open", due: "10:30 AM" }));
    clearDemoEmployeeSession();
  });
});
