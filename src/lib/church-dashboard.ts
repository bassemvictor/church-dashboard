import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUrl, remove, uploadData } from "aws-amplify/storage";
import {
  BookOpen,
  Building2,
  Church,
  Droplets,
  HandCoins,
  Heart,
  House,
  Music4,
  Settings,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "./api";
import {
  dashboardStatusThresholds,
  defaultDashboardSettings,
  getExpenseApprovalStatus,
  isExpenseVisible,
  isNewsVisible,
  type ChurchLiturgy,
  type ApproveChurchExpenseResponse,
  type ChurchExpense,
  type ChurchExpenseCategory,
  type ChurchNews,
  type ApproveChurchNewsResponse,
  type ChurchNewsCategory,
  type CreateChurchLiturgyInput,
  type ChurchExpenseStatus,
  type CreateChurchNewsInput,
  type CreateChurchExpenseInput,
  type DashboardSettings,
  type DashboardSettingsResponse,
  type ExpenseListResponse,
  type LiturgyListResponse,
  type NewsListResponse,
  type PublicDashboardResponse,
  type UpdateChurchLiturgyInput,
  type ReorderChurchNewsInput,
  type ReorderChurchExpensesInput,
  type UpdateChurchNewsInput,
  type UpdateChurchExpenseInput,
  type UpdateDashboardSettingsInput,
  churchNewsCategories,
} from "../../shared/church-dashboard";

export const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export const percentFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

export const getFundingPercentage = (expense: Pick<ChurchExpense, "totalBudget" | "fundedAmount">) => {
  if (expense.totalBudget <= 0) {
    return 0;
  }

  return (expense.fundedAmount / expense.totalBudget) * 100;
};

export const getClampedFundingPercentage = (expense: Pick<ChurchExpense, "totalBudget" | "fundedAmount">) =>
  Math.max(0, Math.min(100, getFundingPercentage(expense)));

export const getRemainingAmount = (expense: Pick<ChurchExpense, "totalBudget" | "fundedAmount">) =>
  Math.max(expense.totalBudget - expense.fundedAmount, 0);

export const getComputedStatus = (expense: Pick<ChurchExpense, "statusMode" | "manualStatus" | "totalBudget" | "fundedAmount">) => {
  if (expense.statusMode === "MANUAL" && expense.manualStatus) {
    return expense.manualStatus;
  }

  const percentage = getFundingPercentage(expense);
  return dashboardStatusThresholds.find((threshold) => percentage >= threshold.minPercentage)?.status ?? "URGENT";
};

export const dashboardStatusMeta: Record<
  ChurchExpenseStatus,
  { label: string; subtext: string; tone: string; trackTone: string }
> = {
  FUNDED: {
    label: "Fully Funded",
    subtext: "Thank God for His provision",
    tone: "text-emerald-700",
    trackTone: "from-emerald-500 to-emerald-600",
  },
  ON_TRACK: {
    label: "On Track",
    subtext: "Keep going!",
    tone: "text-green-700",
    trackTone: "from-green-500 to-lime-500",
  },
  NEEDS_SUPPORT: {
    label: "Needs Support",
    subtext: "We need your help",
    tone: "text-amber-700",
    trackTone: "from-amber-400 to-orange-500",
  },
  URGENT: {
    label: "Urgent Need",
    subtext: "Your support is needed",
    tone: "text-rose-700",
    trackTone: "from-rose-500 to-red-600",
  },
};

export const iconChoices: Array<{
  id: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "church", label: "Church", icon: Church },
  { id: "cross", label: "Ministry", icon: Sparkles },
  { id: "book-open", label: "Bible", icon: BookOpen },
  { id: "users", label: "Community", icon: Users },
  { id: "children", label: "Children", icon: Heart },
  { id: "school", label: "School", icon: BookOpen },
  { id: "building", label: "Building", icon: Building2 },
  { id: "maintenance", label: "Maintenance", icon: Settings },
  { id: "wrench", label: "Wrench", icon: Wrench },
  { id: "hvac", label: "HVAC", icon: House },
  { id: "electricity", label: "Electricity", icon: Sparkles },
  { id: "water", label: "Water", icon: Droplets },
  { id: "cleaning", label: "Cleaning", icon: Settings },
  { id: "music", label: "Music", icon: Music4 },
  { id: "food", label: "Food", icon: Heart },
  { id: "heart", label: "Care", icon: Heart },
  { id: "hand-giving", label: "Giving", icon: HandCoins },
  { id: "donation", label: "Donation", icon: HandCoins },
];

