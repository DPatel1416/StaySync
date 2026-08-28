import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { FoodBeverageDashboard, FrontDeskDashboard, HousekeepingDashboard, MaintenanceDashboard } from "./workspaces";
import { updateServiceRequest } from "@/lib/service-request-store";
import { clearDemoEmployeeSession, saveDemoEmployeeSession } from "@/lib/demo-auth";
import { getDepartmentNotifications } from "@/lib/notification-store";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-23T10:00:00"));
});
afterAll(() => vi.useRealTimers());

afterEach(() => clearDemoEmployeeSession());

describe("Food & Beverage dashboard", () => {
  it("offers only Operations Log and Incident Report actions", () => {
    render(<FoodBeverageDashboard/>);
    expect(screen.getByRole("link", { name: /Add Operations Log/ })).toHaveAttribute("href", "/app/food-beverage/operations-log?create=1");
    expect(screen.getByRole("link", { name: /Report Incident/ })).toHaveAttribute("href", "/app/food-beverage/incidents?create=1");
    expect(screen.queryByText("Service Requests")).not.toBeInTheDocument();
    expect(screen.queryByText("Work Orders")).not.toBeInTheDocument();
  });
});

describe("dynamic room-change summaries", () => {
  it("groups late checkouts by time and counts stayovers on Front Desk", () => {
    render(<FrontDeskDashboard/>);
    expect(screen.getByRole("heading", { name: "Today’s room changes" })).toBeInTheDocument();
    expect(screen.getByLabelText("1 late checkout")).toBeInTheDocument();
    expect(screen.getByLabelText("1 early checkout")).toBeInTheDocument();
    expect(screen.getByText(/at 1:00 PM/)).toBeInTheDocument();
    expect(screen.getByLabelText("1 stayover room")).toBeInTheDocument();
    expect(screen.queryByText("Checkout changed from 11:00 AM to 1:00 PM.")).not.toBeInTheDocument();
  });

  it("shows the same live counts on Housekeeping", () => {
    render(<HousekeepingDashboard/>);
    expect(screen.getByLabelText("1 late checkout")).toBeInTheDocument();
    expect(screen.getByLabelText("1 early checkout")).toBeInTheDocument();
    expect(screen.getByLabelText("1 stayover room")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status for room 307")).not.toBeInTheDocument();
    expect(screen.queryByText("Guest extended one night. Change departure clean to stayover service.")).not.toBeInTheDocument();
  });

  it("gives an attendant a personal dashboard with only assigned room changes", () => {
    saveDemoEmployeeSession("elena.ruiz");
    render(<HousekeepingDashboard/>);
    expect(screen.getByRole("heading", { name: "Good morning, Elena Ruiz" })).toBeInTheDocument();
    expect(screen.getByLabelText("1 room assigned to you")).toBeInTheDocument();
    expect(screen.getByLabelText("38 departures expected hotel-wide")).toBeInTheDocument();
    expect(screen.getByText("Room 518 · Early checkout")).toBeInTheDocument();
    expect(screen.queryByText("Room 412 · Late checkout")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Housekeeping quality score 91 percent")).toBeInTheDocument();
    expect(screen.getByText("Down 2 from previous")).toBeInTheDocument();
    expect(screen.queryByText("Request Support")).not.toBeInTheDocument();
    clearDemoEmployeeSession();
  });

  it("shows an attendant every informational change affecting their assigned rooms", () => {
    saveDemoEmployeeSession("priya.shah");
    render(<HousekeepingDashboard/>);
    expect(screen.getByText("Room 307 · Extension · Stayover")).toBeInTheDocument();
    expect(screen.queryByText("Room 518 · Early checkout")).not.toBeInTheDocument();
    expect(screen.queryByText("Room 412 · Late checkout")).not.toBeInTheDocument();
  });

  it("sends room issues only to Housekeeping supervisors", async () => {
    saveDemoEmployeeSession("priya.shah");
    render(<HousekeepingDashboard/>);
    fireEvent.click(screen.getByRole("button", { name: "Report room issue" }));
    fireEvent.change(screen.getByLabelText(/^Room number/), { target: { value: "307" } });
    fireEvent.change(screen.getByLabelText(/^Issue type/), { target: { value: "Linen or bedding" } });
    fireEvent.change(screen.getByLabelText(/^What did you find/), { target: { value: "Duvet cover is torn and needs replacement." } });
    fireEvent.click(screen.getByRole("button", { name: "Send to supervisor" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Room issue sent to your supervisor"));
  });

  it("sends a location-aware SOS directly to the supervisor and removes it once acknowledged", async () => {
    saveDemoEmployeeSession("priya.shah");
    const beforeRequests = window.localStorage.getItem("staysync-service-requests");
    const attendantView = render(<HousekeepingDashboard/>);
    fireEvent.click(screen.getByRole("button", { name: /Emergency SOS/ }));
    fireEvent.change(screen.getByLabelText(/^Current room or location/), { target: { value: "Room 307" } });
    fireEvent.change(screen.getByLabelText(/^What help do you need/), { target: { value: "Need immediate supervisor assistance." } });
    fireEvent.click(screen.getByRole("button", { name: "Send SOS" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("status")).toHaveTextContent("Emergency SOS sent from Room 307");
    expect(window.localStorage.getItem("staysync-service-requests")).toBe(beforeRequests);

    attendantView.unmount();
    saveDemoEmployeeSession("sofia.martin");
    render(<HousekeepingDashboard/>);
    expect(screen.getByText("Priya Shah needs help")).toBeInTheDocument();
    expect(screen.getByText("SOS at Room 307. Need immediate supervisor assistance.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge SOS from Priya Shah" }));
    expect(screen.queryByText("Priya Shah needs help")).not.toBeInTheDocument();
    expect(getDepartmentNotifications().find((notification) => notification.kind === "SOS" && notification.createdBy === "Priya Shah")?.readAt).toBeDefined();
  });

  it("shows Housekeeping quality score in the dashboard heading", () => {
    render(<HousekeepingDashboard/>);
    expect(screen.getByLabelText("Housekeeping quality score 91 percent")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Service Requests" })).toHaveAttribute("href", "/app/housekeeping/service-requests");
    expect(screen.getByRole("link", { name: "Reported Room Issues" })).toHaveAttribute("href", "/app/housekeeping/service-requests#reported-room-issues");
  });

  it("limits the Housekeeping log preview to its own and explicitly shared entries", () => {
    render(<HousekeepingDashboard/>);
    expect(screen.getByText(/VIP group arriving at 3:00 PM/)).toBeInTheDocument();
    expect(screen.queryByText(/Room 604 remains out of service/)).not.toBeInTheDocument();
    expect(screen.queryByText(/East elevator returned to service/)).not.toBeInTheDocument();
  });

  it("limits the Maintenance log preview to its own and explicitly shared entries", () => {
    render(<MaintenanceDashboard/>);
    expect(screen.getByText(/Room 604 remains out of service/)).toBeInTheDocument();
    expect(screen.getByText(/East elevator returned to service/)).toBeInTheDocument();
    expect(screen.queryByText(/VIP group arriving at 3:00 PM/)).not.toBeInTheDocument();
  });

  it("sends Maintenance SOS and support notifications directly to the supervisor without creating records", () => {
    saveDemoEmployeeSession("jordan.lee");
    const beforeRequests = window.localStorage.getItem("staysync-service-requests");
    const technician = render(<MaintenanceDashboard/>);
    expect(screen.queryByText("Report Completion")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Emergency SOS" }));
    fireEvent.change(screen.getByLabelText(/^Current room or location/), { target: { value: "Room 604" } });
    fireEvent.change(screen.getByLabelText(/^What help do you need/), { target: { value: "Need help isolating electrical power." } });
    fireEvent.click(screen.getByRole("button", { name: "Send SOS" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("status")).toHaveTextContent("Emergency SOS sent from Room 604");

    fireEvent.click(screen.getByRole("button", { name: "Request Support" }));
    fireEvent.change(screen.getByLabelText(/^Current room or location/), { target: { value: "Pool mechanical room" } });
    fireEvent.change(screen.getByLabelText(/^What help do you need/), { target: { value: "Please assist with the pump inspection." } });
    fireEvent.click(screen.getByRole("button", { name: "Notify supervisor" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("status")).toHaveTextContent("Support request sent from Pool mechanical room");
    expect(window.localStorage.getItem("staysync-service-requests")).toBe(beforeRequests);
    technician.unmount();

    saveDemoEmployeeSession("sam.rivera");
    render(<MaintenanceDashboard/>);
    expect(screen.getByText("Jordan Lee needs emergency help")).toBeInTheDocument();
    expect(screen.getByText("Jordan Lee requested support")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge SOS from Jordan Lee" }));
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge support request from Jordan Lee" }));
    expect(screen.queryByText("Jordan Lee needs emergency help")).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee requested support")).not.toBeInTheDocument();
  });

  it("shows a technician only their personal work summary", () => {
    saveDemoEmployeeSession("jordan.lee");
    render(<MaintenanceDashboard/>);
    expect(screen.getByRole("heading", { name: "My work summary" })).toBeInTheDocument();
    expect(screen.getByText("Only work assigned to you")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Department workload" })).not.toBeInTheDocument();
    expect(screen.queryByText("Recurring room issues")).not.toBeInTheDocument();
  });

  it("limits Front Desk attention items to work assigned to Front Desk", () => {
    render(<FrontDeskDashboard/>);
    expect(screen.getByText("Live work currently assigned to Front Desk")).toBeInTheDocument();
    expect(screen.getByText(/SR-1049 · Confirm guest relocation follow-up/)).toBeInTheDocument();
    expect(screen.queryByText(/Meeting room temperature/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SR-1049/ })).toHaveAttribute("href", "/app/front-desk/service-requests?request=SR-1049");
  });

  it("links open items created by Front Desk to their live request records", () => {
    render(<FrontDeskDashboard/>);
    expect(screen.getByText("Live status of requests you created")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SR-1047/ })).toHaveAttribute("href", "/app/front-desk/service-requests?request=SR-1047");
    expect(screen.queryByText(/SR-1045 · Crib delivery/)).not.toBeInTheDocument();
  });

  it("removes a created item when the assigned department completes it", () => {
    const request = { id: "SR-1047", title: "Air conditioning not cooling", location: "Room 604", from: "Front Desk", assigned: "Maintenance", priority: "Urgent", status: "In Progress", due: "Overdue" };
    render(<FrontDeskDashboard/>);
    expect(screen.getByRole("link", { name: /SR-1047/ })).toBeInTheDocument();
    act(() => updateServiceRequest({ ...request, status: "Completed", due: "Completed" }));
    expect(screen.queryByRole("link", { name: /SR-1047/ })).not.toBeInTheDocument();
    act(() => updateServiceRequest(request));
  });
});
