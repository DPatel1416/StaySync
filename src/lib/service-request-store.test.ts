import { expect, it } from "vitest";
import { getServiceRequests } from "./service-request-store";

it("migrates legacy SOS tasks out of service requests", () => {
  window.localStorage.setItem("staysync-service-requests", JSON.stringify([
    { id: "SOS-1720000000000", title: "Emergency assistance requested", location: "Current assigned area", from: "Housekeeping", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Urgent", status: "Open", due: "Immediate" },
    { id: "HK-1720000000001", title: "Linen or bedding", location: "Room 307", from: "Housekeeping", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Important", status: "Open", due: "Today" },
  ]));

  expect(getServiceRequests().map((request) => request.id)).toEqual(["HK-1720000000001"]);
  expect(JSON.parse(window.localStorage.getItem("staysync-service-requests") ?? "[]")).toEqual([
    expect.objectContaining({ id: "HK-1720000000001" }),
  ]);
});
