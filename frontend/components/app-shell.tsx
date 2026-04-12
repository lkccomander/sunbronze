import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import logoImage from "@/app/assets/logo.jpg";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { fetchApiJsonWithToken, getApiStatus, type AuthenticatedUser } from "@/lib/api";
import { getRequestDictionary } from "@/lib/i18n-server";

const navItems = [
  { href: "/dashboard", icon: "dashboard", key: "dashboard" },
  { href: "/appointments", icon: "calendar_month", key: "appointments" },
  { href: "/customers", icon: "group", key: "customers" },
  { href: "/conversations", icon: "chat", key: "conversations" },
  { href: "/services", icon: "medical_services", key: "services" },
  { href: "/system-users", icon: "manage_accounts", key: "systemUsers" },
  { href: "/dev", icon: "developer_mode", key: "dev" },
] as const;

export type AppNavKey = (typeof navItems)[number]["key"];

const fallbackActiveByTitle: Record<string, AppNavKey> = {
  appointments: "appointments",
  citas: "appointments",
  customer: "customers",
  clientes: "customers",
  conversations: "conversations",
  conversaciones: "conversations",
  services: "services",
  servicios: "services",
  users: "systemUsers",
  usuarios: "systemUsers",
  dashboard: "dashboard",
  panel: "dashboard",
};

function initialsFromName(name: string | null | undefined): string {
  return (name || "SunBronze")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SB";
}

function roleLabel(user: AuthenticatedUser | null, fallback: string): string {
  return user?.roles?.length ? user.roles.join(", ") : fallback;
}

async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    return null;
  }

  try {
    return await fetchApiJsonWithToken<AuthenticatedUser>("/api/auth/me", accessToken);
  } catch {
    return null;
  }
}

export async function AppShell({
  title,
  eyebrow,
  activeNav,
  children,
}: {
  title: string;
  eyebrow: string;
  activeNav?: AppNavKey;
  children: ReactNode;
}) {
  const [{ locale, dictionary: d }, apiStatus, currentUser] = await Promise.all([getRequestDictionary(), getApiStatus(), getCurrentUser()]);
  const normalizedTitle = title.toLowerCase();
  const inferredActiveNav = activeNav ?? Object.entries(fallbackActiveByTitle).find(([needle]) => normalizedTitle.includes(needle))?.[1];
  const statusLabel = apiStatus.online ? d.common.apiOnline : apiStatus.label === "API offline" ? d.common.apiOffline : apiStatus.label;
  const userName = currentUser?.display_name || d.shell.noUser || "SunBronze";
  const userRole = roleLabel(currentUser, statusLabel);
  const themeLabels = d.shell.theme || { dark: "Dark", darkGreen: "Dark green", light: "Light" };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Image className="sidebar-brand-logo" src={logoImage} alt="SunBronze" priority />
          <div className="min-w-0">
            <div className="sidebar-brand-name">{d.shell.brand}</div>
            <div className="sidebar-brand-sub">{d.shell.subBrand}</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label={d.shell.nav.dashboard}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${item.key === inferredActiveNav ? " active" : ""}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              {d.shell.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initialsFromName(userName)}</div>
          <div className="min-w-0 flex-1">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <div className="status-dot" title={d.shell[apiStatus.online ? "apiOnlineTitle" : "apiOfflineTitle"]} />
        </div>
      </aside>

      <main id="main" className="main-content">
        <div className="page-header">
          <div>
            <div className="flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-normal text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined icon-sm" aria-hidden="true">
                wb_sunny
              </span>
              <span>{eyebrow}</span>
            </div>
            <h1 className="page-title mt-4">{title}</h1>
            <p className="page-subtitle">{d.shell.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="header-user">
              <div className="user-avatar">{initialsFromName(userName)}</div>
              <div className="min-w-0">
                <div className="user-name">{userName}</div>
                <div className="user-role">{currentUser?.email || userRole}</div>
              </div>
            </div>
            <ThemeToggle darkLabel={themeLabels.dark} darkGreenLabel={themeLabels.darkGreen} lightLabel={themeLabels.light} />
            <LocaleSwitcher locale={locale} label={d.shell.language} />
            <span className={`pill ${apiStatus.online ? "pill-primary" : "pill-tertiary"}`}>{statusLabel}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn btn-ghost btn-sm">
                {d.shell.logout}
              </button>
            </form>
          </div>
        </div>
        <div className="animate-in">{children}</div>
      </main>
    </div>
  );
}
