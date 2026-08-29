import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncidentEditor, LostFoundEditor, OperationLogEditor, ServiceRequestEditor } from "./record-update-dialogs";

describe("Front Desk record updates", () => {
  it("allows Front Desk to change the status of a request assigned to Front Desk", () => {
    const onSave = vi.fn();
    render(<ServiceRequestEditor request={{ id: "SR-1049", title: "Guest follow-up", location: "Room 604", from: "Management", assigned: "Front Desk", priority: "High", status: "Assigned", due: "11:30 AM" }} onClose={vi.fn()} onSave={onSave}/>);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "In Progress" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: "In Progress", assigned: "Front Desk" }));
  });

  it("keeps another department's request read-only", () => {
    render(<ServiceRequestEditor request={{ id: "SR-1046", title: "Meeting room temperature", location: "Maple Room", from: "Events", assigned: "Maintenance", priority: "High", status: "Open", due: "11:00 AM" }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.getByText(/read-only for your department/i)).toBeInTheDocument();
  });

  it("allows Maintenance to update a request assigned to Maintenance", () => {
    render(<ServiceRequestEditor currentDepartment="Maintenance" request={{ id: "SR-1047", title: "Air conditioning not cooling", location: "Room 604", from: "Front Desk", assigned: "Maintenance", priority: "Urgent", status: "In Progress", due: "Overdue" }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Status")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("does not let Front Desk update an incident assigned to Management", () => {
    render(<IncidentEditor currentDepartment="Front Desk" record={{ title: "INC-209 · Guest relocation", detail: "Room 604 · Assigned to Management", status: "Awaiting review", tone: "warning" }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("lets Front Desk update an incident assigned to Front Desk", () => {
    render(<IncidentEditor currentDepartment="Front Desk" record={{ title: "INC-210 · Guest follow-up", detail: "Room 412 · Assigned to Front Desk", status: "Open", tone: "info" }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Status")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("allows an author to edit their Operations Log entry", () => {
    render(<OperationLogEditor currentUserName="Current employee" log={{ id: "log-2", author: "Current employee", department: "Front Desk", time: "Just now", message: "Original update", priority: "Urgent", pinned: false, createdAt: Date.now() }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Update")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("keeps another author's Operations Log entry read-only", () => {
    render(<OperationLogEditor currentUserName="Current employee" log={{ id: "log-2", author: "Another employee", department: "Front Desk", time: "8:18 AM", message: "Original update", priority: "Urgent", pinned: false }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByLabelText("Update")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("allows the author to delete a newly posted record after confirmation", () => {
    const onDelete = vi.fn();
    render(<OperationLogEditor currentUserName="Current employee" log={{ id: "log-new", author: "Current employee", department: "Front Desk", sharedWith: [], time: "Just now", message: "New update", priority: "Standard", pinned: false, createdAt: Date.now() }} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete}/>);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("locks editing and deletion after the fifteen-minute author window", () => {
    render(<OperationLogEditor currentUserName="Current employee" log={{ id: "log-old", author: "Current employee", department: "Front Desk", sharedWith: [], time: "Earlier", message: "Old update", priority: "Standard", pinned: false, createdAt: Date.now() - 16 * 60 * 1000 }} onClose={vi.fn()} onSave={vi.fn()} onDelete={vi.fn()}/>);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Update")).toBeDisabled();
  });

  it("provides Lost & Found lifecycle statuses", () => {
    render(<LostFoundEditor record={{ title: "Black wallet", detail: "Found in Maple Room · Stored in safe B-12", status: "Guest contacted", tone: "info" }} onClose={vi.fn()} onSave={vi.fn()}/>);
    expect(screen.getByRole("option", { name: "Pickup arranged" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Returned to guest" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Disposed per policy" })).toBeInTheDocument();
  });
});
