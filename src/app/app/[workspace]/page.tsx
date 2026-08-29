import { notFound, redirect } from "next/navigation";
import { FoodBeverageDashboard, FrontDeskDashboard, HousekeepingDashboard, MaintenanceDashboard, ManagerDashboard } from "@/components/dashboard/workspaces";
import { getAuthenticatedViewer } from "@/lib/auth/viewer";

export default async function WorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const viewer = await getAuthenticatedViewer();
  if (workspace === "front-desk") return <FrontDeskDashboard viewer={viewer}/>;
  if (workspace === "housekeeping") return <HousekeepingDashboard viewer={viewer}/>;
  if (workspace === "maintenance") return <MaintenanceDashboard viewer={viewer}/>;
  if (workspace === "food-beverage") return <FoodBeverageDashboard viewer={viewer}/>;
  if (workspace === "manager") return <ManagerDashboard viewer={viewer}/>;
  if (workspace.startsWith("department-")) redirect(`/app/${workspace}/operations-log`);
  notFound();
}
