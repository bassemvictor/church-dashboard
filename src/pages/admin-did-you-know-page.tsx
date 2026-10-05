import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { VisibilityWindowFields } from "../components/dashboard/visibility-window-fields";
import { FormDrawer } from "../components/common/form-drawer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  getIconComponent,
  iconChoices,
  isDidYouKnowVisible,
  useAdminDidYouKnow,
  useDeleteDidYouKnow,
  useReorderDidYouKnow,
  useSaveDidYouKnow,
  useSetDidYouKnowActive,
} from "../lib/church-dashboard";
import {
  getVisibilityRangeError,
  normalizeDateValue,
  normalizeOptionalValue,
  toDateInputValue,
} from "../lib/church-dashboard-visibility";
import type { ChurchDidYouKnow, CreateChurchDidYouKnowInput } from "../../shared/church-dashboard";

type DidYouKnowDraft = CreateChurchDidYouKnowInput;

const DID_YOU_KNOW_EDITOR_FORM_ID = "did-you-know-editor-form";

const buildEmptyDraft = (): DidYouKnowDraft => ({
  factText: "",
  highlightText: "",
  supportingText: "",
  icon: "coins",
  colorTheme: "default",
  visibleFrom: "",
  visibleUntil: "",
  active: true,
});

const buildDraftFromItem = (item: ChurchDidYouKnow): DidYouKnowDraft => ({
  factText: item.factText,
  highlightText: item.highlightText ?? "",
  supportingText: item.supportingText ?? "",
  icon: item.icon ?? "coins",
  colorTheme: item.colorTheme ?? "default",
  visibleFrom: toDateInputValue(item.visibleFrom),
  visibleUntil: toDateInputValue(item.visibleUntil),
  active: item.active,
});

