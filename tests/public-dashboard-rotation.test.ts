import assert from "node:assert/strict";
import test from "node:test";

const dashboard = await import("../shared/dashboard-rotation.js");
const shared = await import("../shared/church-dashboard.js");
type DashboardView = "projects" | "news" | "didYouKnow";

const settingsFor = (enabled: DashboardView[]) => ({
  ...shared.defaultDashboardSettings,
  common: {
    ...shared.defaultDashboardSettings.common,
    showExpensesPage: enabled.includes("projects"),
    showNewsPage: enabled.includes("news"),
    showDidYouKnowPage: enabled.includes("didYouKnow"),
  },
});

const next = (activeView: DashboardView, enabledViews: DashboardView[], indexes = { projects: 0, news: 0, didYouKnow: 0 }, counts = { projects: 1, news: 1, didYouKnow: 1 }) =>
  dashboard.getNextDashboardViewState({
    activeView,
    enabledViews,
    expensePageIndex: indexes.projects,
    newsPageIndex: indexes.news,
    didYouKnowPageIndex: indexes.didYouKnow,
    projectPageCount: counts.projects,
    newsPageCount: counts.news,
    didYouKnowPageCount: counts.didYouKnow,
  });

test("dashboard rotation includes each enabled view and its pages", () => {
  const enabled = dashboard.getEnabledDashboardViews(settingsFor(["projects", "news", "didYouKnow"])) as DashboardView[];
  assert.deepEqual(enabled, ["projects", "news", "didYouKnow"]);
  assert.equal(next("projects", enabled, { projects: 0, news: 0, didYouKnow: 0 }, { projects: 2, news: 1, didYouKnow: 2 })?.expensePageIndex, 1);
  assert.equal(next("projects", enabled, { projects: 1, news: 0, didYouKnow: 0 })?.activeView, "news");
  assert.equal(next("news", enabled)?.activeView, "didYouKnow");
  assert.equal(next("didYouKnow", enabled, { projects: 0, news: 0, didYouKnow: 0 }, { projects: 1, news: 1, didYouKnow: 2 })?.didYouKnowPageIndex, 1);
  assert.equal(next("didYouKnow", enabled, { projects: 0, news: 0, didYouKnow: 1 }, { projects: 1, news: 1, didYouKnow: 2 })?.activeView, "projects");
});

test("dashboard rotation safely handles every requested enabled-view combination", () => {
  const combinations: DashboardView[][] = [
    ["projects", "didYouKnow"],
    ["news", "didYouKnow"],
    ["didYouKnow"],
    ["projects"],
    [],
  ];

  for (const combination of combinations) {
    const enabled = dashboard.getEnabledDashboardViews(settingsFor(combination)) as DashboardView[];
    if (!enabled.length) {
      assert.equal(dashboard.getSafeDashboardView("projects", enabled), null);
      continue;
    }
    const active = enabled[0];
    const state = next(active, enabled);
    assert.ok(state);
    assert.ok(enabled.includes(state.activeView));
  }
});
