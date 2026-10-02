import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { VisibilityWindowFields } from "../components/dashboard/visibility-window-fields";
import { FormDrawer } from "../components/common/form-drawer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  churchNewsCategoryChoices,
  getIconComponent,
  iconChoices,
  isNewsVisible,
  newsCategoryLabels,
  useAdminNews,
  useDeleteNews,
  useReorderNews,
  useSaveNews,
  useSetNewsActive,
} from "../lib/church-dashboard";
import {
  getVisibilityRangeError,
  normalizeDateValue,
  normalizeOptionalValue,
  toDateInputValue,
  toDateTimeInputValue,
} from "../lib/church-dashboard-visibility";
import {
  type ChurchNews,
  type CreateChurchNewsInput,
  getNewsApprovalStatus,
} from "../../shared/church-dashboard";

type NewsDraft = CreateChurchNewsInput;

const buildEmptyDraft = (): NewsDraft => ({
  title: "",
  description: "",
  category: "GENERAL",
  eventDate: "",
  startDate: "",
  endDate: "",
  requiresApproval: false,
  location: "",
  icon: "church",
  active: true,
  priority: 0,
});

const buildDraftFromNews = (news: ChurchNews): NewsDraft => ({
  title: news.title,
  description: news.description ?? "",
  category: news.category ?? "GENERAL",
  eventDate: toDateTimeInputValue(news.eventDate),
  startDate: toDateInputValue(news.startDate),
  endDate: toDateInputValue(news.endDate),
  requiresApproval: news.requiresApproval ?? false,
  location: news.location ?? "",
  icon: news.icon ?? "church",
  active: news.active,
  priority: news.priority ?? 0,
});

const reorderItems = (items: ChurchNews[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const formatEventSummary = (value?: string) => {
  if (!value) {
    return "No event date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No event date";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const NEWS_EDITOR_FORM_ID = "news-editor-form";

const NewsEditorDialog = ({
  news,
  open,
  onClose,
}: {
  news: ChurchNews | null;
  open: boolean;
  onClose: () => void;
}) => {
  const saveNews = useSaveNews();
  const [draft, setDraft] = useState<NewsDraft>(buildEmptyDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const visibilityRangeError = getVisibilityRangeError(draft.startDate, draft.endDate);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(news ? buildDraftFromNews(news) : buildEmptyDraft());
    setErrorMessage("");
  }, [news, open]);

  const PreviewIcon = getIconComponent(draft.icon);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (visibilityRangeError) {
      setErrorMessage(visibilityRangeError);
      return;
    }

    try {
      await saveNews.mutateAsync({
        id: news?.id,
        values: {
          title: draft.title.trim(),
          description: normalizeOptionalValue(draft.description),
          category: draft.category,
          eventDate: normalizeDateValue(draft.eventDate),
          startDate: normalizeDateValue(draft.startDate),
          endDate: normalizeDateValue(draft.endDate, "end"),
          requiresApproval: draft.requiresApproval,
          location: normalizeOptionalValue(draft.location),
          icon: normalizeOptionalValue(draft.icon),
          active: draft.active,
          priority: draft.priority ?? 0,
        },
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this announcement right now.");
    }
  };

  return (
    <FormDrawer
      busy={saveNews.isPending}
      contentClassName="px-4 py-4 sm:px-5 sm:py-5"
      description="Update how this announcement appears on the church news screen."
      onClose={onClose}
      open={open}
      panelClassName="lg:max-w-[52rem]"
      submitFormId={NEWS_EDITOR_FORM_ID}
      submitLabel={news ? "Save changes" : "Create item"}
      title={news ? "Edit church news item" : "Add church news item"}
    >
      <form className="space-y-5" id={NEWS_EDITOR_FORM_ID} onSubmit={submit}>
        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#112947]">Announcement title</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              required
              value={draft.title}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#112947]">Description</span>
            <Textarea
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              value={draft.description}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Category</span>
            <Select
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as NewsDraft["category"] }))}
              value={draft.category}
            >
              {churchNewsCategoryChoices.map((category) => (
                <option key={category} value={category}>{newsCategoryLabels[category]}</option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Priority</span>
            <Input
              min={0}
              onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) || 0 }))}
              type="number"
              value={draft.priority ?? 0}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Event date & time</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, eventDate: event.target.value }))}
              type="datetime-local"
              value={draft.eventDate ?? ""}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Location</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              value={draft.location ?? ""}
            />
          </label>

          <VisibilityWindowFields
            onVisibleFromChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
            onVisibleUntilChange={(value) => setDraft((current) => ({ ...current, endDate: value }))}
            visibleFrom={draft.startDate}
            visibleUntil={draft.endDate}
          />

          <label className="flex items-center gap-3 rounded-2xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2">
            <Checkbox
              checked={draft.active}
              onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
            />
            Show this announcement on the public dashboard
          </label>

          <label className="flex items-center gap-3 rounded-2xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2">
            <Checkbox
              checked={draft.requiresApproval ?? false}
              onChange={(event) => setDraft((current) => ({ ...current, requiresApproval: event.target.checked }))}
            />
            Requires approval before appearing on the public dashboard
          </label>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium text-[#112947]">Icon selector</p>
            <p className="mt-1 text-xs text-[#556b86]">Choose a visual badge for the announcement.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {iconChoices.map((choice) => {
              const Icon = choice.icon;
              const active = draft.icon === choice.id;

              return (
                <button
                  className={[
                    "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-xs transition",
                    active ? "border-[#112947] bg-[#112947] text-white" : "border-[#dcc9a4] bg-[#fffaf2] text-[#314862]",
                  ].join(" ")}
                  key={choice.id}
                  onClick={() => setDraft((current) => ({ ...current, icon: choice.id }))}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span>{choice.label}</span>
                </button>
              );
            })}
          </div>
          <label className="block space-y-2 rounded-xl border border-[#dbe4f0] bg-[#f8fbff] p-3">
            <span className="text-sm font-medium text-[#112947]">Additional Lucide icon name</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))}
              placeholder="For example: CalendarHeart or calendar-heart"
              value={iconChoices.some((choice) => choice.id === draft.icon) ? "" : (draft.icon ?? "")}
            />
            <span className="block text-xs text-[#556b86]">Enter any icon name from Lucide. An unavailable name will use the church icon.</span>
          </label>
        </section>

        <section className="rounded-3xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
          <p className="text-sm font-medium text-[#112947]">Live announcement preview</p>
          <div className="mt-3 rounded-xl border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#112947] text-white">
                <PreviewIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold uppercase tracking-[0.03em] text-[#112947]">
                    {draft.title || "ANNOUNCEMENT TITLE"}
                  </p>
                  <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d6a2f]">
                    {newsCategoryLabels[draft.category ?? "GENERAL"]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#556b86]">
                  {draft.description || "Announcement details will appear here."}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#8d6a2f]">
                  <span>{formatEventSummary(normalizeDateValue(draft.eventDate))}</span>
                  {draft.location ? <span>{draft.location}</span> : null}
                  <span>Priority {draft.priority ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      </form>
    </FormDrawer>
  );
};

