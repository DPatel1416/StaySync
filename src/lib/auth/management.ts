import "server-only";

import { NextResponse } from "next/server";
import { getAuthenticatedViewer } from "./viewer";
import type { Permission } from "@/lib/permissions";

export async function requireManagementPermission(permission: Permission) {
  const viewer = await getAuthenticatedViewer();
  if (!viewer) return { error: NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 }) } as const;
  if (viewer.workspace !== "manager" || !viewer.permissions.includes(permission)) {
    return { error: NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 }) } as const;
  }
  return { viewer } as const;
}

export function managementError(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  return NextResponse.json({ error: process.env.NODE_ENV === "development" ? message : fallback }, { status: 500 });
}
