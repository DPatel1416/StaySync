import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModulePage } from "./module-pages";

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
    expect(screen.getByText("Housekeeping notified")).toBeInTheDocument();
  });
});
