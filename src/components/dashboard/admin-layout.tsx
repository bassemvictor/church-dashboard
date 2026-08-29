import { ChevronRight, ClipboardCheck, ExternalLink, LogOut, Megaphone, Monitor, Settings, Shield, WalletCards } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const navItems = [
  { href: "/admin", label: "Overview", icon: Monitor },
  { href: "/admin/expenses", label: "Expenses", icon: WalletCards },
  { href: "/admin/news", label: "Church News", icon: Megaphone },
  { href: "/admin/pending-approvals", label: "Pending Approvals", icon: ClipboardCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const pageMeta: Record<string, { section: string; title: string; description: string }> = {
  "/admin": {
    section: "Overview",
    title: "Church Dashboard Control",
    description: "Manage the TV dashboard content and settings from one workspace.",
  },
  "/admin/expenses": {
    section: "Projects & Expenses",
    title: "Expenses & Projects Control",
    description: "Update budgets, visuals, ordering, and public-facing status details.",
  },
  "/admin/news": {
    section: "Church News",
    title: "Announcements Control",
    description: "Publish, prioritize, and schedule public announcements for the church display.",
  },
  "/admin/pending-approvals": {
    section: "Pending Approval",
    title: "Approval Queue",
    description: "Review pending expense and news items that require approval before they can appear on the church display.",
  },
  "/admin/settings": {
    section: "Settings",
    title: "Dashboard Messaging & Timing",
    description: "Control identity, verse copy, giving messaging, and display cadence.",
  },
};

export const AdminLayout = () => {
  const { user, signOutUser } = useAuth();
  const { pathname } = useLocation();
  const activePage = pageMeta[pathname] ?? pageMeta["/admin"];
  const primaryGroup = user?.groups[0] ?? "admin";
  const initials = (user?.name ?? user?.email ?? "AD")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#eef3fb] text-[#1b2f4e]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 bg-[#152b4c] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-200/65">SGSA</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-none tracking-tight">Shepherd Hub</h1>
            <p className="mt-2 text-sm text-blue-100/70">Church Dashboard Admin</p>
          </div>

          <nav className="flex-1 px-3 py-6">
            <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-blue-200/55">Admin</p>
            <div className="mt-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition",
                        isActive
                          ? "border-[#5da0ff] bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(93,160,255,0.25)]"
                          : "border-transparent text-blue-100/78 hover:bg-white/6 hover:text-white",
                      )
                    }
                    end={item.href === "/admin"}
                    key={item.href}
                    to={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-blue-200/55">Public</p>
              <div className="mt-3">
                <NavLink
                  className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-blue-100/78 transition hover:bg-white/6 hover:text-white"
                  to="/"
                >
                  <ExternalLink className="h-4 w-4" />
                  Dashboard
                </NavLink>
              </div>
            </div>
          </nav>

          <div className="m-3 rounded-2xl border border-white/10 bg-white/8 p-4">
            <p className="text-sm font-medium text-white">{user?.name ?? "Administrator"}</p>
            <p className="mt-1 text-xs text-blue-100/70">Tenant: {user?.tenantId ?? "Church Dashboard"}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#d8e2f1] bg-[#f5f8fd]/92 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-xs text-[#7a8eab]">
                  <span>{activePage.section}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#112947]">{activePage.title}</h2>
                <p className="mt-1 hidden max-w-2xl text-sm text-[#6a7f9a] md:block">{activePage.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-3 rounded-2xl border border-[#d8e2f1] bg-white px-3 py-2 sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3468e8] text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#112947]">{user?.name ?? user?.email ?? "Administrator"}</p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-[#7a8eab]">
                      <Shield className="h-3 w-3" />
                      <span className="capitalize">{primaryGroup}</span>
                    </div>
                  </div>
                </div>
                <Button className="h-10 rounded-xl px-4" onClick={() => void signOutUser()} type="button" variant="outline">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[120rem]">
              <div className="mb-5 rounded-xl border border-[#dbe4f0] bg-white px-5 py-4 shadow-[0_16px_40px_rgba(16,33,61,0.06)] lg:hidden">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#7a8eab]">Navigate</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition",
                            isActive
                              ? "border-[#3468e8] bg-[#edf3ff] text-[#12335c]"
                              : "border-[#dbe4f0] bg-[#fbfcff] text-[#4a5f7d]",
                          )
                        }
                        end={item.href === "/admin"}
                        key={item.href}
                        to={item.href}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <main className="min-w-0">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
