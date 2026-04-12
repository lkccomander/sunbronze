import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SystemUsersManager } from "@/components/system-users-manager";
import { EmptyState } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { ApiRequestError, fetchApiJsonWithToken, type SystemUserSummary } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

type SystemUsersLoadResult =
  | { status: "ok"; users: SystemUserSummary[] }
  | { status: "session-expired" }
  | { status: "error" };

async function loadSystemUsers(accessToken: string): Promise<SystemUsersLoadResult> {
  try {
    return { status: "ok", users: await fetchApiJsonWithToken<SystemUserSummary[]>("/api/system-users", accessToken) };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return { status: "session-expired" };
    }

    return { status: "error" };
  }
}

export default async function SystemUsersPage() {
  const { dictionary: d } = await getRequestDictionary();
  const sessionToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return (
      <AppShell title={d.systemUsers.title} eyebrow={d.systemUsers.eyebrow} activeNav="systemUsers">
        <EmptyState title={d.common.sessionRequiredTitle} body={d.systemUsers.sessionRequired} />
      </AppShell>
    );
  }

  const result = await loadSystemUsers(sessionToken);

  if (result.status === "session-expired") {
    redirect("/login?next=/system-users");
  }

  if (result.status === "error") {
    return (
      <AppShell title={d.systemUsers.title} eyebrow={d.systemUsers.eyebrow} activeNav="systemUsers">
        <EmptyState title={d.systemUsers.loadError} body={d.common.signInAgain} />
      </AppShell>
    );
  }

  return (
    <AppShell title={d.systemUsers.title} eyebrow={d.systemUsers.eyebrow} activeNav="systemUsers">
      <SystemUsersManager initialUsers={result.users} copy={d.systemUsers} common={d.common} />
    </AppShell>
  );
}
