import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "../components/common/confirm-dialog";
import { FormDrawer } from "../components/common/form-drawer";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAdminLiturgies, useDeleteLiturgy, useSaveLiturgy } from "../lib/church-dashboard";
import type { ChurchLiturgy, CreateChurchLiturgyInput } from "../../shared/church-dashboard";

type LiturgyDraft = CreateChurchLiturgyInput;

const LITURGY_FORM_ID = "liturgy-editor-form";

const buildEmptyDraft = (): LiturgyDraft => ({
  date: "",
  description: "",
});

const buildDraftFromLiturgy = (liturgy: ChurchLiturgy): LiturgyDraft => ({
  date: liturgy.date,
  description: liturgy.description ?? "",
});

const getTodayDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLiturgyDate = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

const compareLiturgiesForAdmin = (left: ChurchLiturgy, right: ChurchLiturgy, today: string) => {
  const leftUpcoming = left.date >= today;
  const rightUpcoming = right.date >= today;

  if (leftUpcoming !== rightUpcoming) {
    return leftUpcoming ? -1 : 1;
  }

  if (leftUpcoming && rightUpcoming) {
    return left.date.localeCompare(right.date);
  }

  return right.date.localeCompare(left.date);
};

const LiturgyEditorDialog = ({
  liturgy,
  open,
  onClose,
}: {
  liturgy: ChurchLiturgy | null;
  open: boolean;
  onClose: () => void;
}) => {
  const saveLiturgy = useSaveLiturgy();
  const [draft, setDraft] = useState<LiturgyDraft>(buildEmptyDraft());
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(liturgy ? buildDraftFromLiturgy(liturgy) : buildEmptyDraft());
    setErrorMessage("");
  }, [liturgy, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      await saveLiturgy.mutateAsync({
        id: liturgy?.id,
        values: {
          date: draft.date,
          description: (draft.description ?? "").trim() || undefined,
        },
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this liturgy right now.");
    }
  };

  return (
    <FormDrawer
      busy={saveLiturgy.isPending}
      contentClassName="px-4 py-4 sm:px-5 sm:py-5"
      description="Add or update an upcoming liturgy date for the public dashboard."
      onClose={onClose}
      open={open}
      panelClassName="lg:max-w-[34rem]"
      submitFormId={LITURGY_FORM_ID}
      submitLabel={liturgy ? "Save changes" : "Create liturgy"}
      title={liturgy ? "Edit liturgy" : "Add liturgy"}
    >
      <form className="space-y-5" id={LITURGY_FORM_ID} onSubmit={submit}>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#112947]">Date</span>
          <Input
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
            required
            type="date"
            value={draft.date}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#112947]">Description</span>
          <Input
            maxLength={120}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="Feast of the Transfiguration"
            value={draft.description ?? ""}
          />
          <p className="text-xs text-[#6a7f9a]">Optional short line shown beside the date when provided.</p>
        </label>

        {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
      </form>
    </FormDrawer>
  );
};

export const AdminLiturgiesPage = () => {
  const liturgiesQuery = useAdminLiturgies();
  const deleteLiturgy = useDeleteLiturgy();
  const [editingLiturgy, setEditingLiturgy] = useState<ChurchLiturgy | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingLiturgy, setDeletingLiturgy] = useState<ChurchLiturgy | null>(null);
  const today = getTodayDateKey(new Date());

  const orderedLiturgies = useMemo(
    () => [...(liturgiesQuery.data ?? [])].sort((left, right) => compareLiturgiesForAdmin(left, right, today)),
    [liturgiesQuery.data, today],
  );

  const totals = useMemo(
    () => ({
      total: orderedLiturgies.length,
      upcoming: orderedLiturgies.filter((item) => item.date >= today).length,
      past: orderedLiturgies.filter((item) => item.date < today).length,
    }),
    [orderedLiturgies, today],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          className="h-10 rounded-xl px-4"
          onClick={() => {
            setEditingLiturgy(null);
            setIsEditorOpen(true);
          }}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add liturgy
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Total liturgies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{totals.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Past</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{totals.past}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-[#dbe4f0] bg-white">
        <CardHeader>
          <CardTitle>Liturgies</CardTitle>
          <CardDescription>Upcoming dates appear first, starting from today, followed by past liturgies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!orderedLiturgies.length && !liturgiesQuery.isLoading ? (
            <div className="rounded-3xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-10 text-center">
              <p className="text-lg font-semibold text-[#112947]">No liturgies yet</p>
              <p className="mt-2 text-sm text-[#556b86]">Add a liturgy date here and it will appear on the dashboard automatically.</p>
            </div>
          ) : null}

          {orderedLiturgies.map((item) => {
            const isUpcoming = item.date >= today;

            return (
              <article
                className="flex flex-col gap-4 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)] md:flex-row md:items-center md:justify-between"
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#112947]">{formatLiturgyDate(item.date)}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${isUpcoming ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {isUpcoming ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  {item.description ? <p className="mt-2 text-sm text-[#556b86]">{item.description}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setEditingLiturgy(item);
                      setIsEditorOpen(true);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeletingLiturgy(item)}
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

      <LiturgyEditorDialog
        liturgy={editingLiturgy}
        onClose={() => {
          setEditingLiturgy(null);
          setIsEditorOpen(false);
        }}
        open={isEditorOpen}
      />

      <ConfirmDialog
        busy={deleteLiturgy.isPending}
        confirmLabel="Delete liturgy"
        description="This will permanently remove the liturgy from the admin list and the public dashboard."
        destructive
        onClose={() => setDeletingLiturgy(null)}
        onConfirm={() => {
          if (!deletingLiturgy) {
            return;
          }

          void deleteLiturgy
            .mutateAsync(deletingLiturgy.id)
            .then(() => {
              setDeletingLiturgy(null);
            })
            .catch(() => undefined);
        }}
        open={!!deletingLiturgy}
        title={deletingLiturgy ? `Delete ${formatLiturgyDate(deletingLiturgy.date)}?` : "Delete liturgy?"}
      >
        {deletingLiturgy?.description ? (
          <p className="text-sm text-muted-foreground">{deletingLiturgy.description}</p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
};
