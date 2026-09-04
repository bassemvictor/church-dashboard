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

test("isExpenseVisible respects the stored visibility timestamp", () => {
  const visible = churchDashboard.isExpenseVisible({
    active: true,
    visibleFrom: "2026-08-27T00:00:00.000Z",
    visibleUntil: "2026-08-30T00:00:00.000Z",
    requiresApproval: true,
    approvalStatus: "APPROVED",
  }, "2026-08-30T00:00:00.001Z");

  assert.equal(visible, false);
});