const iconChoiceMap = new Map(iconChoices.map((choice) => [choice.id, choice]));

export const getIconComponent = (iconId?: string) => iconChoiceMap.get(iconId ?? "")?.icon ?? Church;

export const categoryLabels: Record<ChurchExpenseCategory, string> = {
  PROJECT: "Project",
  OPERATING_EXPENSE: "Operating Expense",
  MAINTENANCE: "Maintenance",
  MINISTRY: "Ministry",
  OTHER: "Other",
};

export const newsCategoryLabels: Record<ChurchNewsCategory, string> = {
  GENERAL: "General",
  THIS_WEEK: "This Week",
  UPCOMING: "Upcoming",
  REGISTRATION: "Registration",
  SERVICE: "Service",
  YOUTH: "Youth",
};

export const storagePathPrefix = "public/expenses";

export const uploadExpenseImage = async (file: File) => {
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const key = `${storagePathPrefix}/${crypto.randomUUID()}${safeExtension}`;

  await uploadData({
    path: key,
    data: file,
    options: {
      contentType: file.type || "image/png",
    },
  }).result;

  const result = await getUrl({
    path: key,
    options: {
      validateObjectExistence: true,
      expiresIn: 60 * 60 * 24,
    },
  });

  return {
    imageKey: key,
    imageUrl: result.url.toString(),
  };
};

export const removeExpenseImage = async (imageKey?: string) => {
  if (!imageKey) {
    return;
  }

  await remove({
    path: imageKey,
  });
};

const resolveExpenseImageUrls = async (items: ChurchExpense[]) =>
  Promise.all(
    items.map(async (item) => {
      if (!item.imageKey) {
        return item;
      }

      try {
        const signed = await getUrl({
          path: item.imageKey,
          options: {
            validateObjectExistence: true,
            expiresIn: 60 * 60,
          },
        });

        return {
          ...item,
          imageUrl: signed.url.toString(),
        };
      } catch {
        return item;
      }
    }),
  );

export const usePublicExpenses = (refreshIntervalSeconds: number) =>
  useQuery({
    queryKey: ["public-expenses"],
    queryFn: async () => {
      const response = await api.get<ExpenseListResponse>("/expenses");
      return resolveExpenseImageUrls(response.items);
    },
    refetchInterval: refreshIntervalSeconds * 1000,
    placeholderData: (previous) => previous,
  });

export const usePublicNews = (refreshIntervalSeconds: number) =>
  useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const response = await api.get<NewsListResponse>("/news");
      return response.items;
    },
    refetchInterval: refreshIntervalSeconds * 1000,
    placeholderData: (previous) => previous,
  });

export const usePublicDashboard = () =>
  useQuery({
    queryKey: ["public-dashboard"],
    queryFn: async () => {
      const response = await api.get<PublicDashboardResponse>("/dashboard");
      return {
        ...response,
        projects: await resolveExpenseImageUrls(response.projects),
      };
    },
    refetchInterval: (query) => {
      const payload = query.state.data as PublicDashboardResponse | undefined;
      const interval =
        payload?.settings.common.refreshIntervalSeconds ?? defaultDashboardSettings.common.refreshIntervalSeconds;
      return Math.max(15, interval) * 1000;
    },
    placeholderData: (previous) => previous,
  });

