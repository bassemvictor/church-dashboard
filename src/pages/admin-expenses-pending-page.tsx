import { Check, ExternalLink, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  categoryLabels,
  formatCurrency,
  getExpenseApprovalStatus,
  getIconComponent,
  useAdminExpenses,
  useApproveExpense,
  useDeleteExpense,
} from "../lib/church-dashboard";
import { toDateInputValue } from "../lib/church-dashboard-visibility";

const formatExpenseDate = (value?: string) => {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const AdminExpensesPendingPage = () => {
  const expensesQuery = useAdminExpenses();
  const approveMutation = useApproveExpense();
  const deleteMutation = useDeleteExpense();

  const pendingItems = useMemo(
    () =>
      (expensesQuery.data ?? []).filter((item) => item.requiresApproval && getExpenseApprovalStatus(item) === "PENDING"),
    [expensesQuery.data],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-[#dbe4f0] bg-white">
          <CardHeader>
            <CardTitle>Pending items</CardTitle>
            <CardDescription>Awaiting approval before they can appear publicly</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-[#112947]">{pendingItems.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-[#dbe4f0] bg-white md:col-span-2">
          <CardHeader>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>Approving an expense only makes it eligible for display. Active state and visibility dates still apply.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-xl border-[#dbe4f0] bg-white">
        <CardHeader>
          <CardTitle>Pending approval</CardTitle>
          <CardDescription>Review expenses and projects that are still hidden from the public dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!pendingItems.length && !expensesQuery.isLoading ? (
            <div className="rounded-3xl border border-dashed border-[#cbd8eb] bg-[#f8fbff] px-5 py-10 text-center">
              <p className="text-lg font-semibold text-[#112947]">No pending expenses</p>
              <p className="mt-2 text-sm text-[#556b86]">Items marked as requiring approval will appear here until they are approved.</p>
            </div>
          ) : null}

          {pendingItems.map((item) => {
            const Icon = getIconComponent(item.icon);

            return (
              <article
                className="grid gap-3 rounded-xl border border-[#dbe4f0] bg-[#fbfcff] p-4 shadow-[0_12px_28px_rgba(31,42,68,0.05)] md:grid-cols-[auto_minmax(0,1fr)_auto]"
                key={item.id}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f2e7] text-[#112947]">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#112947]">{item.title}</h3>
                    <span className="rounded-full bg-[#f8f2e7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8d6a2f]">
                      {categoryLabels[item.category]}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Pending
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#556b86]">{item.description || "No description provided."}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-[#8d6a2f]">
                    <span>{formatExpenseDate(item.paymentDate)}</span>
                    <span>Budget {formatCurrency(item.totalBudget)}</span>
                    <span>Funded {formatCurrency(item.fundedAmount)}</span>
                    {item.visibleFrom ? <span>Visible from {toDateInputValue(item.visibleFrom)}</span> : null}
                    {item.visibleUntil ? <span>Visible until {toDateInputValue(item.visibleUntil)}</span> : null}
                    <span>Created {toDateInputValue(item.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-end gap-2">
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium leading-none text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={approveMutation.isPending}
                    onClick={() => void approveMutation.mutateAsync(item.id)}
                    type="button"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <Link
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium leading-none text-foreground transition-colors hover:bg-accent"
                    to="/admin/expenses"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in expenses
                  </Link>
                  <button
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium leading-none text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => void deleteMutation.mutateAsync(item.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
