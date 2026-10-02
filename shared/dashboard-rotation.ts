import type { DashboardSettings } from "./church-dashboard.js";

export type DashboardView = "projects" | "news" | "didYouKnow";

export const getEnabledDashboardViews = (settings: Pick<DashboardSettings, "common">): DashboardView[] => {
  const views: DashboardView[] = [];
  if (settings.common.showExpensesPage) views.push("projects");
  if (settings.common.showNewsPage) views.push("news");
  if (settings.common.showDidYouKnowPage) views.push("didYouKnow");
  return views;
};

export const getSafeDashboardView = (activeView: DashboardView, enabledViews: DashboardView[]) =>
  enabledViews.includes(activeView) ? activeView : (enabledViews[0] ?? null);

export const getNextDashboardViewState = ({
  activeView,
  expensePageIndex,
  newsPageIndex,
  didYouKnowPageIndex,
  projectPageCount,
  newsPageCount,
  didYouKnowPageCount,
  enabledViews,
}: {
  activeView: DashboardView;
  expensePageIndex: number;
  newsPageIndex: number;
  didYouKnowPageIndex: number;
  projectPageCount: number;
  newsPageCount: number;
  didYouKnowPageCount: number;
  enabledViews: DashboardView[];
}) => {
  const currentIndex = enabledViews.indexOf(activeView);
  if (currentIndex === -1) return null;

  const nextView = () => enabledViews[(currentIndex + 1) % enabledViews.length] ?? activeView;
  const reset = () => ({ activeView: nextView(), expensePageIndex: 0, newsPageIndex: 0, didYouKnowPageIndex: 0 });

  if (activeView === "projects") {
    return expensePageIndex < projectPageCount - 1
      ? { activeView, expensePageIndex: expensePageIndex + 1, newsPageIndex, didYouKnowPageIndex }
      : reset();
  }
  if (activeView === "news") {
    return newsPageIndex < newsPageCount - 1
      ? { activeView, expensePageIndex, newsPageIndex: newsPageIndex + 1, didYouKnowPageIndex }
      : reset();
  }
  return didYouKnowPageIndex < didYouKnowPageCount - 1
    ? { activeView, expensePageIndex, newsPageIndex, didYouKnowPageIndex: didYouKnowPageIndex + 1 }
    : reset();
};