export const useAdminExpenses = () =>
  useQuery({
    queryKey: ["admin-expenses"],
    queryFn: async () => {
      const response = await api.get<ExpenseListResponse>("/admin/expenses");
      return resolveExpenseImageUrls(response.items);
    },
  });

export const useAdminNews = () =>
  useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const response = await api.get<NewsListResponse>("/admin/news");
      return response.items;
    },
  });

export const useAdminLiturgies = () =>
  useQuery({
    queryKey: ["admin-liturgies"],
    queryFn: async () => {
      const response = await api.get<LiturgyListResponse>("/admin/liturgies");
      return response.items;
    },
  });

export const useDashboardSettings = () =>
  useQuery({
    queryKey: ["dashboard-settings"],
    queryFn: async () => {
      try {
        const response = await api.get<DashboardSettingsResponse>("/settings");
        return response.settings;
      } catch {
        return defaultDashboardSettings;
      }
    },
    placeholderData: defaultDashboardSettings,
  });

export const useSaveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: CreateChurchExpenseInput | UpdateChurchExpenseInput }) => {
      if (input.id) {
        return api.put<ChurchExpense>(`/expenses/${input.id}`, input.values);
      }

      return api.post<ChurchExpense>("/expenses", input.values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useApproveExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => api.put<ApproveChurchExpenseResponse>(`/expenses/${expenseId}/approve`, {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => api.delete<{ success: true }>(`/expenses/${expenseId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useSaveNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: CreateChurchNewsInput | UpdateChurchNewsInput }) => {
      if (input.id) {
        return api.put<ChurchNews>(`/news/${input.id}`, input.values);
      }

      return api.post<ChurchNews>("/news", input.values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useApproveNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newsId: string) => api.put<ApproveChurchNewsResponse>(`/news/${newsId}/approve`, {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useDeleteNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newsId: string) => api.delete<{ success: true }>(`/news/${newsId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useSaveLiturgy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: CreateChurchLiturgyInput | UpdateChurchLiturgyInput }) => {
      if (input.id) {
        return api.put<ChurchLiturgy>(`/liturgies/${input.id}`, input.values);
      }

      return api.post<ChurchLiturgy>("/liturgies", input.values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-liturgies"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useDeleteLiturgy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (liturgyId: string) => api.delete<{ success: true }>(`/liturgies/${liturgyId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-liturgies"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useReorderExpenses = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReorderChurchExpensesInput) => api.put<ExpenseListResponse>("/expenses/order", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useReorderNews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReorderChurchNewsInput) => api.put<NewsListResponse>("/news/order", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-news"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useSaveSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateDashboardSettingsInput) =>
      api.put<DashboardSettingsResponse>("/admin/settings", settings),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const isValidPositiveNumber = (value: number, min: number) => Number.isFinite(value) && value >= min;

export const getSanitizedRotationIntervalSeconds = (value?: number) =>
  isValidPositiveNumber(value ?? Number.NaN, 5) ? Math.floor(value as number) : defaultDashboardSettings.common.mainViewRotationIntervalSeconds;

export const getSanitizedRefreshIntervalSeconds = (value?: number) =>
  isValidPositiveNumber(value ?? Number.NaN, 15) ? Math.floor(value as number) : defaultDashboardSettings.common.refreshIntervalSeconds;

export const getSanitizedItemsPerPage = (value?: number) =>
  isValidPositiveNumber(value ?? Number.NaN, 1) ? Math.floor(value as number) : defaultDashboardSettings.expenses.itemsPerPage;

export const getSanitizedUpcomingLiturgiesCount = (value?: number) => {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return defaultDashboardSettings.news.upcomingLiturgiesCount;
  }

  return Math.max(1, Math.min(10, Math.floor(value as number)));
};

export const churchNewsCategoryChoices = churchNewsCategories;
export { getExpenseApprovalStatus, isExpenseVisible, isNewsVisible };
