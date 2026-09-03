import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useDashboardSettings, usePublicDashboard } from "../lib/church-dashboard";
import { defaultDashboardSettings } from "../../shared/church-dashboard";

const displayValue = (value?: string) => value?.trim() || "Not set";

export const AdminHomePage = () => {
  const settingsQuery = useDashboardSettings();
  const dashboardQuery = usePublicDashboard();
  const settings = settingsQuery.data ?? defaultDashboardSettings;
  const activeExpensesCount = dashboardQuery.data?.projects.length ?? 0;
  const activeNewsCount = dashboardQuery.data?.news.length ?? 0;
  const upcomingLiturgiesCount = dashboardQuery.data?.liturgies.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Active Expenses</CardTitle>
            <CardDescription>Visible on the public dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{activeExpensesCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Active News</CardTitle>
            <CardDescription>Visible on the public dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{activeNewsCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Upcoming Liturgies</CardTitle>
            <CardDescription>From the configured calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-[#112947]">{upcomingLiturgiesCount}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Dashboard Settings Summary</CardTitle>
            <CardDescription>Current settings across the public dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Public Display</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Church name</dt><dd className="text-right font-medium text-[#112947]">{displayValue(settings?.common.churchName)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Clock</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.showClock ? "Shown" : "Hidden"}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Date</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.showDate ? "Shown" : "Hidden"}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Expenses page</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.showExpensesPage ? "Enabled" : "Disabled"}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">News page</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.showNewsPage ? "Enabled" : "Disabled"}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Refresh interval</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.refreshIntervalSeconds}s</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Rotation interval</dt><dd className="text-right font-medium text-[#112947]">{settings?.common.mainViewRotationIntervalSeconds}s</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Verse text</dt><dd className="max-w-[60%] text-right font-medium text-[#112947]">{displayValue(settings?.common.mainVerseText)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Verse reference</dt><dd className="text-right font-medium text-[#112947]">{displayValue(settings?.common.mainVerseReference)}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Projects & Expenses</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Dashboard title</dt><dd className="text-right font-medium text-[#112947]">{displayValue(settings?.expenses.dashboardTitle)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Church website</dt><dd className="max-w-[60%] break-all text-right font-medium text-[#112947]">{displayValue(settings?.expenses.churchWebsiteUrl)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Donation URL</dt><dd className="max-w-[60%] break-all text-right font-medium text-[#112947]">{displayValue(settings?.expenses.donationUrl)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">E-transfer text</dt><dd className="max-w-[60%] text-right font-medium text-[#112947]">{displayValue(settings?.expenses.eTransferText)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Expenses per page</dt><dd className="text-right font-medium text-[#112947]">{settings?.expenses.itemsPerPage}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Church News</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Dashboard title</dt><dd className="text-right font-medium text-[#112947]">{displayValue(settings?.news.dashboardTitle)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Announcements per page</dt><dd className="text-right font-medium text-[#112947]">{settings?.news.itemsPerPage}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl bg-[#f4f7fc] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7a8eab]">Liturgy Calendar</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Calendar ID</dt><dd className="max-w-[60%] break-all text-right font-medium text-[#112947]">{displayValue(settings?.liturgy.googleCalendarId)}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">API key</dt><dd className="text-right font-medium text-[#112947]">{settings?.liturgy.googleCalendarApiKey?.trim() ? "Configured" : "Not configured"}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Look ahead</dt><dd className="text-right font-medium text-[#112947]">{settings?.liturgy.lookAheadWeeks} weeks</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-[#6a7f9a]">Liturgies to display</dt><dd className="text-right font-medium text-[#112947]">{settings?.liturgy.upcomingLiturgiesCount}</dd></div>
              </dl>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
