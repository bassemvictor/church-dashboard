import { GripVertical, Pencil, Plus, Trash2, ArrowDown, ArrowUp, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
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
  categoryLabels,
  dashboardStatusMeta,
  formatCurrency,
  getExpenseApprovalStatus,
  getClampedFundingPercentage,
  getComputedStatus,
  getFundingPercentage,
  getIconComponent,
  isExpenseVisible,
  getRemainingAmount,
  iconChoices,
  removeExpenseImage,
  uploadExpenseImage,
  useAdminExpenses,
  useDeleteExpense,
  useReorderExpenses,
  useSaveExpense,
  useSetExpenseActive,
} from "../lib/church-dashboard";
import { getVisibilityRangeError, normalizeDateValue, toDateInputValue } from "../lib/church-dashboard-visibility";
import {
  churchExpenseCategories,
  churchExpenseStatuses,
  type ChurchExpense,
  type CreateChurchExpenseInput,
} from "../../shared/church-dashboard";

type ExpenseDraft = CreateChurchExpenseInput & {
  imageUrl?: string;
  imageKey?: string;
};

const formatExpenseDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const buildEmptyDraft = (): ExpenseDraft => ({
  title: "",
  description: "",
  paymentDate: "",
  visibleFrom: "",
  visibleUntil: "",
  requiresApproval: false,
  category: "PROJECT",
  totalBudget: 100000,
  fundedAmount: 0,
  imageUrl: "",
  imageKey: "",
  icon: "church",
  active: true,
  statusMode: "AUTO",
  manualStatus: "ON_TRACK",
  customStatusText: "",
  customSubText: "",
});

const buildDraftFromExpense = (expense: ChurchExpense): ExpenseDraft => ({
  title: expense.title,
  description: expense.description ?? "",
  paymentDate: toDateInputValue(expense.paymentDate),
  visibleFrom: toDateInputValue(expense.visibleFrom),
  visibleUntil: toDateInputValue(expense.visibleUntil),
  requiresApproval: expense.requiresApproval ?? false,
  category: expense.category,
  totalBudget: expense.totalBudget,
  fundedAmount: expense.fundedAmount,
  imageUrl: expense.imageUrl ?? "",
  imageKey: expense.imageKey ?? "",
  icon: expense.icon ?? "church",
  active: expense.active,
  statusMode: expense.statusMode,
  manualStatus: expense.manualStatus ?? "ON_TRACK",
  customStatusText: expense.customStatusText ?? "",
  customSubText: expense.customSubText ?? "",
});

