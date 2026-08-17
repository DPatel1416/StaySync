import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { WorkspaceRole } from "@/lib/permissions";

const valid = new Set(["front-desk", "housekeeping", "maintenance", "manager"]);

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  if (!valid.has(workspace)) notFound();
  return <AppShell role={workspace as WorkspaceRole}>{children}</AppShell>;
}