const reorderItems = (items: ChurchDidYouKnow[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const formatVisibilityDate = (value?: string) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const DidYouKnowEditor = ({ item, open, onClose }: { item: ChurchDidYouKnow | null; open: boolean; onClose: () => void }) => {
  const saveItem = useSaveDidYouKnow();
  const [draft, setDraft] = useState<DidYouKnowDraft>(buildEmptyDraft());
  const [errorMessage, setErrorMessage] = useState("");
  const visibilityRangeError = getVisibilityRangeError(draft.visibleFrom, draft.visibleUntil);
  const PreviewIcon = getIconComponent(draft.icon);

  useEffect(() => {
    if (!open) return;
    setDraft(item ? buildDraftFromItem(item) : buildEmptyDraft());
    setErrorMessage("");
  }, [item, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    if (visibilityRangeError) {
      setErrorMessage(visibilityRangeError);
      return;
    }
    try {
      await saveItem.mutateAsync({
        id: item?.id,
        values: {
          factText: draft.factText.trim(),
          highlightText: normalizeOptionalValue(draft.highlightText),
          supportingText: normalizeOptionalValue(draft.supportingText),
          icon: normalizeOptionalValue(draft.icon),
          colorTheme: draft.colorTheme === "default" ? undefined : draft.colorTheme,
          visibleFrom: normalizeDateValue(draft.visibleFrom),
          visibleUntil: normalizeDateValue(draft.visibleUntil, "end"),
          active: draft.active,
        },
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this fact right now.");
    }
  };

  return (
    <FormDrawer
      busy={saveItem.isPending}
      contentClassName="px-4 py-4 sm:px-5 sm:py-5"
      description="Create concise facts for the church TV display. Highlights and supporting text are optional."
      onClose={onClose}
      open={open}
      panelClassName="lg:max-w-[52rem]"
      submitFormId={DID_YOU_KNOW_EDITOR_FORM_ID}
      submitLabel={item ? "Save changes" : "Create fact"}
      title={item ? "Edit Did You Know fact" : "Add Did You Know fact"}
    >
      <form className="space-y-5" id={DID_YOU_KNOW_EDITOR_FORM_ID} onSubmit={submit}>
        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#112947]">Fact text</span>
            <Textarea onChange={(event) => setDraft((current) => ({ ...current, factText: event.target.value }))} placeholder="Did you know that the church monthly operating expenses are about" required rows={3} value={draft.factText} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Highlight text</span>
            <Input onChange={(event) => setDraft((current) => ({ ...current, highlightText: event.target.value }))} placeholder="$100,000?" value={draft.highlightText ?? ""} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Supporting text</span>
            <Textarea onChange={(event) => setDraft((current) => ({ ...current, supportingText: event.target.value }))} placeholder="Your support helps keep our church running and serving our community." rows={2} value={draft.supportingText ?? ""} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Card color</span>
            <Select onChange={(event) => setDraft((current) => ({ ...current, colorTheme: event.target.value as DidYouKnowDraft["colorTheme"] }))} value={draft.colorTheme ?? "default"}>
              <option value="default">Default navy and cream</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="rose">Rose</option>
              <option value="violet">Violet</option>
            </Select>
          </label>
          <VisibilityWindowFields onVisibleFromChange={(value) => setDraft((current) => ({ ...current, visibleFrom: value }))} onVisibleUntilChange={(value) => setDraft((current) => ({ ...current, visibleUntil: value }))} visibleFrom={draft.visibleFrom} visibleUntil={draft.visibleUntil} />
          <label className="flex items-center gap-3 rounded-2xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2">
            <Checkbox checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} />
            Show this fact on the public dashboard
          </label>
        </section>

        <section className="space-y-3">
          <div><p className="text-sm font-medium text-[#112947]">Icon selector</p><p className="mt-1 text-xs text-[#556b86]">Choose a visual cue for the fact.</p></div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {iconChoices.map((choice) => {
              const Icon = choice.icon;
              const selected = draft.icon === choice.id;
              return <button className={["flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-xs transition", selected ? "border-[#112947] bg-[#112947] text-white" : "border-[#dcc9a4] bg-[#fffaf2] text-[#314862]"].join(" ")} key={choice.id} onClick={() => setDraft((current) => ({ ...current, icon: choice.id }))} type="button"><Icon className="h-5 w-5" /><span>{choice.label}</span></button>;
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
          <p className="text-sm font-medium text-[#112947]">Live fact preview</p>
          <div className="mt-3 flex gap-4 rounded-xl border border-[#dbe4f0] bg-white p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#112947] text-white"><PreviewIcon className="h-6 w-6" /></div>
            <div className="min-w-0"><p className="text-base leading-relaxed text-[#304964]">{draft.factText || "Did you know…"}</p>{draft.highlightText ? <p className="mt-1 text-xl font-semibold text-[#8d6a2f]">{draft.highlightText}</p> : null}{draft.supportingText ? <p className="mt-2 text-sm text-[#556b86]">{draft.supportingText}</p> : null}</div>
          </div>
        </section>
        {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
      </form>
    </FormDrawer>
  );
};

export const AdminDidYouKnowPage = () => {
  const itemsQuery = useAdminDidYouKnow();
  const reorderMutation = useReorderDidYouKnow();
  const deleteMutation = useDeleteDidYouKnow();
  const setActiveMutation = useSetDidYouKnowActive();
  const [orderedItems, setOrderedItems] = useState<ChurchDidYouKnow[]>([]);
  const [editingItem, setEditingItem] = useState<ChurchDidYouKnow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const now = new Date();

  useEffect(() => { setOrderedItems(itemsQuery.data ?? []); }, [itemsQuery.data]);
  const visibleCount = useMemo(() => orderedItems.filter((item) => isDidYouKnowVisible(item, now)).length, [now, orderedItems]);

  const persistOrder = async (nextItems: ChurchDidYouKnow[]) => {
    setOrderedItems(nextItems);
    try { await reorderMutation.mutateAsync({ items: nextItems.map((item, index) => ({ id: item.id, displayOrder: index + 1 })) }); }
    catch { setOrderedItems(itemsQuery.data ?? []); setErrorMessage("Unable to save the new display order right now."); }
  };
  const moveItem = async (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || toIndex >= orderedItems.length || fromIndex === toIndex) return;
    await persistOrder(reorderItems(orderedItems, fromIndex, toIndex));
  };
  const toggleActive = async (item: ChurchDidYouKnow, active: boolean) => {
    const previous = orderedItems;
    setOrderedItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active } : entry));
    setTogglingItemId(item.id); setErrorMessage("");
    try { await setActiveMutation.mutateAsync({ didYouKnowId: item.id, active }); }
    catch (error) { setOrderedItems(previous); setErrorMessage(error instanceof Error ? error.message : "Unable to update this fact right now."); }
    finally { setTogglingItemId(null); }
  };

  return <div className="space-y-6">
    {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
    <div className="flex justify-end"><Button className="h-10 rounded-xl px-4" onClick={() => { setEditingItem(null); setIsEditorOpen(true); }} type="button"><Plus className="h-4 w-4" />Add fact</Button></div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-xl border-[#dbe4f0] bg-white"><CardHeader><CardTitle>Total facts</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[#112947]">{orderedItems.length}</p></CardContent></Card>
      <Card className="rounded-xl border-[#dbe4f0] bg-white"><CardHeader><CardTitle>Visible on display</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[#112947]">{visibleCount}</p></CardContent></Card>
      <Card className="rounded-xl border-[#dbe4f0] bg-white"><CardHeader><CardTitle>Hidden or scheduled</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold text-[#112947]">{orderedItems.length - visibleCount}</p></CardContent></Card>
    </div>
    <Card className="rounded-xl border-[#dbe4f0] bg-white"><CardHeader><CardTitle>Did You Know facts</CardTitle><CardDescription>Drag or use arrows to set the display order. Visibility dates can schedule facts without removing them.</CardDescription></CardHeader><CardContent className="space-y-3">
      {!orderedItems.length && !itemsQuery.isLoading ? <div className="rounded-3xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-10 text-center"><p className="text-lg font-semibold text-[#112947]">No facts yet</p><p className="mt-2 text-sm text-[#556b86]">Add a concise fact to share with the congregation on the TV display.</p></div> : null}
      {orderedItems.map((item, index) => {
        const Icon = getIconComponent(item.icon); const isVisible = isDidYouKnowVisible(item, now);
        return <article className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)] md:grid-cols-[auto_minmax(0,1fr)_auto]" draggable key={item.id} onDragEnd={() => setDraggedItemId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedItemId(item.id)} onDrop={() => { if (draggedItemId && draggedItemId !== item.id) { void moveItem(orderedItems.findIndex((entry) => entry.id === draggedItemId), index); } setDraggedItemId(null); }}>
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-2xl bg-[#112947] text-white"><GripVertical className="h-4 w-4" /></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f2e7] text-[#112947]"><Icon className="h-5 w-5" /></div></div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="max-h-[4.5rem] max-w-full overflow-hidden text-base font-semibold leading-snug text-[#112947]">{item.factText}</p>{item.highlightText ? <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-sm font-semibold text-[#8d6a2f]">{item.highlightText}</span> : null}<span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.active ? "Active" : "Hidden"}</span>{item.active && !isVisible ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Scheduled</span> : null}</div>{item.supportingText ? <p className="mt-1 max-h-10 overflow-hidden text-sm text-[#556b86]">{item.supportingText}</p> : null}<div className="mt-2 flex flex-wrap gap-3 text-xs text-[#8d6a2f]"><span>From: {formatVisibilityDate(item.visibleFrom)}</span><span>Until: {formatVisibilityDate(item.visibleUntil)}</span></div></div>
          <div className="flex flex-wrap items-start justify-end gap-2"><Button disabled={index === 0} onClick={() => void moveItem(index, index - 1)} type="button" variant="outline"><ArrowUp className="h-4 w-4" /></Button><Button disabled={index === orderedItems.length - 1} onClick={() => void moveItem(index, index + 1)} type="button" variant="outline"><ArrowDown className="h-4 w-4" /></Button><Button disabled={togglingItemId === item.id} onClick={() => void toggleActive(item, !item.active)} type="button" variant="outline">{item.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{item.active ? "Hide" : "Show"}</Button><Button onClick={() => { setEditingItem(item); setIsEditorOpen(true); }} type="button" variant="outline"><Pencil className="h-4 w-4" /></Button><Button disabled={deleteMutation.isPending} onClick={() => void deleteMutation.mutateAsync(item.id)} type="button" variant="outline"><Trash2 className="h-4 w-4" /></Button></div>
        </article>;
      })}
    </CardContent></Card>
    <DidYouKnowEditor item={editingItem} onClose={() => { setEditingItem(null); setIsEditorOpen(false); }} open={isEditorOpen} />
  </div>;
};
