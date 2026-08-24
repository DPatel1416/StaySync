import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, describe, expect, it, vi } from "vitest";
import { ModulePage } from "./module-pages";
import { getDepartmentNotifications } from "@/lib/notification-store";
import { MaintenanceDashboard } from "./dashboard/workspaces";
import { clearDemoEmployeeSession, saveDemoEmployeeSession } from "@/lib/demo-auth";
import { addServiceRequest, deleteServiceRequest, updateServiceRequest } from "@/lib/service-request-store";
import { updateHousekeepingRoom } from "@/lib/housekeeping-room-store";
import { isRoomUpdateVisible } from "@/lib/room-update-store";
import { serviceRequests as demoServiceRequests } from "@/lib/demo-data";
import { updateWorkOrder } from "@/lib/work-order-store";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-23T10:00:00"));
});
afterAll(() => vi.useRealTimers());

describe("Service Request reminders", () => {
  it("notifies the Housekeeping supervisor when a new request is created", () => {
    const before = getDepartmentNotifications().filter((notification) => notification.department === "Housekeeping").length;
    render(<ModulePage role="front-desk" module="service-requests" create/>);
    fireEvent.change(screen.getByLabelText(/^Request title/), { target: { value: "Refresh room before arrival" } });
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: "Please refresh towels and amenities." } });
    fireEvent.change(screen.getByLabelText(/^Room or location/), { target: { value: "Room 722" } });
    fireEvent.change(screen.getByLabelText(/^Assign to department/), { target: { value: "Housekeeping" } });
    fireEvent.click(screen.getByRole("button", { name: "Create request" }));
    const housekeepingNotifications = getDepartmentNotifications().filter((notification) => notification.department === "Housekeeping");
    expect(housekeepingNotifications).toHaveLength(before + 1);
    expect(housekeepingNotifications[0]).toEqual(expect.objectContaining({ audience: "SUPERVISORS", title: expect.stringMatching(/^New service request:/) }));
    act(() => deleteServiceRequest(housekeepingNotifications[0].serviceRequestId));
  });

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
    expect(screen.getByRole("heading", { name: "Department notifications" })).toBeInTheDocument();
    expect(screen.getAllByText("Reminder: SR-1047").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Reminder: SR-1047/ }).some((link) => link.getAttribute("href") === "/app/maintenance/service-requests?request=SR-1047")).toBe(true);
  });
});

