import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAuthenticatedViewer } from "@/lib/auth/viewer";
import type { WorkspaceRole } from "@/lib/permissions";

const valid = new Set(["front-desk", "housekeeping", "maintenance", "food-beverage", "manager"]);

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!valid.has(workspace) && !workspace.startsWith("department-")) notFound();
  const viewer = await getAuthenticatedViewer();
  if (!viewer) redirect("/?reason=session-required");
  if (viewer && viewer.workspace !== workspace) redirect(`/app/${viewer.workspace}`);
  return <AppShell role={workspace as WorkspaceRole} viewer={viewer}>{children}</AppShell>;
}
