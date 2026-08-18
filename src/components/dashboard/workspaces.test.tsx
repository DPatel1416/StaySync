import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrontDeskDashboard, HousekeepingDashboard } from "./workspaces";
import { updateServiceRequest } from "@/lib/service-request-store";

describe("dynamic room-change summaries", () => {
  it("groups late checkouts by time and counts stayovers on Front Desk", () => {
    render(<FrontDeskDashboard/>);
    expect(screen.getByRole("heading", { name: "Today’s room changes" })).toBeInTheDocument();
    expect(screen.getByLabelText("1 late checkout")).toBeInTheDocument();
    expect(screen.getByText(/at 1:00 PM/)).toBeInTheDocument();
    expect(screen.getByLabelText("1 stayover room")).toBeInTheDocument();
    expect(screen.queryByText("Checkout changed from 11:00 AM to 1:00 PM.")).not.toBeInTheDocument();
  });

  it("shows the same live counts on Housekeeping", () => {
    render(<HousekeepingDashboard/>);
    expect(screen.getByLabelText("1 late checkout")).toBeInTheDocument();
    expect(screen.getByLabelText("1 stayover room")).toBeInTheDocument();
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