describe("Maintenance workflows", () => {
  it("shows Maintenance only requests assigned to Maintenance", () => {
    render(<ModulePage role="maintenance" module="service-requests"/>);
    expect(screen.getByText("SR-1047")).toBeInTheDocument();
    expect(screen.getByText("SR-1046")).toBeInTheDocument();
    expect(screen.queryByText("SR-1045")).not.toBeInTheDocument();
    expect(screen.queryByText("SR-1049")).not.toBeInTheDocument();
    expect(screen.getByText(/Requests sent to Maintenance by other departments/)).toBeInTheDocument();
  });

  it("uses a Maintenance-specific work order form", () => {
    render(<ModulePage role="maintenance" module="work-orders" create/>);
    expect(screen.getByRole("heading", { name: "Create work order" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Problem and required work/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Housekeeping is waiting for room clearance/)).toBeInTheDocument();
    expect(screen.getByText(/Maintenance’s internal job record/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: "Other" } });
    expect(screen.getByLabelText(/^Custom category/)).toBeInTheDocument();
  });

  it("notifies Housekeeping when Maintenance completes and releases a room", () => {
    const before = getDepartmentNotifications().filter((notification) => notification.kind === "ROOM_CLEARANCE").length;
    const maintenance = render(<ModulePage role="maintenance" module="work-orders" requestId="WO-284"/>);
    fireEvent.change(screen.getByLabelText("Work order status"), { target: { value: "Completed" } });
    fireEvent.click(screen.getByLabelText(/^Release Room 604 to Housekeeping/));
    fireEvent.change(screen.getByLabelText("Completion or progress notes"), { target: { value: "AC repaired and room safety check completed." } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("status")).toHaveTextContent("Room 604 released");
    const clearances = getDepartmentNotifications().filter((notification) => notification.kind === "ROOM_CLEARANCE");
    expect(clearances).toHaveLength(before + 1);
    expect(clearances[0]).toEqual(expect.objectContaining({ department: "Housekeeping", audience: "SUPERVISORS", href: "/app/housekeeping/assigned-rooms", title: "Room 604 cleared by Maintenance" }));
    maintenance.unmount();
    saveDemoEmployeeSession("sofia.martin");
    render(<ModulePage role="housekeeping" module="assigned-rooms"/>);
    expect(screen.getByText("Ready to assign")).toBeInTheDocument();
    const roomAssignee = screen.getByLabelText("Assigned employee for room 604");
    fireEvent.change(roomAssignee, { target: { value: "Priya Shah" } });
    const assignedRoom604 = screen.getByText("604").closest("article");
    expect(assignedRoom604).not.toBeNull();
    expect(within(assignedRoom604!).getByText("Assigned")).toBeInTheDocument();
    act(() => updateWorkOrder({ id: "WO-284", title: "AC not cooling", location: "Room 604", category: "HVAC", priority: "Urgent", status: "In Progress", assignee: "Jordan Lee", age: "52 min", requiresHousekeepingClearance: true }));
    act(() => updateHousekeepingRoom("604", { assignedTo: "Unassigned", status: "Waiting" }));
    clearDemoEmployeeSession();
  });

  it("routes incoming Maintenance requests through the supervisor before the technician", () => {
    saveDemoEmployeeSession("sam.rivera");
    const supervisor = render(<ModulePage role="maintenance" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: /Open SR-1046/ }));
    expect(screen.getByLabelText("Status")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Assigned Maintenance employee"), { target: { value: "Noah Wilson" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText(/SR-1046 assigned to Noah Wilson/)).toBeInTheDocument();
    supervisor.unmount();

    saveDemoEmployeeSession("noah.wilson");
    render(<ModulePage role="maintenance" module="service-requests"/>);
    expect(screen.getByText("SR-1046")).toBeInTheDocument();
    expect(screen.queryByText("SR-1047")).not.toBeInTheDocument();
    act(() => updateServiceRequest({ id: "SR-1046", title: "Meeting room temperature", location: "Maple Room", from: "Events", assigned: "Maintenance", assignedUser: "Unassigned", priority: "High", status: "Open", due: "11:00 AM" }));
    clearDemoEmployeeSession();
  });

  it("shows technicians only their assigned work orders", () => {
    saveDemoEmployeeSession("jordan.lee");
    render(<ModulePage role="maintenance" module="work-orders"/>);
    expect(screen.getByRole("heading", { name: "My Work Orders" })).toBeInTheDocument();
    expect(screen.getByText("WO-284")).toBeInTheDocument();
    expect(screen.queryByText("WO-283")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create work order" })).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });

  it("keeps completed work visible to its technician and the supervisor", () => {
    act(() => updateWorkOrder({ id: "WO-284", title: "AC not cooling", location: "Room 604", category: "HVAC", priority: "Urgent", status: "Completed", assignee: "Jordan Lee", age: "52 min", requiresHousekeepingClearance: true }));
    saveDemoEmployeeSession("jordan.lee");
    const technician = render(<ModulePage role="maintenance" module="work-orders"/>);
    expect(screen.getByRole("heading", { name: "Completed work orders" })).toBeInTheDocument();
    expect(screen.getByText("WO-284")).toBeInTheDocument();
    expect(screen.queryByText("WO-283")).not.toBeInTheDocument();
    expect(screen.queryByText(/Service Request vs. Work Order/)).not.toBeInTheDocument();
    technician.unmount();

    saveDemoEmployeeSession("sam.rivera");
    render(<ModulePage role="maintenance" module="work-orders"/>);
    expect(screen.getByText("WO-284")).toBeInTheDocument();
    expect(screen.getByText("WO-283")).toBeInTheDocument();
    act(() => updateWorkOrder({ id: "WO-284", title: "AC not cooling", location: "Room 604", category: "HVAC", priority: "Urgent", status: "In Progress", assignee: "Jordan Lee", age: "52 min", requiresHousekeepingClearance: true }));
    clearDemoEmployeeSession();
  });

  it("schedules preventive maintenance for rooms or hotel areas with a custom category", () => {
    saveDemoEmployeeSession("sam.rivera");
    const supervisor = render(<ModulePage role="maintenance" module="preventive"/>);
    fireEvent.click(screen.getByRole("button", { name: "Schedule maintenance" }));
    fireEvent.change(screen.getByLabelText(/^Maintenance task/), { target: { value: "Inspect balcony door hardware" } });
    fireEvent.change(screen.getByLabelText(/^Inspection or service checklist/), { target: { value: "Inspect lock, hinges, seal, and closing alignment." } });
    fireEvent.change(screen.getByLabelText(/^Room number/), { target: { value: "812" } });
    fireEvent.change(screen.getByLabelText(/^Category/), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText(/^Custom category/), { target: { value: "Doors and hardware" } });
    fireEvent.change(screen.getByLabelText(/^Next due date/), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText(/^Assigned technician/), { target: { value: "Jordan Lee" } });
    fireEvent.click(screen.getByRole("button", { name: "Add schedule" }));
    supervisor.unmount();

    saveDemoEmployeeSession("jordan.lee");
    render(<ModulePage role="maintenance" module="preventive"/>);
    expect(screen.getByText("Inspect balcony door hardware")).toBeInTheDocument();
    expect(screen.getByText(/Room 812 · Doors and hardware/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Schedule maintenance" })).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });

  it("provides annual exports and ranks repeat guest-room issues", () => {
    const createObjectUrl = vi.fn(() => "blob:maintenance-report");
    const revokeObjectUrl = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    render(<ModulePage role="maintenance" module="maintenance-reports"/>);
    expect(screen.getByRole("heading", { name: "Repeat room issues" })).toBeInTheDocument();
    expect(screen.getByText("Room 604")).toBeInTheDocument();
    expect(screen.getByLabelText("Maintenance report month")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Maintenance report month"), { target: { value: "6" } });
    expect(screen.queryByText("Room 604")).not.toBeInTheDocument();
    expect(screen.getByText(/No guest-room issues match all maintenance for July 2026/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Maintenance report month"), { target: { value: "7" } });
    expect(screen.getByText("Room 604")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Maintenance report type"), { target: { value: "Preventive Maintenance" } });
    expect(screen.queryByText("Room 604")).not.toBeInTheDocument();
    expect(screen.getByText(/No guest-room issues match preventive maintenance/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Maintenance report type"), { target: { value: "Service Requests" } });
    expect(screen.getByText("Room 604")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
    anchorClick.mockRestore();
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
    fireEvent.change(screen.getByLabelText(/^Checkout date/), { target: { value: "2099-08-17" } });
    fireEvent.change(screen.getByLabelText(/^New checkout time/), { target: { value: "14:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Notify Housekeeping" }));
    expect(screen.getByText("825")).toBeInTheDocument();
    expect(screen.getByText(/Checkout changed from 11:00 AM to 2:00 PM/)).toBeInTheDocument();
    frontDesk.unmount();

    render(<ModulePage role="housekeeping" module="room-updates"/>);
    expect(screen.getByText("825")).toBeInTheDocument();
    const lateCheckout = screen.getByText("825").closest("article");
    expect(lateCheckout).not.toBeNull();
    expect(within(lateCheckout!).getByText("Information only")).toBeInTheDocument();
    expect(screen.queryByLabelText("Housekeeping status for room 825")).not.toBeInTheDocument();
    expect(within(lateCheckout!).getByText(/Removed automatically at 6:00 PM/)).toBeInTheDocument();
  });

  it("keeps stayovers informational and allows other room changes to be updated", () => {
    render(<ModulePage role="housekeeping" module="room-updates"/>);
    const stayover = screen.getByText("307").closest("article");
    expect(stayover).not.toBeNull();
    expect(within(stayover!).getByText("Information only")).toBeInTheDocument();
    expect(within(stayover!).getByText(/Removed automatically at 6:00 PM/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Housekeeping status for room 307")).not.toBeInTheDocument();

    const earlyCheckout = screen.getByText("518").closest("article");
    expect(earlyCheckout).not.toBeNull();
    expect(within(earlyCheckout!).getByText("Information only")).toBeInTheDocument();
    expect(screen.queryByLabelText("Housekeeping status for room 518")).not.toBeInTheDocument();

    const status = screen.getByLabelText("Housekeeping status for room 604");
    fireEvent.change(status, { target: { value: "In Progress" } });
    expect(status).toHaveValue("In Progress");
  });

  it.each(["Late checkout", "Early checkout", "Extension · Stayover", "Extended stay"])("expires a %s precisely at 6 PM", (type) => {
    const expiresAt = new Date("2026-08-17T18:00:00").getTime();
    const update = { room: "412", type, detail: "Informational room change", time: "9:00 AM", state: "Information only", expiresAt };
    expect(isRoomUpdateVisible(update, new Date("2026-08-17T17:59:59").getTime())).toBe(true);
    expect(isRoomUpdateVisible(update, expiresAt)).toBe(false);
  });

  it("shows an attendant room updates only for personally assigned rooms", () => {
    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="room-updates"/>);
    expect(screen.getByText("518")).toBeInTheDocument();
    expect(screen.queryByText("307")).not.toBeInTheDocument();
    expect(screen.queryByText("412")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update room status" })).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });
});

describe("Housekeeping room assignments", () => {
  it("allows a supervisor to assign several rooms in one action and view employee workloads", () => {
    saveDemoEmployeeSession("sofia.martin");
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

  it("lets Priya progress only her rooms and lets the supervisor perform inspection", () => {
    saveDemoEmployeeSession("priya.shah");
    const attendant = render(<ModulePage role="housekeeping" module="assigned-rooms"/>);
    expect(screen.getByText("307")).toBeInTheDocument();
    expect(screen.getByText("308")).toBeInTheDocument();
    expect(screen.queryByText("518")).not.toBeInTheDocument();
    expect(screen.getByText("2 rooms assigned to you today")).toBeInTheDocument();
    expect(screen.queryByText(/142 guest rooms/)).not.toBeInTheDocument();
    const room307 = screen.getByText("307").closest("article");
    expect(room307).not.toBeNull();
    const startCleaning = within(room307!).getByRole("button", { name: "Start cleaning" });
    expect(startCleaning).toHaveClass("bg-amber-50", "text-amber-900");
    fireEvent.click(startCleaning);
    const notificationCount = getDepartmentNotifications().filter((notification) => notification.title === "Room 307 ready for inspection").length;
    fireEvent.click(within(room307!).getByRole("button", { name: "Ready for inspection" }));
    expect(within(room307!).getByText("Ready to inspect")).toBeInTheDocument();
    expect(getDepartmentNotifications().filter((notification) => notification.title === "Room 307 ready for inspection")).toHaveLength(notificationCount + 1);
    attendant.unmount();

    saveDemoEmployeeSession("sofia.martin");
    render(<ModulePage role="housekeeping" module="assigned-rooms"/>);
    const supervisorRoom307 = screen.getByText("307").closest("article");
    expect(supervisorRoom307).not.toBeNull();
    fireEvent.click(within(supervisorRoom307!).getByRole("button", { name: "Mark inspected" }));
    expect(within(supervisorRoom307!).getByText("Inspected")).toBeInTheDocument();
    act(() => updateHousekeepingRoom("307", { status: "Assigned" }));
    clearDemoEmployeeSession();
  });
});

describe("Housekeeping service request routing", () => {
  it("shows the complete Housekeeping queue to the supervisor", () => {
    saveDemoEmployeeSession("sofia.martin");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.getByText("SR-1048")).toBeInTheDocument();
    expect(screen.getByText("SR-1044")).toBeInTheDocument();
    expect(screen.queryByText("SR-1047")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Employee-reported room issues" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Department service requests" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completed" })).toBeInTheDocument();
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
    saveDemoEmployeeSession("sofia.martin");
    const supervisor = render(<ModulePage role="housekeeping" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: /Open SR-1048/ }));
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.getByText("Status is updated by the assigned employee.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assigned Housekeeping employee"), { target: { value: "Elena Ruiz" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText(/SR-1048 assigned to Elena Ruiz/)).toBeInTheDocument();
    const persistedRequests = JSON.parse(window.localStorage.getItem("staysync-service-requests") ?? "[]") as Array<{ id: string; assignedUser?: string; status: string }>;
    expect(persistedRequests.find((request) => request.id === "SR-1048")).toEqual(expect.objectContaining({ assignedUser: "Elena Ruiz", status: "Assigned", due: "10:30 AM" }));
    supervisor.unmount();

    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.getByText("SR-1048")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open SR-1048/ }));
    expect(screen.getByLabelText("Status")).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "In Progress" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("In Progress")).toBeInTheDocument();

    act(() => updateServiceRequest({ id: "SR-1048", title: "Extra towels requested", location: "Room 718", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Standard", status: "Open", due: "10:30 AM" }));
    clearDemoEmployeeSession();
  });

  it("moves finished requests into the completed section", () => {
    saveDemoEmployeeSession("elena.ruiz");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    fireEvent.click(screen.getByRole("button", { name: /Open SR-1044/ }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Completed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByRole("link", { name: /SR-1044 · Remove used room-service tray/ })).toBeInTheDocument();
    act(() => updateServiceRequest({ id: "SR-1044", title: "Remove used room-service tray", location: "Room 526", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Elena Ruiz", priority: "Standard", status: "Assigned", due: "12:00 PM" }));
    clearDemoEmployeeSession();
  });

  it("shows historical requests when the date changes", () => {
    const createdAt = new Date("2026-08-20T10:00:00").getTime();
    addServiceRequest({ id: "SR-HISTORY", title: "Historical linen request", location: "Room 225", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Standard", status: "Open", due: "11:00 AM", createdAt });
    saveDemoEmployeeSession("sofia.martin");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    expect(screen.queryByText("SR-HISTORY")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Request date"), { target: { value: "2026-08-20" } });
    expect(screen.getByText("SR-HISTORY")).toBeInTheDocument();
    act(() => deleteServiceRequest("SR-HISTORY"));
    clearDemoEmployeeSession();
  });

  it("receives service request changes from another tab without refreshing", () => {
    saveDemoEmployeeSession("sofia.martin");
    render(<ModulePage role="housekeeping" module="service-requests"/>);
    const liveRequest = { id: "SR-LIVE", title: "Live towel delivery", location: "Room 410", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Important", status: "Open", due: "Now", createdAt: Date.now() };
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "staysync-service-requests", newValue: JSON.stringify([liveRequest, ...demoServiceRequests]) })));
    expect(screen.getByText("SR-LIVE")).toBeInTheDocument();
    act(() => deleteServiceRequest("SR-LIVE"));
    clearDemoEmployeeSession();
  });
});
