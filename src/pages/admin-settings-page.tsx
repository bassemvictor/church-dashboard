import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { ToastStack, type ToastItem } from "./calendar-shared";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useDashboardSettings, useSaveSettings } from "../lib/church-dashboard";
import { cn } from "../lib/utils";
import type { DashboardSettings } from "../../shared/church-dashboard";

type SettingsSection = "common" | "expenses" | "news" | "liturgy";

const sectionOptions: Array<{ id: SettingsSection; label: string }> = [
  { id: "common", label: "Common" },
  { id: "expenses", label: "Projects & Expenses" },
  { id: "news", label: "Church News" },
  { id: "liturgy", label: "Liturgy Calendar" },
];

const sectionCopy: Record<
  SettingsSection,
  {
    title: string;
    description: string;
    saveLabel: string;
    successMessage: string;
    errorMessage: string;
  }
> = {
  common: {
    title: "Common Settings",
    description: "These settings affect the full public display, regardless of which dashboard view is showing.",
    saveLabel: "Save common settings",
    successMessage: "Common settings saved.",
    errorMessage: "Unable to save common settings right now.",
  },
  expenses: {
    title: "Projects & Expenses Settings",
    description: "Configure the projects display and giving information shown on the expenses screen.",
    saveLabel: "Save projects settings",
    successMessage: "Projects & expenses settings saved.",
    errorMessage: "Unable to save projects & expenses settings right now.",
  },
  news: {
    title: "Church News Settings",
    description: "Configure the public announcements screen.",
    saveLabel: "Save news settings",
    successMessage: "Church news settings saved.",
    errorMessage: "Unable to save church news settings right now.",
  },
  liturgy: {
    title: "Liturgy Calendar Settings",
    description: "Connect the dashboard liturgy section to a public Google Calendar, choose how far ahead it looks, and control how many upcoming liturgies appear.",
    saveLabel: "Save liturgy calendar settings",
    successMessage: "Liturgy calendar settings saved.",
    errorMessage: "Unable to save liturgy calendar settings right now.",
  },
};

const addToast = (
  setToasts: Dispatch<SetStateAction<ToastItem[]>>,
  toast: Omit<ToastItem, "id">,
) => {
  const id = crypto.randomUUID();
  setToasts((current) => [...current, { ...toast, id }]);
  window.setTimeout(() => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, 2800);
};

const sectionsEqual = (left: DashboardSettings[SettingsSection], right: DashboardSettings[SettingsSection]) =>
  JSON.stringify(left) === JSON.stringify(right);

