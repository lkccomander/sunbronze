import { cookies } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { SystemUsersManager } from "@/components/system-users-manager";
import { EmptyState } from "@/components/ui";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { fetchApiJsonWithToken, type SystemUserSummary } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

async function loadSystemUsers(accessToken: string): Promise<SystemUserSummary[]> {
  return fetchApiJsonWithToken<SystemUserSummary[]>("/api/system-users", accessToken).catch(() => []);
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

  const users = await loadSystemUsers(sessionToken);

  return (
    <AppShell title={d.systemUsers.title} eyebrow={d.systemUsers.eyebrow} activeNav="systemUsers">
      <SystemUsersManager initialUsers={users} copy={d.systemUsers} common={d.common} />
    </AppShell>
  );
}
