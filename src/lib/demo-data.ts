import type { WorkspaceRole } from "./permissions";

export const workspaceNames: Record<WorkspaceRole, string> = new Proxy({
  "front-desk": "Front Desk",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  "food-beverage": "Food & Beverage",
  manager: "Management",
} as Record<WorkspaceRole, string>, { get(target, property: string) { return target[property as WorkspaceRole] ?? property.replace(/^department-/, "").split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); } });

export const latestLogs = [
  { id: "log-1", author: "Maya Chen", department: "Management", sharedWith: ["Front Desk", "Housekeeping"], time: "9:42 AM", message: "VIP group arriving at 3:00 PM. Welcome amenities are staged; Front Desk to notify Housekeeping when rooms are released.", priority: "Important", pinned: true },
  { id: "log-2", author: "Alex Morgan", department: "Front Desk", sharedWith: ["Maintenance"], time: "8:18 AM", message: "Room 604 remains out of service until Maintenance clears the AC repair.", priority: "Urgent", pinned: false },
  { id: "log-3", author: "Jordan Lee", department: "Maintenance", sharedWith: [], time: "Yesterday, 6:05 PM", message: "East elevator returned to service after inspection.", priority: "Standard", pinned: false },
];

export const serviceRequests = [
  { id: "SR-1049", title: "Confirm guest relocation follow-up", location: "Room 604", from: "Management", assigned: "Front Desk", priority: "High", status: "Assigned", due: "11:30 AM" },
  { id: "SR-1048", title: "Extra towels requested", location: "Room 718", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Unassigned", priority: "Standard", status: "Open", due: "10:30 AM" },
  { id: "SR-1047", title: "Air conditioning not cooling", location: "Room 604", from: "Front Desk", assigned: "Maintenance", assignedUser: "Jordan Lee", priority: "Urgent", status: "In Progress", due: "Overdue" },
  { id: "SR-1046", title: "Meeting room temperature", location: "Maple Room", from: "Events", assigned: "Maintenance", assignedUser: "Unassigned", priority: "High", status: "Open", due: "11:00 AM" },
  { id: "SR-1045", title: "Crib delivery", location: "Room 312", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Elena Ruiz", priority: "High", status: "Completed", due: "Completed" },
  { id: "SR-1044", title: "Remove used room-service tray", location: "Room 526", from: "Front Desk", assigned: "Housekeeping", assignedUser: "Elena Ruiz", priority: "Standard", status: "Assigned", due: "12:00 PM" },
];

const demoLateCheckoutExpiration = new Date();
demoLateCheckoutExpiration.setHours(18, 0, 0, 0);

export const roomUpdates = [
  { room: "412", type: "Late checkout", detail: "Checkout changed from 11:00 AM to 1:00 PM.", time: "9:36 AM", state: "Information only", expiresAt: demoLateCheckoutExpiration.getTime() },
  { room: "307", type: "Extension · Stayover", detail: "Guest extended one night. Change departure clean to stayover service.", time: "9:12 AM", state: "Information only", expiresAt: demoLateCheckoutExpiration.getTime() },
  { room: "518", type: "Early checkout", detail: "Guest checked out today instead of tomorrow.", time: "8:54 AM", state: "Information only", expiresAt: demoLateCheckoutExpiration.getTime() },
  { room: "604", type: "Out of service", detail: "Do not clean until Maintenance clears the room.", time: "8:18 AM", state: "Waiting for clearance" },
];

export const propertyDailyOperations = {
  property: "Ottawa Downtown",
  expectedDepartures: 38,
};

export const workOrders = [
  { id: "WO-284", title: "AC not cooling", location: "Room 604", priority: "Urgent", status: "In Progress", assignee: "Jordan Lee", age: "52 min" },
  { id: "WO-283", title: "Loose bathroom fixture", location: "Room 227", priority: "High", status: "Assigned", assignee: "Noah Wilson", age: "1 hr" },
  { id: "WO-279", title: "Inspect ice machine", location: "Floor 5", priority: "Standard", status: "Open", assignee: "Unassigned", age: "Due today" },
];

export const attention = [
  { label: "Guest follow-ups", count: 1, detail: "Room 604 relocation follow-up is due", tone: "urgent", department: "Front Desk", href: "/app/front-desk/service-requests?assigned=front-desk" },
  { label: "Payment discrepancies", count: 2, detail: "$184.50 awaiting Front Desk review", tone: "warning", department: "Front Desk", href: "/app/front-desk/payment-issues?assigned=front-desk" },
  { label: "Lost & found follow-ups", count: 4, detail: "One guest pickup scheduled today", tone: "info", department: "Front Desk", href: "/app/front-desk/lost-found?assigned=front-desk" },
  { label: "Incidents awaiting review", count: 1, detail: "Assigned to Management", tone: "neutral", department: "Management", href: "/app/manager/incidents?assigned=management" },
  { label: "Rooms waiting for clearance", count: 2, detail: "Assigned to Maintenance", tone: "warning", department: "Maintenance", href: "/app/maintenance/work-orders" },
];