export const AdminSettingsPage = () => {
  const settingsQuery = useDashboardSettings();
  const saveSettings = useSaveSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>("common");
  const [draft, setDraft] = useState<DashboardSettings | null>(null);
  const [savedSettings, setSavedSettings] = useState<DashboardSettings | null>(null);
  const [savingSection, setSavingSection] = useState<SettingsSection | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
      setSavedSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  if (!draft || !savedSettings) {
    return null;
  }

  const hasUnsavedChanges = (section: SettingsSection) => !sectionsEqual(draft[section], savedSettings[section]);

  const saveSection = async (section: SettingsSection) => {
    const payload: DashboardSettings = {
      ...savedSettings,
      [section]: draft[section],
    };

    setSavingSection(section);

    try {
      const response = await saveSettings.mutateAsync(payload);
      setSavedSettings((current) => (current ? { ...current, [section]: response.settings[section] } : response.settings));
      setDraft((current) => (current ? { ...current, [section]: response.settings[section] } : response.settings));
      addToast(setToasts, { message: sectionCopy[section].successMessage, tone: "success" });
    } catch (reason) {
      addToast(setToasts, {
        message: reason instanceof Error ? reason.message : sectionCopy[section].errorMessage,
        tone: "error",
      });
    } finally {
      setSavingSection(null);
    }
  };

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} />

      <div className="rounded-xl border border-[#dbe4f0] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(16,33,61,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7a8eab]">Settings</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#112947]">Configure the public display, Projects & Expenses, Church News, and the liturgy calendar feed.</h2>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex min-w-full gap-2 rounded-xl border border-[#dbe4f0] bg-white p-2 shadow-[0_10px_24px_rgba(16,33,61,0.04)] sm:min-w-0">
          {sectionOptions.map((section) => {
            const isActive = activeSection === section.id;
            const isDirty = hasUnsavedChanges(section.id);

            return (
              <button
                className={cn(
                  "inline-flex min-w-fit items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-[#112947] text-white shadow-[0_10px_20px_rgba(17,41,71,0.18)]"
                    : "text-[#556b86] hover:bg-[#f4f7fc] hover:text-[#112947]",
                )}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
                {isDirty ? <span className="ml-2 rounded-full bg-white/18 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]">{isActive ? "Edited" : "New"}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7a8eab]">{sectionCopy[activeSection].title}</p>
          <p className="mt-2 max-w-3xl text-sm text-[#6a7f9a]">{sectionCopy[activeSection].description}</p>
        </div>

        {activeSection === "common" ? (
          <>
            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Church identity</CardTitle>
                <CardDescription>Primary church name shown across the full public display.</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Church name</span>
                  <Input
                    value={draft.common.churchName}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        common: { ...draft.common, churchName: event.target.value },
                      })}
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Scripture verse</CardTitle>
                <CardDescription>Verse content shown in the public dashboard header.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#112947]">Verse text</span>
                  <Textarea
                    value={draft.common.mainVerseText ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        common: { ...draft.common, mainVerseText: event.target.value },
                      })}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Verse reference</span>
                  <Input
                    value={draft.common.mainVerseReference ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        common: { ...draft.common, mainVerseReference: event.target.value },
                      })}
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Public display</CardTitle>
                <CardDescription>Global timing and information shown regardless of which screen is active.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="max-w-[14rem] space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Data refresh interval (seconds)</span>
                  <Input
                    min={15}
                    type="number"
                    value={draft.common.refreshIntervalSeconds}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        common: { ...draft.common, refreshIntervalSeconds: Number(event.target.value) || 300 },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">How often the public display refreshes its dashboard data.</p>
                </label>

                <label className="max-w-[16rem] space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Screen rotation interval (seconds)</span>
                  <Input
                    min={5}
                    type="number"
                    value={draft.common.mainViewRotationIntervalSeconds}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        common: { ...draft.common, mainViewRotationIntervalSeconds: Number(event.target.value) || 30 },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">How long each dashboard section remains visible before switching to the next one.</p>
                </label>

                <div className="space-y-3 rounded-2xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2 md:max-w-[20rem]">
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={draft.common.showClock}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          common: { ...draft.common, showClock: event.target.checked },
                        })}
                    />
                    Show live clock
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={draft.common.showDate}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          common: { ...draft.common, showDate: event.target.checked },
                        })}
                    />
                    Show current date
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={draft.common.showExpensesPage}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          common: { ...draft.common, showExpensesPage: event.target.checked },
                        })}
                    />
                    Show expenses page
                  </label>
                  <label className="flex items-center gap-3">
                    <Checkbox
                      checked={draft.common.showNewsPage}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          common: { ...draft.common, showNewsPage: event.target.checked },
                        })}
                    />
                    Show news page
                  </label>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeSection === "expenses" ? (
          <>
            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Page identity</CardTitle>
                <CardDescription>Headline content shown when the projects and expenses screen is active.</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Dashboard title</span>
                  <Input
                    value={draft.expenses.dashboardTitle}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenses: { ...draft.expenses, dashboardTitle: event.target.value },
                      })}
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Giving information</CardTitle>
                <CardDescription>Donation information shown in the projects footer.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Church website URL</span>
                  <Input
                    value={draft.expenses.churchWebsiteUrl ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenses: { ...draft.expenses, churchWebsiteUrl: event.target.value },
                      })}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Donation URL</span>
                  <Input
                    value={draft.expenses.donationUrl ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenses: { ...draft.expenses, donationUrl: event.target.value },
                      })}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">E-transfer text</span>
                  <Input
                    value={draft.expenses.eTransferText ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenses: { ...draft.expenses, eTransferText: event.target.value },
                      })}
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Display settings</CardTitle>
                <CardDescription>Projects pagination settings for the public display.</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="max-w-[14rem] space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Projects & expenses per page</span>
                  <Input
                    min={1}
                    type="number"
                    value={draft.expenses.itemsPerPage}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenses: { ...draft.expenses, itemsPerPage: Number(event.target.value) || 4 },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">Maximum number of project rows shown on one screen.</p>
                </label>
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeSection === "news" ? (
          <>
            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Page identity</CardTitle>
                <CardDescription>Heading shown when the church news screen is active.</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">News page title</span>
                  <Input
                    value={draft.news.dashboardTitle}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        news: { ...draft.news, dashboardTitle: event.target.value },
                      })}
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Display settings</CardTitle>
                <CardDescription>How many announcements the public screen shows.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="max-w-[14rem] space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Announcements per page</span>
                  <Input
                    min={1}
                    type="number"
                    value={draft.news.itemsPerPage}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        news: { ...draft.news, itemsPerPage: Number(event.target.value) || 4 },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">Maximum number of announcements shown on one screen.</p>
                </label>
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeSection === "liturgy" ? (
          <>
            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Google Calendar source</CardTitle>
                <CardDescription>
                  When both the public calendar ID and API key are filled in, the dashboard uses Google Calendar for upcoming Divine Liturgy events.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Public Google Calendar ID</span>
                  <Input
                    placeholder="example@group.calendar.google.com"
                    value={draft.liturgy.googleCalendarId ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        liturgy: { ...draft.liturgy, googleCalendarId: event.target.value },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">Use the public calendar ID that appears in the Google Calendar integration settings.</p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Google Calendar API key</span>
                  <Input
                    placeholder="AIza..."
                    value={draft.liturgy.googleCalendarApiKey ?? ""}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        liturgy: { ...draft.liturgy, googleCalendarApiKey: event.target.value },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">This key is used server-side to read the public calendar feed.</p>
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-[#dbe4f0] bg-white">
              <CardHeader>
                <CardTitle>Upcoming window</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                <label className="max-w-[14rem] space-y-2">
                  <span className="text-sm font-medium text-[#112947]">Look ahead (weeks)</span>
                  <Input
                    max={8}
                    min={1}
                    type="number"
                    value={draft.liturgy.lookAheadWeeks}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        liturgy: {
                          ...draft.liturgy,
                          lookAheadWeeks: Math.max(1, Math.min(8, Number(event.target.value) || 3)),
                        },
                      })}
                  />
                  <p className="text-xs text-[#6a7f9a]">Use `2` or `3` weeks for the expected setup, or choose up to `8` weeks if needed.</p>
                </label>

                <div className="space-y-4">
                  <label className="block max-w-[18rem] space-y-2">
                    <span className="text-sm font-medium text-[#112947]">Number of upcoming liturgies to display</span>
                    <Input
                      max={10}
                      min={1}
                      type="number"
                      value={draft.liturgy.upcomingLiturgiesCount}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          liturgy: {
                            ...draft.liturgy,
                            upcomingLiturgiesCount: Math.max(1, Math.min(10, Number(event.target.value) || 3)),
                          },
                        })}
                    />
                    <p className="text-xs text-[#6a7f9a]">Choose between 1 and 10 upcoming liturgies. The default is 3.</p>
                  </label>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        <div className="flex justify-end">
          <Button
            className="h-10 rounded-xl px-4"
            disabled={saveSettings.isPending || !hasUnsavedChanges(activeSection)}
            onClick={() => void saveSection(activeSection)}
            type="button"
          >
            {savingSection === activeSection ? "Saving..." : sectionCopy[activeSection].saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
