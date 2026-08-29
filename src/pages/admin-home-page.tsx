import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { formatCurrency, useAdminExpenses, useDashboardSettings } from "../lib/church-dashboard";

export const AdminHomePage = () => {
  const expensesQuery = useAdminExpenses();
  const settingsQuery = useDashboardSettings();
  const expenses = expensesQuery.data ?? [];
  const totalBudget = expenses.reduce((sum, item) => sum + item.totalBudget, 0);
  const fundedAmount = expenses.reduce((sum, item) => sum + item.fundedAmount, 0);
  const activeCount = expenses.filter((item) => item.active).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Active Items</CardTitle>
            <CardDescription>Visible on the public screen</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total Budget</CardTitle>
            <CardDescription>Across all records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total Funded</CardTitle>
            <CardDescription>Current contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{formatCurrency(fundedAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Dashboard Snapshot</CardTitle>
            <CardDescription>Current presentation text and timing</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Church Name</p>
              <p className="mt-2 text-xl font-semibold text-[#112947]">{settingsQuery.data?.common.churchName}</p>
            </div>
            <div className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Refresh Interval</p>
              <p className="mt-2 text-xl font-semibold text-[#112947]">{settingsQuery.data?.common.refreshIntervalSeconds}s</p>
            </div>
            <div className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Rotation Interval</p>
              <p className="mt-2 text-xl font-semibold text-[#112947]">{settingsQuery.data?.common.mainViewRotationIntervalSeconds}s</p>
            </div>
            <div className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Announcements Per Page</p>
              <p className="mt-2 text-xl font-semibold text-[#112947]">{settingsQuery.data?.news.itemsPerPage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
