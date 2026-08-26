import { notFound } from "next/navigation";
import { FrontDeskDashboard, HousekeepingDashboard, MaintenanceDashboard, ManagerDashboard } from "@/components/dashboard/workspaces";
import { getAuthenticatedViewer } from "@/lib/auth/viewer";

export default async function WorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (workspace === "front-desk") return <FrontDeskDashboard/>;
  if (workspace === "housekeeping") return <HousekeepingDashboard/>;
  if (workspace === "maintenance") return <MaintenanceDashboard/>;
  if (workspace === "manager") return <ManagerDashboard viewer={await getAuthenticatedViewer()}/>;
  notFound();
}