const reorderItems = (items: ChurchExpense[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const EXPENSE_EDITOR_FORM_ID = "expense-editor-form";

const ExpenseEditorDialog = ({
  expense,
  nextDisplayOrder,
  open,
  onClose,
}: {
  expense: ChurchExpense | null;
  nextDisplayOrder: number;
  open: boolean;
  onClose: () => void;
}) => {
  const saveExpense = useSaveExpense();
  const [draft, setDraft] = useState<ExpenseDraft>(buildEmptyDraft());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const visibilityRangeError = getVisibilityRangeError(draft.visibleFrom, draft.visibleUntil);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(expense ? buildDraftFromExpense(expense) : buildEmptyDraft());
    setSelectedFile(null);
    setPreviewUrl("");
    setRemoveCurrentImage(false);
    setErrorMessage("");
  }, [expense, open]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const previewImageUrl = removeCurrentImage ? "" : previewUrl || draft.imageUrl || "";
  const previewStatus = getComputedStatus(draft);
  const previewStatusMeta = dashboardStatusMeta[previewStatus];
  const PreviewIcon = getIconComponent(draft.icon);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    let uploadedImageKey: string | undefined;

    if (visibilityRangeError) {
      setErrorMessage(visibilityRangeError);
      return;
    }

    try {
      let nextImageKey = removeCurrentImage ? "" : draft.imageKey ?? "";
      let nextImageUrl = removeCurrentImage ? "" : draft.imageUrl ?? "";

      if (selectedFile) {
        const uploadedImage = await uploadExpenseImage(selectedFile);
        uploadedImageKey = uploadedImage.imageKey;
        nextImageKey = uploadedImage.imageKey;
        nextImageUrl = uploadedImage.imageUrl;
      }

      await saveExpense.mutateAsync({
        id: expense?.id,
        values: {
          ...draft,
          imageKey: nextImageKey || undefined,
          imageUrl: nextImageUrl || undefined,
          description: draft.description?.trim() || undefined,
          paymentDate: draft.paymentDate?.trim() || undefined,
          visibleFrom: normalizeDateValue(draft.visibleFrom),
          visibleUntil: normalizeDateValue(draft.visibleUntil, "end"),
          requiresApproval: draft.requiresApproval,
          customStatusText: draft.customStatusText?.trim() || undefined,
          customSubText: draft.customSubText?.trim() || undefined,
        },
      });

      if (expense?.imageKey && (removeCurrentImage || (selectedFile && expense.imageKey !== nextImageKey))) {
        await removeExpenseImage(expense.imageKey);
      }

      onClose();
    } catch (error) {
      if (uploadedImageKey) {
        await removeExpenseImage(uploadedImageKey);
      }
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this expense item right now.");
    }
  };

  return (
    <FormDrawer
      busy={saveExpense.isPending}
      contentClassName="px-4 py-4 sm:px-5 sm:py-5"
      description="Update how this expense item appears on the public church screen."
      onClose={onClose}
      open={open}
      panelClassName="lg:max-w-[58rem]"
      submitFormId={EXPENSE_EDITOR_FORM_ID}
      submitLabel={expense ? "Save changes" : "Create expense item"}
      title={expense ? "Edit expense item" : "Add expense item"}
    >
      <form className="space-y-5" id={EXPENSE_EDITOR_FORM_ID} onSubmit={submit}>
        <section className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Expense item name</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              required
              value={draft.title}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Category</span>
            <Select
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as ExpenseDraft["category"] }))}
              value={draft.category}
            >
              {churchExpenseCategories.map((category) => (
                <option key={category} value={category}>{categoryLabels[category]}</option>
              ))}
            </Select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#112947]">Description</span>
            <Textarea
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={3}
              value={draft.description}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Payment or due date</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, paymentDate: event.target.value }))}
              type="date"
              value={draft.paymentDate ?? ""}
            />
            <span className="block text-xs text-[#556b86]">Optional. Use the payment date or the next monthly due date.</span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Total budget (CAD)</span>
            <Input
              min={0}
              onChange={(event) => setDraft((current) => ({ ...current, totalBudget: Number(event.target.value) || 0 }))}
              step="0.01"
              type="number"
              value={draft.totalBudget}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Amount funded (CAD)</span>
            <Input
              min={0}
              onChange={(event) => setDraft((current) => ({ ...current, fundedAmount: Number(event.target.value) || 0 }))}
              step="0.01"
              type="number"
              value={draft.fundedAmount}
            />
          </label>

          <VisibilityWindowFields
            onVisibleFromChange={(value) => setDraft((current) => ({ ...current, visibleFrom: value }))}
            onVisibleUntilChange={(value) => setDraft((current) => ({ ...current, visibleUntil: value }))}
            visibleFrom={draft.visibleFrom}
            visibleUntil={draft.visibleUntil}
          />

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Status mode</span>
            <Select
              onChange={(event) => setDraft((current) => ({ ...current, statusMode: event.target.value as ExpenseDraft["statusMode"] }))}
              value={draft.statusMode}
            >
              <option value="AUTO">Automatic</option>
              <option value="MANUAL">Manual override</option>
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Manual status</span>
            <Select
              disabled={draft.statusMode !== "MANUAL"}
              onChange={(event) => setDraft((current) => ({ ...current, manualStatus: event.target.value as ExpenseDraft["manualStatus"] }))}
              value={draft.manualStatus}
            >
              {churchExpenseStatuses.map((status) => (
                <option key={status} value={status}>{dashboardStatusMeta[status].label}</option>
              ))}
            </Select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Custom status text</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, customStatusText: event.target.value }))}
              placeholder="Optional headline"
              value={draft.customStatusText}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#112947]">Custom subtext</span>
            <Input
              onChange={(event) => setDraft((current) => ({ ...current, customSubText: event.target.value }))}
              placeholder="Optional supporting message"
              value={draft.customSubText}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2">
            <Checkbox
              checked={draft.active}
              onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))}
            />
            Show this item on the public dashboard
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-[#f4f7fc] px-3 py-3 text-sm text-[#304964] md:col-span-2">
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
            <p className="mt-1 text-xs text-[#556b86]">Choose a visual badge instead of typing an icon identifier manually.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {iconChoices.map((choice) => {
              const Icon = choice.icon;
              const active = draft.icon === choice.id;

              return (
                <button
                  className={[
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-xs transition",
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
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3 rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
            <div>
              <p className="text-sm font-medium text-[#112947]">Image</p>
              <p className="mt-1 text-xs text-[#556b86]">Upload, replace, preview, or remove the row image.</p>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cbd8eb] bg-white px-3 py-3 text-sm text-[#304964]">
              <ImageIcon className="h-4 w-4" />
              <span>{selectedFile ? selectedFile.name : "Choose image"}</span>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <div className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white">
              <img
                alt="Expense preview"
                className="h-48 w-full object-cover"
                src={previewImageUrl || "/church-hero.png"}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedFile(null);
                  setRemoveCurrentImage(true);
                  setDraft((current) => ({ ...current, imageKey: "", imageUrl: "" }));
                }}
                type="button"
                variant="outline"
              >
                Remove image
              </Button>
              {selectedFile || removeCurrentImage ? (
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setRemoveCurrentImage(false);
                    setDraft((current) => ({
                      ...current,
                      imageKey: expense?.imageKey ?? "",
                      imageUrl: expense?.imageUrl ?? "",
                    }));
                  }}
                  type="button"
                  variant="ghost"
                >
                  Reset image changes
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
            <div>
              <p className="text-sm font-medium text-[#112947]">Live row preview</p>
              <p className="mt-1 text-xs text-[#556b86]">Approximation of how this record will appear on the public screen.</p>
            </div>

            <div className="rounded-xl border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)]">
              <div className="flex items-center gap-4">
                <img
                  alt={draft.title || "Expense item preview"}
                  className="h-24 w-28 rounded-lg border border-[#eadcc1] object-cover"
                  src={previewImageUrl || "/church-hero.png"}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#112947] text-white">
                      <PreviewIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold uppercase text-[#112947]">{draft.title || "EXPENSE ITEM NAME"}</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-[#8d6a2f]">{categoryLabels[draft.category]}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[#556b86]">{draft.description || "Description preview appears here."}</p>
                  {draft.paymentDate ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d6a2f]">
                      Due {formatExpenseDate(draft.paymentDate)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8d6a2f]">Budget</p>
                  <p className="mt-1 text-lg font-semibold text-[#112947]">{formatCurrency(draft.totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8d6a2f]">Funded</p>
                  <p className="mt-1 text-lg font-semibold text-[#112947]">{formatCurrency(draft.fundedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8d6a2f]">Remaining</p>
                  <p className="mt-1 text-lg font-semibold text-[#112947]">{formatCurrency(getRemainingAmount(draft))}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-4 rounded-full bg-[#ebe5db]">
                  <div
                    className={`h-4 rounded-full bg-gradient-to-r ${previewStatusMeta.trackTone}`}
                    style={{ width: `${getClampedFundingPercentage(draft)}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#112947]">Progress: {Math.round(getFundingPercentage(draft))}%</p>
                  <div className="text-right">
                    <p className={`text-sm font-semibold uppercase ${previewStatusMeta.tone}`}>
                      {draft.customStatusText || previewStatusMeta.label}
                    </p>
                    <p className="text-xs text-[#556b86]">{draft.customSubText || previewStatusMeta.subtext}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl bg-white p-3 text-sm text-[#314862] md:grid-cols-2">
              <p>Budget: {formatCurrency(draft.totalBudget)}</p>
              <p>Funded: {formatCurrency(draft.fundedAmount)}</p>
              <p>Remaining: {formatCurrency(getRemainingAmount(draft))}</p>
              <p>Progress: {Math.round(getFundingPercentage(draft))}%</p>
            </div>
          </div>
        </section>

        {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}

      </form>
    </FormDrawer>
  );
};

export const AdminExpensesPage = () => {
  const expensesQuery = useAdminExpenses();
  const reorderMutation = useReorderExpenses();
  const deleteMutation = useDeleteExpense();
  const setExpenseActiveMutation = useSetExpenseActive();
  const [orderedExpenses, setOrderedExpenses] = useState<ChurchExpense[]>([]);
  const [editingExpense, setEditingExpense] = useState<ChurchExpense | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draggedExpenseId, setDraggedExpenseId] = useState<string | null>(null);
  const [togglingExpenseId, setTogglingExpenseId] = useState<string | null>(null);
  const [toggleErrorMessage, setToggleErrorMessage] = useState("");
  const now = new Date();

  useEffect(() => {
    setOrderedExpenses(expensesQuery.data ?? []);
  }, [expensesQuery.data]);

  const pendingApprovalItems = useMemo(
    () => orderedExpenses.filter((item) => item.requiresApproval && getExpenseApprovalStatus(item) === "PENDING"),
    [orderedExpenses],
  );

  const manageableExpenses = useMemo(
    () =>
      orderedExpenses.flatMap((item, index) =>
        item.requiresApproval && getExpenseApprovalStatus(item) === "PENDING" ? [] : [{ item, index }],
      ),
    [orderedExpenses],
  );

  const activeExpenses = useMemo(
    () => manageableExpenses.filter((entry) => entry.item.active),
    [manageableExpenses],
  );

  const inactiveExpenses = useMemo(
    () => manageableExpenses.filter((entry) => !entry.item.active),
    [manageableExpenses],
  );

  const totals = useMemo(() => {
    return manageableExpenses.reduce(
      (summary, item) => {
        summary.budget += item.item.totalBudget;
        summary.funded += item.item.fundedAmount;
        return summary;
      },
      { budget: 0, funded: 0 },
    );
  }, [manageableExpenses]);

  const persistOrder = async (nextItems: ChurchExpense[]) => {
    setOrderedExpenses(nextItems);

    try {
      await reorderMutation.mutateAsync({
        items: nextItems.map((item, index) => ({
          id: item.id,
          displayOrder: index + 1,
        })),
      });
    } catch {
      setOrderedExpenses(expensesQuery.data ?? []);
    }
  };

  const moveItem = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedExpenses.length || fromIndex === toIndex) {
      return;
    }

    await persistOrder(reorderItems(orderedExpenses, fromIndex, toIndex));
  };

  const toggleExpenseActiveState = async (expense: ChurchExpense, active: boolean) => {
    const previousItems = orderedExpenses;
    const nextItems = orderedExpenses.map((item) => (
      item.id === expense.id ? { ...item, active } : item
    ));

    setToggleErrorMessage("");
    setTogglingExpenseId(expense.id);
    setOrderedExpenses(nextItems);

    try {
      await setExpenseActiveMutation.mutateAsync({
        expenseId: expense.id,
        active,
      });
    } catch (error) {
      setOrderedExpenses(previousItems);
      setToggleErrorMessage(error instanceof Error ? error.message : "Unable to update this expense item right now.");
    } finally {
      setTogglingExpenseId(null);
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
          className="h-10 rounded-lg px-4"
          onClick={() => {
            setEditingExpense(null);
            setIsEditorOpen(true);
          }}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add expense item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total Budget</CardTitle>
            <CardDescription>All expense items</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{formatCurrency(totals.budget)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total Funded</CardTitle>
            <CardDescription>All contributions recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{formatCurrency(totals.funded)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Pending approval</CardTitle>
            <CardDescription>Hidden until approved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold text-[#112947]">{pendingApprovalItems.length}</p>
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
          <CardTitle>Active expense items</CardTitle>
          <CardDescription>Drag rows to change `displayOrder`, use the move buttons, or deactivate an item to move it out of the main list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeExpenses.length && !expensesQuery.isLoading ? (
            <div className="rounded-2xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-10 text-center">
              <p className="text-lg font-semibold text-[#112947]">No active expense items</p>
              <p className="mt-2 text-sm text-[#556b86]">Create an expense item or reactivate one from the inactive section below.</p>
            </div>
          ) : null}

          {activeExpenses.map(({ item: expense, index: originalIndex }, index) => {
            const Icon = getIconComponent(expense.icon);
            const status = getComputedStatus(expense);
            const statusMeta = dashboardStatusMeta[status];
            const approvalStatus = getExpenseApprovalStatus(expense);
            const previousItem = activeExpenses[index - 1];
            const nextItem = activeExpenses[index + 1];

            return (
              <div
                className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 lg:grid-cols-[auto_88px_64px_minmax(0,1.3fr)_0.9fr_0.9fr_0.8fr_auto]"
                draggable
                key={expense.id}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedExpenseId(expense.id)}
                onDrop={() => {
                  if (!draggedExpenseId || draggedExpenseId === expense.id) {
                    return;
                  }

                  const fromIndex = orderedExpenses.findIndex((item) => item.id === draggedExpenseId);
                  void moveItem(fromIndex, originalIndex);
                }}
              >
                <div className="flex items-center justify-center text-[#97723a]">
                  <GripVertical className="h-5 w-5" />
                </div>
                <img
                  alt={expense.title}
                  className="h-20 w-[88px] rounded-lg border border-[#dbe4f0] object-cover"
                  src={expense.imageUrl || "/church-hero.png"}
                />
                <div className="flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#112947] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[#112947]">{expense.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#97723a]">{categoryLabels[expense.category]}</p>
                  {approvalStatus === "APPROVED" ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Approved</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm text-[#556b86]">{expense.description}</p>
                  {expense.paymentDate ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d6a2f]">
                      Due {formatExpenseDate(expense.paymentDate)}
                    </p>
                  ) : null}
                  {(expense.visibleFrom || expense.visibleUntil) ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[#8d6a2f]">
                      {expense.visibleFrom ? <span>Visible from {toDateInputValue(expense.visibleFrom)}</span> : null}
                      {expense.visibleUntil ? <span>Visible until {toDateInputValue(expense.visibleUntil)}</span> : null}
                    </div>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Budget</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{formatCurrency(expense.totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Funded</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{formatCurrency(expense.fundedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Progress</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{Math.round(getFundingPercentage(expense))}%</p>
                  <div className="mt-2 h-2.5 rounded-md bg-[#ece4d9]">
                    <div
                      className={`h-2.5 rounded-md bg-gradient-to-r ${statusMeta.trackTone}`}
                      style={{ width: `${getClampedFundingPercentage(expense)}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-xs font-semibold uppercase ${statusMeta.tone}`}>{statusMeta.label}</p>
                  <p className="mt-1 text-xs text-[#556b86]">{expense.active ? "Active" : "Hidden"}</p>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <Button onClick={() => void moveItem(originalIndex, previousItem?.index ?? originalIndex)} size="icon" type="button" variant="outline">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => void moveItem(originalIndex, nextItem?.index ?? originalIndex)} size="icon" type="button" variant="outline">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={togglingExpenseId === expense.id}
                    onClick={() => void toggleExpenseActiveState(expense, false)}
                    type="button"
                    variant="outline"
                  >
                    <EyeOff className="h-4 w-4" />
                    Deactivate
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingExpense(expense);
                      setIsEditorOpen(true);
                    }}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={async () => {
                      const confirmed = window.confirm(`Delete "${expense.title}"?`);
                      if (!confirmed) {
                        return;
                      }

                      await deleteMutation.mutateAsync(expense.id);
                      await removeExpenseImage(expense.imageKey);
                    }}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

        </CardContent>
      </Card>

      <Card className="rounded-xl border-[#dbe4f0] bg-white">
        <CardHeader>
          <CardTitle>Inactive expense items</CardTitle>
          <CardDescription>These items stay out of the public dashboard until you activate them again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!inactiveExpenses.length ? (
            <div className="rounded-2xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-8 text-center">
              <p className="text-base font-semibold text-[#112947]">No inactive expense items</p>
            </div>
          ) : null}

          {inactiveExpenses.map(({ item: expense, index: originalIndex }, index) => {
            const Icon = getIconComponent(expense.icon);
            const status = getComputedStatus(expense);
            const statusMeta = dashboardStatusMeta[status];
            const approvalStatus = getExpenseApprovalStatus(expense);
            const previousItem = inactiveExpenses[index - 1];
            const nextItem = inactiveExpenses[index + 1];

            return (
              <div
                className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 lg:grid-cols-[auto_88px_64px_minmax(0,1.3fr)_0.9fr_0.9fr_0.8fr_auto]"
                draggable
                key={expense.id}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedExpenseId(expense.id)}
                onDrop={() => {
                  if (!draggedExpenseId || draggedExpenseId === expense.id) {
                    return;
                  }

                  const fromIndex = orderedExpenses.findIndex((item) => item.id === draggedExpenseId);
                  void moveItem(fromIndex, originalIndex);
                }}
              >
                <div className="flex items-center justify-center text-[#97723a]">
                  <GripVertical className="h-5 w-5" />
                </div>
                <img
                  alt={expense.title}
                  className="h-20 w-[88px] rounded-lg border border-[#dbe4f0] object-cover"
                  src={expense.imageUrl || "/church-hero.png"}
                />
                <div className="flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#112947] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-[#112947]">{expense.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#97723a]">{categoryLabels[expense.category]}</p>
                  {approvalStatus === "APPROVED" ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Approved</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm text-[#556b86]">{expense.description}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Budget</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{formatCurrency(expense.totalBudget)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Funded</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{formatCurrency(expense.fundedAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#97723a]">Progress</p>
                  <p className="mt-2 text-base font-semibold text-[#112947]">{Math.round(getFundingPercentage(expense))}%</p>
                  <div className="mt-2 h-2.5 rounded-md bg-[#ece4d9]">
                    <div
                      className={`h-2.5 rounded-md bg-gradient-to-r ${statusMeta.trackTone}`}
                      style={{ width: `${getClampedFundingPercentage(expense)}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-xs font-semibold uppercase ${statusMeta.tone}`}>{statusMeta.label}</p>
                  <p className="mt-1 text-xs text-[#556b86]">Inactive</p>
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <Button onClick={() => void moveItem(originalIndex, previousItem?.index ?? originalIndex)} size="icon" type="button" variant="outline">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => void moveItem(originalIndex, nextItem?.index ?? originalIndex)} size="icon" type="button" variant="outline">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    disabled={togglingExpenseId === expense.id}
                    onClick={() => void toggleExpenseActiveState(expense, true)}
                    type="button"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                    Activate
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingExpense(expense);
                      setIsEditorOpen(true);
                    }}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={async () => {
                      const confirmed = window.confirm(`Delete "${expense.title}"?`);
                      if (!confirmed) {
                        return;
                      }

                      await deleteMutation.mutateAsync(expense.id);
                      await removeExpenseImage(expense.imageKey);
                    }}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <ExpenseEditorDialog
        expense={editingExpense}
        nextDisplayOrder={orderedExpenses.length + 1}
        onClose={() => setIsEditorOpen(false)}
        open={isEditorOpen}
      />
    </div>
  );
};
