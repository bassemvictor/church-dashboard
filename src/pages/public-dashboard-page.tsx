import { CheckCircle2, CircleAlert, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DashboardQrCode } from "../components/dashboard/dashboard-qr-code";
import { isAdminUser, useAuth } from "../lib/auth";
import {
  dashboardStatusMeta,
  formatCurrency,
  getClampedFundingPercentage,
  getComputedStatus,
  getFundingPercentage,
  getIconComponent,
  isExpenseVisible,
  isNewsVisible,
  getSanitizedItemsPerPage,
  getSanitizedRefreshIntervalSeconds,
  getSanitizedRotationIntervalSeconds,
  getSanitizedUpcomingLiturgiesCount,
  newsCategoryLabels,
  usePublicDashboard,
} from "../lib/church-dashboard";
import {
  type ChurchLiturgy,
  defaultDashboardSettings,
  type ChurchExpense,
  type ChurchNews,
  type PublicDashboardResponse,
} from "../../shared/church-dashboard";

type DashboardView = "projects" | "news";

const getEnabledDashboardViews = (settings: typeof defaultDashboardSettings): DashboardView[] => {
  const views: DashboardView[] = [];

  if (settings.common.showExpensesPage) {
    views.push("projects");
  }

  if (settings.common.showNewsPage) {
    views.push("news");
  }

  return views;
};

const getSafeDashboardView = (activeView: DashboardView, enabledViews: DashboardView[]) =>
  enabledViews.includes(activeView) ? activeView : (enabledViews[0] ?? null);

const getNextDashboardViewState = ({
  activeView,
  expensePageIndex,
  newsPageIndex,
  projectPageCount,
  newsPageCount,
  enabledViews,
}: {
  activeView: DashboardView;
  expensePageIndex: number;
  newsPageIndex: number;
  projectPageCount: number;
  newsPageCount: number;
  enabledViews: DashboardView[];
}) => {
  const currentIndex = enabledViews.indexOf(activeView);

  if (currentIndex === -1) {
    return null;
  }

  if (activeView === "projects") {
    if (expensePageIndex < projectPageCount - 1) {
      return {
        activeView: "projects" as const,
        expensePageIndex: expensePageIndex + 1,
        newsPageIndex,
      };
    }

    const nextView = enabledViews[(currentIndex + 1) % enabledViews.length] ?? "projects";
    return {
      activeView: nextView,
      expensePageIndex: 0,
      newsPageIndex: 0,
    };
  }

  if (newsPageIndex < newsPageCount - 1) {
    return {
      activeView: "news" as const,
      expensePageIndex,
      newsPageIndex: newsPageIndex + 1,
    };
  }

  const nextView = enabledViews[(currentIndex + 1) % enabledViews.length] ?? "news";
  return {
    activeView: nextView,
    expensePageIndex: 0,
    newsPageIndex: 0,
  };
};

const formatClock = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(value)
    .replace(/\s*a\.m\.\s*$/i, " AM")
    .replace(/\s*p\.m\.\s*$/i, " PM");

const formatDayDate = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "short",
    day: "2-digit",
  })
    .format(value)
    .replace(",", " ·")
    .toUpperCase();

const splitChurchName = (churchName: string) => {
  const normalized = churchName.trim();
  const preferredSuffixes = [
    " Coptic Orthodox Church",
    " Orthodox Church",
    " Church",
  ];

  for (const suffix of preferredSuffixes) {
    if (normalized.endsWith(suffix)) {
      const title = normalized.slice(0, -suffix.length).trim();
      const subtitle = suffix.trim();

      if (title && subtitle) {
        return { title, subtitle };
      }
    }
  }

  return { title: normalized, subtitle: "" };
};

const formatAnnouncementDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatExpenseDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getExpenseDueMeta = (value: string | undefined, todayDateKey: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dueDateKey = getLocalDateKey(date);
  const today = new Date(`${todayDateKey}T12:00:00`);
  const dueDate = new Date(`${dueDateKey}T12:00:00`);
  const dayDifference = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (dayDifference < 0) {
    return {
      accentClassName: "border-rose-200 bg-rose-50 text-rose-700",
      label: "Past due",
      value: formatExpenseDate(value),
    };
  }

  if (dayDifference === 0) {
    return {
      accentClassName: "border-amber-200 bg-amber-50 text-amber-800",
      label: "Due today",
      value: formatExpenseDate(value),
    };
  }

  if (dayDifference === 1) {
    return {
      accentClassName: "border-orange-200 bg-orange-50 text-orange-800",
      label: "Due tomorrow",
      value: formatExpenseDate(value),
    };
  }

  return {
    accentClassName: "border-[#e8dcc7] bg-[#faf5ec] text-[#8d6a2f]",
    label: "Deadline",
    value: formatExpenseDate(value),
  };
};

const formatLiturgyDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

const formatLiturgyTime = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const getLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildEmptyPayload = (): PublicDashboardResponse => ({
  projects: [],
  news: [],
  liturgies: [],
  settings: defaultDashboardSettings,
  serverTime: new Date().toISOString(),
});

const DashboardHeader = ({
  churchName,
  now,
  verseText,
  verseReference,
  showClock,
  showDate,
  showAdminShortcut = false,
  churchWebsiteUrl,
  donationUrl,
}: {
  churchName: string;
  now: Date;
  verseText?: string;
  verseReference?: string;
  showClock: boolean;
  showDate: boolean;
  showAdminShortcut?: boolean;
  churchWebsiteUrl?: string;
  donationUrl?: string;
}) => (
  <section className="px-1 py-1 md:px-0 md:py-0">
    <div className="overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfe_45%,#eaf4fb_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(16,47,80,0.07)] md:px-6 md:py-3.5 xl:px-9">
      <div className="grid items-center gap-x-5 gap-y-3.5 lg:grid-cols-[minmax(150px,20%)_minmax(0,1fr)] xl:grid-cols-[minmax(190px,21%)_minmax(0,1fr)_minmax(220px,18%)_auto]">
        <div className="relative flex justify-start self-center">
          <img
            alt="Church illustration"
            className="h-auto w-full max-w-[clamp(140px,17vw,285px)] object-contain object-left"
            src="/church-hero.png"
          />
        </div>

        <div className="min-w-0 self-center xl:pr-5">
          <div className="max-w-[min(100%,38rem)]">
            {(() => {
              const { title, subtitle } = splitChurchName(churchName);

              return (
                <h1 className="text-[clamp(1.55rem,2.5vw,3rem)] font-semibold leading-[1.07] tracking-[-0.03em] text-[#102f50]">
                  <span className="block whitespace-nowrap">{title}</span>
                  {subtitle ? (
                    <span className="block whitespace-nowrap font-['Helvetica_Neue',Arial,sans-serif] text-[0.62em] font-normal tracking-normal text-[#b88734]">
                      {subtitle}
                    </span>
                  ) : null}
                </h1>
              );
            })()}
          </div>
          {verseText ? (
            <div className="mt-2.5 flex max-w-[min(100%,39rem)] items-start gap-3">
              <div className="min-h-[clamp(48px,5.5vw,72px)] w-px shrink-0 self-stretch bg-[#b88734]" />
              <div className="min-w-0">
                <p className="text-[clamp(0.9rem,1.1vw,1.3rem)] italic leading-[1.38] text-[#365671]">
                  “{verseText}”
                </p>
                {verseReference ? (
                  <p className="mt-0.5 text-[clamp(0.62rem,0.72vw,0.82rem)] font-semibold uppercase tracking-[0.33em] text-[#b88734]">
                    {verseReference}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {(showClock || showDate) ? (
          <div className="flex min-w-0 items-center justify-start xl:justify-end">
            <div className="text-left xl:text-right">
              {showDate ? (
                <p className="text-[clamp(0.68rem,0.78vw,0.86rem)] font-semibold uppercase tracking-[0.33em] text-[#b88734]">
                  {formatDayDate(now)}
                </p>
              ) : null}
              {showClock ? (
                <p className="mt-1.5 text-[clamp(1.85rem,2.3vw,2.9rem)] font-semibold leading-none tracking-[-0.03em] text-[#102f50]">
                  {formatClock(now)}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end xl:justify-self-end">
          {showAdminShortcut ? (
            <Link
              className="inline-flex items-center gap-1.5 self-end rounded-sm bg-transparent px-0.5 py-0.5 text-[0.79rem] font-medium text-[#102f50]/70 transition hover:bg-[#102f50]/[0.06] hover:text-[#102f50] hover:underline"
              to="/admin"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span>Admin</span>
            </Link>
          ) : null}

          <div className="flex min-w-0 flex-nowrap items-center justify-start gap-3 sm:justify-end">
            <div className="flex shrink-0 items-center justify-end gap-2">
              <DashboardQrCode
                alt="Church website QR code"
                containerClassName="flex flex-col items-center gap-1 rounded-[1.1rem] border border-[#d6c4a4] bg-[#fffaf0]/95 p-2 text-center shadow-[0_10px_24px_rgba(16,47,80,0.08)]"
                label="Website"
                sizeClassName="h-14 w-14"
                url={churchWebsiteUrl}
              />
              <DashboardQrCode
                alt="Donation QR code"
                containerClassName="flex flex-col items-center gap-1 rounded-[1.1rem] border border-[#d6c4a4] bg-[#fffaf0]/95 p-2 text-center shadow-[0_10px_24px_rgba(16,47,80,0.08)]"
                label="Donate"
                sizeClassName="h-14 w-14"
                url={donationUrl}
              />
            </div>
            <img
              alt="Church logo"
              className="h-auto w-[clamp(120px,12vw,125px)] shrink-0 object-contain drop-shadow-[0_14px_24px_rgba(16,47,80,0.28)]"
              src="/sgsa-logo-gold-dark.svg"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ProjectsView = ({ items, todayDateKey }: { items: ChurchExpense[]; todayDateKey: string }) => (
  <>
    <div className="hidden grid-cols-[2.1fr_1.5fr_1fr_1.6fr_0.7fr_1fr] gap-3 border-b border-[#eadfcf] px-3 pb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#7f6b49] lg:grid">
      <span>Project</span>
      <span>Description</span>
      <span>Budget</span>
      <span>Funded</span>
      <span>Progress</span>
      <span>Status</span>
    </div>

    <div className="space-y-2 pt-2">
      {items.map((expense) => {
        const Icon = getIconComponent(expense.icon);
        const percentage = getFundingPercentage(expense);
        const progress = getClampedFundingPercentage(expense);
        const status = getComputedStatus(expense);
        const statusMeta = dashboardStatusMeta[status];
        const dueMeta = getExpenseDueMeta(expense.paymentDate, todayDateKey);

        return (
          <article
            className="grid gap-3 rounded-[1.4rem] border border-[#ede3d2] bg-[#fffdfa]/96 p-3 shadow-[0_14px_36px_rgba(31,42,68,0.05)] lg:grid-cols-[2.1fr_1.5fr_1fr_1.6fr_0.7fr_1fr] lg:items-center"
            key={expense.id}
          >
            <div className="flex items-center gap-3">
              <img
                alt={expense.title}
                className="h-20 w-24 rounded-[1rem] border border-[#e6d7bb] object-cover"
                src={expense.imageUrl || "/church-hero.png"}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#112947] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold uppercase leading-tight tracking-[0.03em] text-[#132946]">
                      {expense.title}
                    </h2>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8d6a2f]">
                      Project
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm leading-relaxed text-[#415a78] lg:text-base">{expense.description}</p>
              {dueMeta ? (
                <div className={`mt-3 inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 ${dueMeta.accentClassName}`}>
                  <span className="text-[0.58rem] font-bold uppercase tracking-[0.22em]">{dueMeta.label}</span>
                  <span className="text-[0.82rem] font-semibold tracking-[0.03em]">{dueMeta.value}</span>
                </div>
              ) : null}
            </div>
            <p className="text-2xl font-semibold text-[#132946]">{formatCurrency(expense.totalBudget)}</p>

            <div>
              <p className={`text-2xl font-semibold ${statusMeta.tone}`}>{formatCurrency(expense.fundedAmount)}</p>
              <div className="mt-2 h-4 rounded-full bg-[#ece8e1]">
                <div
                  className={`h-4 rounded-full bg-gradient-to-r ${statusMeta.trackTone}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <p className={`text-2xl font-semibold ${statusMeta.tone}`}>{Math.round(percentage)}%</p>

            <div className="flex items-center gap-2.5">
              {status === "FUNDED" || status === "ON_TRACK" ? (
                <CheckCircle2 className={`h-10 w-10 shrink-0 ${statusMeta.tone}`} />
              ) : (
                <CircleAlert className={`h-10 w-10 shrink-0 ${statusMeta.tone}`} />
              )}
              <div>
                <p className={`text-lg font-semibold uppercase ${statusMeta.tone}`}>
                  {expense.customStatusText || statusMeta.label}
                </p>
                <p className="text-sm text-[#556b86]">{expense.customSubText || statusMeta.subtext}</p>
              </div>
            </div>
          </article>
        );
      })}

      {!items.length ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-[#d7c5a3] bg-[#fffaf2] px-5 text-center">
          <div>
            <p className="text-2xl font-semibold text-[#112947]">No active projects to display yet</p>
            <p className="mt-2 text-sm text-[#556b86]">Add projects from the admin area and they will appear here automatically.</p>
          </div>
        </div>
      ) : null}
    </div>
  </>
);

const NewsView = ({
  items,
  liturgies,
}: {
  items: ChurchNews[];
  liturgies: ChurchLiturgy[];
}) => (
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = getIconComponent(item.icon);

        return (
          <article
            className="flex gap-4 rounded-[1.4rem] border border-[#ede3d2] bg-[#fffdfa]/96 p-4 shadow-[0_14px_36px_rgba(31,42,68,0.05)]"
            key={item.id}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#112947] text-white">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold uppercase leading-tight tracking-[0.03em] text-[#132946]">
                  {item.title}
                </h2>
                <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d6a2f]">
                  {newsCategoryLabels[item.category ?? "GENERAL"]}
                </span>
              </div>
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-[#415a78] lg:text-base">{item.description}</p>
              ) : null}
              {(item.eventDate || item.location) ? (
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d6a2f]">
                  {formatAnnouncementDate(item.eventDate) ? <span>{formatAnnouncementDate(item.eventDate)}</span> : null}
                  {item.location ? <span>{item.location}</span> : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      {!items.length ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-[#d7c5a3] bg-[#fffaf2] px-5 text-center">
          <div>
            <p className="text-2xl font-semibold text-[#112947]">No active announcements right now</p>
            <p className="mt-2 text-sm text-[#556b86]">Create church news in the admin area and it will appear here automatically.</p>
          </div>
        </div>
      ) : null}
    </div>

    <aside className="rounded-[1.6rem] border border-[#eadfcf] bg-[#fff9ef] p-3.5 shadow-[0_14px_36px_rgba(31,42,68,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8d6a2f]">Upcoming Divine Liturgies</p>
      {liturgies.length ? (
        <div className="mt-3 space-y-3">
          {liturgies.map((item) => (
            <div className="border-b border-[#eadfcf] pb-3 last:border-b-0 last:pb-0" key={item.id}>
              <p className="text-[1.35rem] font-semibold leading-tight text-[#112947]">{formatLiturgyDate(item.date)}</p>
              {formatLiturgyTime(item.startDateTime) && formatLiturgyTime(item.endDateTime) ? (
                <p className="mt-0.5 text-sm font-medium leading-snug text-[#8d6a2f]">
                  From {formatLiturgyTime(item.startDateTime)} to {formatLiturgyTime(item.endDateTime)}
                </p>
              ) : null}
              {item.description ? <p className="mt-0.5 text-sm leading-snug text-[#556b86]">{item.description}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#556b86]">There are no upcoming Divine Liturgies scheduled right now.</p>
      )}
    </aside>
  </div>
);

const RotationClock = ({ progress }: { progress: number }) => {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - clampedProgress);

  return (
    <div className="flex h-10 w-10 items-center justify-center">
      <svg
        aria-hidden="true"
        className="-rotate-90"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <defs>
          <linearGradient id="dashboard-rotation-clock" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#d5b277" />
            <stop offset="100%" stopColor="#112947" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="#e8e1d5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="url(#dashboard-rotation-clock)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
    </div>
  );
};

export const PublicDashboardPage = () => {
  const { user, status } = useAuth();
  const dashboardQuery = usePublicDashboard();
  const [now, setNow] = useState(() => new Date());
  const [activeView, setActiveView] = useState<DashboardView>("projects");
  const [isVisible, setIsVisible] = useState(true);
  const [expensePageIndex, setExpensePageIndex] = useState(0);
  const [newsPageIndex, setNewsPageIndex] = useState(0);
  const [rotationProgress, setRotationProgress] = useState(0);
  const [rotationCycleSeed, setRotationCycleSeed] = useState(0);
  const payload = dashboardQuery.data ?? buildEmptyPayload();
  const settings = payload.settings ?? defaultDashboardSettings;
  const enabledViews = useMemo(() => getEnabledDashboardViews(settings), [settings]);
  const visibleProjects = useMemo(() => payload.projects.filter((item) => isExpenseVisible(item, now)), [now, payload.projects]);
  const visibleNews = useMemo(() => payload.news.filter((item) => isNewsVisible(item, now)), [now, payload.news]);
  const visibleAnnouncementNews = visibleNews;
  const showAdminShortcut = status === "authenticated" && !!user && isAdminUser(user.groups);
  const projectItemsPerPage = getSanitizedItemsPerPage(settings.expenses.itemsPerPage);
  const newsItemsPerPage = getSanitizedItemsPerPage(settings.news.itemsPerPage);
  const upcomingLiturgiesCount = getSanitizedUpcomingLiturgiesCount(settings.liturgy.upcomingLiturgiesCount);
  const rotationIntervalSeconds = getSanitizedRotationIntervalSeconds(settings.common.mainViewRotationIntervalSeconds);
  const refreshIntervalSeconds = getSanitizedRefreshIntervalSeconds(settings.common.refreshIntervalSeconds);
  const projectPageCount = Math.max(1, Math.ceil(visibleProjects.length / projectItemsPerPage));
  const newsPageCount = Math.max(1, Math.ceil(visibleAnnouncementNews.length / newsItemsPerPage));
  const currentView = getSafeDashboardView(activeView, enabledViews);
  const todayDateKey = getLocalDateKey(now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentView) {
      return;
    }

    if (currentView !== activeView) {
      setActiveView(currentView);
      setRotationProgress(0);
    }
  }, [activeView, currentView]);

  useEffect(() => {
    setExpensePageIndex((current) => Math.min(current, projectPageCount - 1));
  }, [projectPageCount]);

  useEffect(() => {
    setNewsPageIndex((current) => Math.min(current, newsPageCount - 1));
  }, [newsPageCount]);

  useEffect(() => {
    if (dashboardQuery.isLoading || !dashboardQuery.data || !currentView) {
      setRotationProgress(0);
      return;
    }

    setRotationProgress(0);
    let transitionTimer: number | undefined;
    const startedAt = Date.now();

    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRotationProgress(Math.max(0, Math.min(1, elapsed / (rotationIntervalSeconds * 1000))));
    }, 150);

    const timer = window.setInterval(() => {
      setRotationProgress(1);
      setIsVisible(false);

      transitionTimer = window.setTimeout(() => {
        const nextState = getNextDashboardViewState({
          activeView: currentView,
          expensePageIndex,
          newsPageIndex,
          projectPageCount,
          newsPageCount,
          enabledViews,
        });

        if (!nextState) {
          setIsVisible(true);
          setRotationProgress(0);
          return;
        }

        setActiveView(nextState.activeView);
        setExpensePageIndex(nextState.expensePageIndex);
        setNewsPageIndex(nextState.newsPageIndex);
        setIsVisible(true);
        setRotationProgress(0);
      }, 250);
    }, rotationIntervalSeconds * 1000);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(timer);
      if (transitionTimer) {
        window.clearTimeout(transitionTimer);
      }
    };
  }, [
    activeView,
    dashboardQuery.data,
    dashboardQuery.isLoading,
    expensePageIndex,
    newsPageIndex,
    newsPageCount,
    projectPageCount,
    enabledViews,
    currentView,
    rotationCycleSeed,
    rotationIntervalSeconds,
  ]);

  const handleViewSelect = (view: DashboardView) => {
    if (!enabledViews.includes(view)) {
      return;
    }

    setIsVisible(false);

    window.setTimeout(() => {
      setActiveView(view);
      if (view === "projects") {
        setExpensePageIndex(0);
      } else {
        setNewsPageIndex(0);
      }
      setIsVisible(true);
      setRotationProgress(0);
      setRotationCycleSeed((current) => current + 1);
    }, 120);
  };

  const pagedProjects = useMemo(
    () =>
      visibleProjects.slice(
        expensePageIndex * projectItemsPerPage,
        expensePageIndex * projectItemsPerPage + projectItemsPerPage,
      ),
    [expensePageIndex, projectItemsPerPage, visibleProjects],
  );

  const pagedNews = useMemo(
    () =>
      visibleAnnouncementNews.slice(
        newsPageIndex * newsItemsPerPage,
        newsPageIndex * newsItemsPerPage + newsItemsPerPage,
      ),
    [newsItemsPerPage, newsPageIndex, visibleAnnouncementNews],
  );

  const upcomingLiturgies = useMemo(
    () =>
      payload.liturgies
        .filter((item) => item.date >= todayDateKey)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, upcomingLiturgiesCount),
    [payload.liturgies, todayDateKey, upcomingLiturgiesCount],
  );

  const currentTitle = currentView === "projects" ? settings.expenses.dashboardTitle : settings.news.dashboardTitle;
  const projectsPageLabel = `${expensePageIndex + 1} / ${projectPageCount}`;
  const newsPageLabel = `${newsPageIndex + 1} / ${newsPageCount}`;

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#eef4fb_100%)] px-6 text-center text-[#112947]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6a2f]">Loading</p>
          <p className="mt-3 text-3xl font-semibold">Preparing the church dashboard</p>
        </div>
      </div>
    );
  }

  if (dashboardQuery.isError && !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#eef4fb_100%)] px-6 text-center text-[#112947]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8d6a2f]">Unable to load</p>
          <p className="mt-3 text-3xl font-semibold">The dashboard data could not be retrieved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_24%),linear-gradient(180deg,#ffffff_0%,#7aa8d1_44%,#ffffff_100%)] text-[#112947]">
      <div className="relative mx-auto flex h-full max-w-[1920px] flex-col px-3 py-3 lg:px-6 lg:py-4">
        <DashboardHeader
          churchName={settings.common.churchName}
          churchWebsiteUrl={settings.expenses.churchWebsiteUrl}
          donationUrl={settings.expenses.donationUrl}
          now={now}
          showClock={settings.common.showClock}
          showDate={settings.common.showDate}
          showAdminShortcut={showAdminShortcut}
          verseReference={settings.common.mainVerseReference}
          verseText={settings.common.mainVerseText}
        />

        <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-[2rem] border border-[#e6d7bb] bg-white/78 px-3 py-4 shadow-[0_30px_70px_rgba(31,42,68,0.08)] lg:px-5">
          <div className="relative mb-3 flex flex-col items-center gap-3 md:min-h-[88px] md:justify-center">
            <div className="text-center">
              <p className="text-2xl font-semibold tracking-[0.05em] text-[#112947] md:text-4xl">
                {currentView ? currentTitle : "PUBLIC DASHBOARD"}
              </p>
            </div>

            <div className="flex min-w-[260px] items-center justify-center gap-3 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2 md:justify-end">
              {enabledViews.length ? (
                <>
                  <div className="flex items-center justify-center gap-2 md:justify-end">
                    {enabledViews.includes("projects") ? (
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          currentView === "projects" ? "bg-[#112947] text-white" : "bg-[#f3ead8] text-[#8d6a2f] hover:bg-[#eadcc3]"
                        }`}
                        onClick={() => handleViewSelect("projects")}
                        type="button"
                      >
                        Projects
                        {currentView === "projects" ? (
                          <span className="rounded-full bg-white/14 px-1.5 py-0.5 text-[0.56rem] tracking-[0.1em] text-white">
                            {projectsPageLabel}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                    {enabledViews.includes("news") ? (
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                          currentView === "news" ? "bg-[#112947] text-white" : "bg-[#f3ead8] text-[#8d6a2f] hover:bg-[#eadcc3]"
                        }`}
                        onClick={() => handleViewSelect("news")}
                        type="button"
                      >
                        News
                        {currentView === "news" ? (
                          <span className="rounded-full bg-white/14 px-1.5 py-0.5 text-[0.56rem] tracking-[0.1em] text-white">
                            {newsPageLabel}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                  <RotationClock progress={rotationProgress} />
                </>
              ) : null}
            </div>
          </div>

          <div className={`relative min-h-0 flex-1 overflow-hidden transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {!currentView ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="max-w-2xl rounded-[2rem] border border-dashed border-[#d7c7a8] bg-[#fff8ea] px-8 py-10 shadow-[0_18px_40px_rgba(141,106,47,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8d6a2f]">Nothing enabled</p>
                  <p className="mt-4 text-2xl font-semibold text-[#112947]">The public dashboard is currently hidden.</p>
                  <p className="mt-3 text-sm text-[#556b86]">
                    Turn on the Projects & Expenses page or the Church News page in settings to show content here.
                  </p>
                </div>
              </div>
            ) : currentView === "projects" ? (
                  <ProjectsView items={pagedProjects} todayDateKey={todayDateKey} />
            ) : (
              <NewsView items={pagedNews} liturgies={upcomingLiturgies} />
            )}
          </div>

          {dashboardQuery.isError && dashboardQuery.data ? (
            <p className="mt-4 text-sm text-[#8d6a2f]">
              Showing the last successful update while the dashboard retries the latest refresh every {refreshIntervalSeconds} seconds.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
};
