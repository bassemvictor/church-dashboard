import assert from "node:assert/strict";
import test from "node:test";

process.env.TZ = "America/Toronto";

const visibilityUtils = await import("../src/lib/church-dashboard-visibility.js");
const churchDashboard = await import("../shared/church-dashboard.js");

test("normalizeDateValue stores visible-until dates at the end of the local day", () => {
  assert.equal(
    visibilityUtils.normalizeDateValue("2026-08-30", "end"),
    "2026-08-31T03:59:59.999Z",
  );
});

test("isExpenseVisible keeps legacy UTC-midnight visibleUntil records visible through the full local day", () => {
  const visible = churchDashboard.isExpenseVisible({
    active: true,
    visibleFrom: "2026-08-27T00:00:00.000Z",
    visibleUntil: "2026-08-30T00:00:00.000Z",
    requiresApproval: true,
    approvalStatus: "APPROVED",
  }, "2026-08-30T01:25:40.000Z");

  assert.equal(visible, true);
});

test("isExpenseVisible hides legacy UTC-midnight visibleUntil records after the local day ends", () => {
  const visible = churchDashboard.isExpenseVisible({
    active: true,
    visibleFrom: "2026-08-27T00:00:00.000Z",
    visibleUntil: "2026-08-30T00:00:00.000Z",
    requiresApproval: true,
    approvalStatus: "APPROVED",
  }, "2026-08-31T04:00:00.000Z");

  assert.equal(visible, false);
});
