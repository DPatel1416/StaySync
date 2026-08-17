import type { WorkspaceRole } from "./permissions";

export const workspaceNames: Record<WorkspaceRole, string> = {
  "front-desk": "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  manager: "Management",
};

export const latestLogs = [
  { id: "log-1", author: "Maya Chen", department: "Management", time: "9:42 AM", message: "VIP group arriving at 3:00 PM. Welcome amenities are staged; Front Desk to notify Housekeeping when rooms are released.", priority: "Important", pinned: true },
  { id: "log-2", author: "Alex Morgan", department: "Front Desk", time: "8:18 AM", message: "Room 604 remains out of service until Maintenance clears the AC repair.", priority: "Urgent", pinned: false },
  { id: "log-3", author: "Jordan Lee", department: "Maintenance", time: "Yesterday, 6:05 PM", message: "East elevator returned to service after inspection.", priority: "Standard", pinned: false },
];

export const serviceRequests = [
  { id: "SR-1048", title: "Extra towels requested", location: "Room 718", from: "Front Desk", assigned: "Housekeeping", priority: "Standard", status: "Assigned", due: "10:30 AM" },
  { id: "SR-1047", title: "Air conditioning not cooling", location: "Room 604", from: "Front Desk", assigned: "Maintenance", priority: "Urgent", status: "In Progress", due: "Overdue" },
  { id: "SR-1046", title: "Meeting room temperature", location: "Maple Room", from: "Events", assigned: "Maintenance", priority: "High", status: "Open", due: "11:00 AM" },
  { id: "SR-1045", title: "Crib delivery", location: "Room 312", from: "Front Desk", assigned: "Housekeeping", priority: "High", status: "Completed", due: "Completed" },
];

export const roomUpdates = [
  { room: "412", type: "Late checkout", detail: "Checkout changed from 11:00 AM to 1:00 PM.", time: "9:36 AM", state: "Action needed" },
  { room: "307", type: "Extension · Stayover", detail: "Guest extended one night. Change departure clean to stayover service.", time: "9:12 AM", state: "Assignment changed" },
  { room: "518", type: "Early checkout", detail: "Guest checked out today instead of tomorrow.", time: "8:54 AM", state: "Ready to assign" },
  { room: "604", type: "Out of service", detail: "Do not clean until Maintenance clears the room.", time: "8:18 AM", state: "Waiting for clearance" },
];

export const workOrders = [
  { id: "WO-284", title: "AC not cooling", location: "Room 604", priority: "Urgent", status: "In Progress", assignee: "Jordan Lee", age: "52 min" },
  { id: "WO-283", title: "Loose bathroom fixture", location: "Room 227", priority: "High", status: "Assigned", assignee: "Sam Rivera", age: "1 hr" },
  { id: "WO-279", title: "Inspect ice machine", location: "Floor 5", priority: "Standard", status: "Open", assignee: "Unassigned", age: "Due today" },
];

export const attention = [
  { label: "Overdue service requests", count: 3, detail: "Oldest overdue by 48 minutes", tone: "urgent" },
  { label: "Payment discrepancies", count: 2, detail: "$184.50 awaiting review", tone: "warning" },
  { label: "Lost & found follow-ups", count: 4, detail: "One pickup scheduled today", tone: "info" },
  { label: "Incidents awaiting review", count: 1, detail: "Submitted yesterday at 10:24 PM", tone: "neutral" },
];