export const AdminNewsPage = () => {
  const newsQuery = useAdminNews();
  const reorderMutation = useReorderNews();
  const deleteMutation = useDeleteNews();
  const setNewsActiveMutation = useSetNewsActive();
  const [orderedNews, setOrderedNews] = useState<ChurchNews[]>([]);
  const [editingNews, setEditingNews] = useState<ChurchNews | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggedNewsId, setDraggedNewsId] = useState<string | null>(null);
  const [togglingNewsId, setTogglingNewsId] = useState<string | null>(null);
  const [toggleErrorMessage, setToggleErrorMessage] = useState("");

  const now = new Date();
  useEffect(() => {
    setOrderedNews(newsQuery.data ?? []);
  }, [newsQuery.data]);

  const pendingApprovalItems = useMemo(
    () => orderedNews.filter((item) => item.requiresApproval && getNewsApprovalStatus(item) === "PENDING"),
    [orderedNews],
  );

  const manageableNews = useMemo(
    () =>
      orderedNews.flatMap((item, index) =>
        item.requiresApproval && getNewsApprovalStatus(item) === "PENDING" ? [] : [{ item, index }],
      ),
    [orderedNews],
  );

  const activeNews = useMemo(
    () => manageableNews.filter((entry) => entry.item.active),
    [manageableNews],
  );

  const inactiveNews = useMemo(
    () => manageableNews.filter((entry) => !entry.item.active),
    [manageableNews],
  );

  const totals = useMemo(() => ({
    active: orderedNews.filter((item) => isNewsVisible(item, now)).length,
    pending: pendingApprovalItems.length,
  }), [now, orderedNews, pendingApprovalItems.length]);

  const persistOrder = async (nextItems: ChurchNews[]) => {
    setOrderedNews(nextItems);

    try {
      await reorderMutation.mutateAsync({
        items: nextItems.map((item, index) => ({
          id: item.id,
          displayOrder: index + 1,
        })),
      });
    } catch {
      setOrderedNews(newsQuery.data ?? []);
    }
  };

  const moveItem = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedNews.length || fromIndex === toIndex || fromIndex < 0) {
      return;
    }

    await persistOrder(reorderItems(orderedNews, fromIndex, toIndex));
  };

  const toggleNewsActiveState = async (news: ChurchNews, active: boolean) => {
    const previousItems = orderedNews;
    const nextItems = orderedNews.map((item) => (
      item.id === news.id ? { ...item, active } : item
    ));

    setToggleErrorMessage("");
    setTogglingNewsId(news.id);
    setOrderedNews(nextItems);

    try {
      await setNewsActiveMutation.mutateAsync({
        newsId: news.id,
        active,
      });
    } catch (error) {
      setOrderedNews(previousItems);
      setToggleErrorMessage(error instanceof Error ? error.message : "Unable to update this announcement right now.");
    } finally {
      setTogglingNewsId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toggleErrorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {toggleErrorMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          className="h-10 rounded-xl px-4"
          onClick={() => {
            setEditingNews(null);
            setIsEditorOpen(true);
          }}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{orderedNews.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Active on display</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{totals.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Pending approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-[#112947]">{totals.pending}</p>
              <Link
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-3 text-xs font-medium leading-none text-foreground transition-colors hover:bg-accent"
                to="/admin/pending-approvals"
              >
                Open queue
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-[#dbe4f0] bg-white">
        <CardHeader>
          <CardTitle>Active news entries</CardTitle>
          <CardDescription>Higher priority items can still float to the top on the TV, but this order remains the base sequence until you deactivate an item.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeNews.length && !newsQuery.isLoading ? (
            <div className="rounded-3xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-10 text-center">
              <p className="text-lg font-semibold text-[#112947]">No active announcements</p>
              <p className="mt-2 text-sm text-[#556b86]">Create a news item or reactivate one from the inactive section below.</p>
            </div>
          ) : null}

          {activeNews.map(({ item, index: originalIndex }, index) => {
            const Icon = getIconComponent(item.icon);
            const approvalStatus = getNewsApprovalStatus(item);
            const previousItem = activeNews[index - 1];
            const nextItem = activeNews[index + 1];

            return (
              <article
                className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)] md:grid-cols-[auto_minmax(0,1fr)_auto]"
                draggable
                key={item.id}
                onDragEnd={() => setDraggedNewsId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDragStart={() => setDraggedNewsId(item.id)}
                onDrop={() => {
                  if (!draggedNewsId || draggedNewsId === item.id) {
                    return;
                  }

                  const fromIndex = orderedNews.findIndex((entry) => entry.id === draggedNewsId);
                  void moveItem(fromIndex, originalIndex);
                  setDraggedNewsId(null);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-[#112947] text-white">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f2e7] text-[#112947]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#112947]">{item.title}</h3>
                    <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d6a2f]">
                      {newsCategoryLabels[item.category ?? "GENERAL"]}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.active ? "Active" : "Hidden"}
                    </span>
                    {approvalStatus === "APPROVED" ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        Approved
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#556b86]">{item.description || "No description provided."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#8d6a2f]">
                    <span>{formatEventSummary(item.eventDate)}</span>
                    {item.location ? <span>{item.location}</span> : null}
                    <span>Priority {item.priority ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-end gap-2">
                  <Button
                    onClick={() => void moveItem(originalIndex, previousItem?.index ?? originalIndex)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => void moveItem(originalIndex, nextItem?.index ?? originalIndex)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={togglingNewsId === item.id}
                    onClick={() => void toggleNewsActiveState(item, false)}
                    type="button"
                    variant="outline"
                  >
                    <EyeOff className="h-4 w-4" />
                    Deactivate
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingNews(item);
                      setIsEditorOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() => void deleteMutation.mutateAsync(item.id)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-xl border-[#dbe4f0] bg-white">
        <CardHeader>
          <CardTitle>Inactive news entries</CardTitle>
          <CardDescription>These announcements stay off the public dashboard until you activate them again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!inactiveNews.length ? (
            <div className="rounded-3xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-8 text-center">
              <p className="text-base font-semibold text-[#112947]">No inactive announcements</p>
            </div>
          ) : null}

          {inactiveNews.map(({ item, index: originalIndex }, index) => {
            const Icon = getIconComponent(item.icon);
            const approvalStatus = getNewsApprovalStatus(item);
            const previousItem = inactiveNews[index - 1];
            const nextItem = inactiveNews[index + 1];

            return (
              <article
                className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)] md:grid-cols-[auto_minmax(0,1fr)_auto]"
                draggable
                key={item.id}
                onDragEnd={() => setDraggedNewsId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDragStart={() => setDraggedNewsId(item.id)}
                onDrop={() => {
                  if (!draggedNewsId || draggedNewsId === item.id) {
                    return;
                  }

                  const fromIndex = orderedNews.findIndex((entry) => entry.id === draggedNewsId);
                  void moveItem(fromIndex, originalIndex);
                  setDraggedNewsId(null);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-[#112947] text-white">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f2e7] text-[#112947]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#112947]">{item.title}</h3>
                    <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d6a2f]">
                      {newsCategoryLabels[item.category ?? "GENERAL"]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Inactive
                    </span>
                    {approvalStatus === "APPROVED" ? (
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                        Approved
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[#556b86]">{item.description || "No description provided."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#8d6a2f]">
                    <span>{formatEventSummary(item.eventDate)}</span>
                    {item.location ? <span>{item.location}</span> : null}
                    <span>Priority {item.priority ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-end gap-2">
                  <Button
                    onClick={() => void moveItem(originalIndex, previousItem?.index ?? originalIndex)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => void moveItem(originalIndex, nextItem?.index ?? originalIndex)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={togglingNewsId === item.id}
                    onClick={() => void toggleNewsActiveState(item, true)}
                    type="button"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                    Activate
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingNews(item);
                      setIsEditorOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={deleteMutation.isPending}
                    onClick={() => void deleteMutation.mutateAsync(item.id)}
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>

      <NewsEditorDialog
        news={editingNews}
        onClose={() => {
          setEditingNews(null);
          setIsEditorOpen(false);
        }}
        open={isEditorOpen}
      />
    </div>
  );
};
