import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  LogOut,
  Megaphone,
  Lightbulb,
  Menu,
  Monitor,
  Settings,
  Shield,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const navItems = [
  { href: "/admin", label: "Overview", icon: Monitor },
  { href: "/admin/expenses", label: "Expenses", icon: WalletCards },
  { href: "/admin/news", label: "Church News", icon: Megaphone },
  { href: "/admin/did-you-know", label: "Did You Know", icon: Lightbulb },
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
    description: "Update costs, visuals, ordering, and public-facing status details.",
  },
  "/admin/news": {
    section: "Church News",
    title: "Announcements Control",
    description: "Publish, prioritize, and schedule public announcements for the church display.",
  },
  "/admin/did-you-know": {
    section: "Did You Know",
    title: "Facts Control",
    description: "Create, schedule, order, and publish concise facts for the church display.",
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const activePage = pageMeta[pathname] ?? pageMeta["/admin"];
  const primaryGroup = user?.groups[0] ?? "admin";
  const initials = (user?.name ?? user?.email ?? "AD")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavRef.current) {
      mobileNavRef.current.inert = !isMobileNavOpen;
    }

    if (!isMobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }

      if (event.key === "Tab") {
        const focusableElements = mobileNavRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavOpen]);

  return (
    <div className="min-h-screen bg-[#eef3fb] text-[#1b2f4e]">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 bg-[#152b4c] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-200/65">SGSA</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-none tracking-tight">Church Dashboard</h1>
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

        <div
          aria-hidden={!isMobileNavOpen}
          className={cn(
            "fixed inset-0 z-40 bg-[#071426]/45 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
            isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setIsMobileNavOpen(false)}
        />

        <aside
          aria-hidden={!isMobileNavOpen}
          aria-label="Admin navigation"
          aria-modal="true"
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(85vw,21rem)] flex-col bg-[#152b4c] text-white shadow-[18px_0_48px_rgba(7,20,38,0.28)] transition-transform duration-300 ease-out lg:hidden",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
          id="mobile-admin-navigation"
          ref={mobileNavRef}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-blue-200/65">SGSA</p>
              <p className="mt-2 text-[1.65rem] font-semibold leading-none tracking-tight">Church Dashboard</p>
              <p className="mt-2 text-sm text-blue-100/70">Church Dashboard Admin</p>
            </div>
            <button
              aria-label="Close navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-blue-50 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => {
                setIsMobileNavOpen(false);
                menuButtonRef.current?.focus();
              }}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-blue-200/55">Admin</p>
            <div className="mt-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-base font-medium transition",
                        isActive
                          ? "border-[#5da0ff] bg-[#3468e8] text-white shadow-[0_10px_24px_rgba(27,78,190,0.28)]"
                          : "border-transparent text-blue-100/80 hover:bg-white/8 hover:text-white",
                      )
                    }
                    end={item.href === "/admin"}
                    key={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    to={item.href}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-blue-200/55">Public</p>
              <NavLink
                className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-base font-medium text-blue-100/80 transition hover:bg-white/8 hover:text-white"
                onClick={() => setIsMobileNavOpen(false)}
                to="/"
              >
                <ExternalLink className="h-5 w-5" />
                Dashboard
              </NavLink>
            </div>
          </nav>

          <div className="m-4 rounded-2xl border border-white/12 bg-white/8 p-4">
            <p className="text-sm font-medium text-white">{user?.name ?? "Administrator"}</p>
            <p className="mt-1 text-xs text-blue-100/70">Tenant: {user?.tenantId ?? "Church Dashboard"}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#d8e2f1] bg-[#f5f8fd]/92 backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-4 py-4 sm:gap-4 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-controls="mobile-admin-navigation"
                  aria-expanded={isMobileNavOpen}
                  aria-label="Open navigation"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d8e2f1] bg-white text-[#1b2f4e] shadow-sm transition hover:border-[#b8c9df] hover:bg-[#f8faff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3468e8] lg:hidden"
                  onClick={() => setIsMobileNavOpen(true)}
                  ref={menuButtonRef}
                  type="button"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-xs text-[#7a8eab]">
                    <span>{activePage.section}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </div>
                  <h2 className="text-xl font-semibold leading-tight tracking-tight text-[#112947] sm:text-2xl">{activePage.title}</h2>
                  <p className="mt-1 hidden max-w-2xl text-sm text-[#6a7f9a] md:block">{activePage.description}</p>
                </div>
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
                <Button
                  aria-label="Sign out"
                  className="h-10 rounded-xl px-3 min-[480px]:px-4"
                  onClick={() => void signOutUser()}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden min-[480px]:inline">Sign out</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[120rem]">
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
