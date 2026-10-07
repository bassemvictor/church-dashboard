import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUrl, remove, uploadData } from "aws-amplify/storage";
import pica from "pica";
import { createElement } from "react";
import {
  BookOpen,
  Baby,
  Building2,
  BrushCleaning,
  CalendarDays,
  Church,
  Coins,
  Droplets,
  HandCoins,
  HandHeart,
  Handshake,
  Hammer,
  Heart,
  HeartHandshake,
  House,
  Music4,
  Settings,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Sprout,
  TentTree,
  Users,
  UsersRound,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "./api";
import { DynamicLucideIcon } from "../components/common/dynamic-lucide-icon";
import {
  dashboardStatusThresholds,
  defaultDashboardSettings,
  getExpenseApprovalStatus,
  isExpenseVisible,
  isNewsVisible,
  isDidYouKnowVisible,
  type ApproveChurchExpenseResponse,
  type ChurchExpense,
  type ChurchExpenseCategory,
  type ChurchNews,
  type ChurchDidYouKnow,
  type ApproveChurchNewsResponse,
  type ChurchNewsCategory,
  type ChurchExpenseStatus,
  type CreateChurchNewsInput,
  type CreateChurchExpenseInput,
  type CreateChurchDidYouKnowInput,
  type DashboardSettingsResponse,
  type ExpenseListResponse,
  type NewsListResponse,
  type DidYouKnowListResponse,
  type PublicDashboardResponse,
  type ReorderChurchNewsInput,
  type ReorderChurchExpensesInput,
  type ReorderChurchDidYouKnowInput,
  type SetChurchItemActiveInput,
  type UpdateChurchNewsInput,
  type UpdateChurchExpenseInput,
  type UpdateChurchDidYouKnowInput,
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
  { id: "coins", label: "Costs", icon: Coins },
  { id: "church", label: "Church", icon: Church },
  { id: "cross", label: "Ministry", icon: Sparkles },
  { id: "book-open", label: "Bible", icon: BookOpen },
  { id: "users", label: "Community", icon: Users },
  { id: "children", label: "Children", icon: Heart },
  { id: "kids", label: "Kids", icon: Baby },
  { id: "meeting", label: "Meeting", icon: CalendarDays },
  { id: "prayer", label: "Prayer", icon: HandHeart },
  { id: "gathering", label: "Gathering", icon: UsersRound },
  { id: "scouts", label: "Scouts", icon: TentTree },
  { id: "care-support", label: "Care", icon: HeartHandshake },
  { id: "fellowship", label: "Fellowship", icon: Handshake },
  { id: "school", label: "School", icon: BookOpen },
  { id: "building", label: "Building", icon: Building2 },
  { id: "maintenance", label: "Maintenance", icon: Settings },
  { id: "wrench", label: "Wrench", icon: Wrench },
  { id: "fixing", label: "Repairs", icon: Hammer },
  { id: "hvac", label: "HVAC", icon: House },
  { id: "snow-removal", label: "Snow removal", icon: Snowflake },
  { id: "lawn-care", label: "Lawn care", icon: Sprout },
  { id: "electricity", label: "Electricity", icon: Sparkles },
  { id: "water", label: "Water", icon: Droplets },
  { id: "cleaning", label: "Cleaning", icon: BrushCleaning },
  { id: "music", label: "Music", icon: Music4 },
  { id: "food", label: "Food", icon: Heart },
  { id: "meal", label: "Meal", icon: Utensils },
  { id: "heart", label: "Care", icon: Heart },
  { id: "hand-giving", label: "Giving", icon: HandCoins },
  { id: "donation", label: "Donation", icon: HandCoins },
  { id: "purchase", label: "Purchase", icon: ShoppingCart },
];

const iconChoiceMap = new Map(iconChoices.map((choice) => [choice.id, choice]));

const customIconComponents = new Map<string, LucideIcon>();

export const getIconComponent = (iconId?: string) => {
  const selectedIcon = iconChoiceMap.get(iconId ?? "")?.icon;
  if (selectedIcon || !iconId?.trim()) return selectedIcon ?? Church;

  const existingComponent = customIconComponents.get(iconId);
  if (existingComponent) return existingComponent;

  const CustomIcon = ((props) => createElement(DynamicLucideIcon, { ...props, name: iconId })) as LucideIcon;
  customIconComponents.set(iconId, CustomIcon);
  return CustomIcon;
};

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
const minimumExpenseImageWidth = 600;
const minimumExpenseImageHeight = 400;
// Project cards display images at a 6:5 ratio (96 × 80). Preparing that exact
// ratio once avoids a second crop and resize by the browser for every display.
const expenseImageAspectRatio = 6 / 5;
const maximumExpenseImageWidth = 1200;
const maximumExpenseImageHeight = 1000;

const getImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file could not be read as an image."));
    };
    image.src = objectUrl;
  });

const validateExpenseImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }

  const { width, height } = await getImageDimensions(file);
  if (width < minimumExpenseImageWidth || height < minimumExpenseImageHeight) {
    throw new Error(
      `Please use an image at least ${minimumExpenseImageWidth} × ${minimumExpenseImageHeight} pixels so it stays sharp on TV displays.`,
    );
  }
};

const prepareExpenseImage = async (file: File) => {
  const { width, height } = await getImageDimensions(file);
  const cropWidth = Math.round(Math.min(width, height * expenseImageAspectRatio));
  const cropHeight = Math.round(cropWidth / expenseImageAspectRatio);
  // Never enlarge an upload: it cannot add detail and makes compression artifacts
  // more visible. The maximum remains 12.5× the dimensions used on the dashboard.
  const scale = Math.min(1, maximumExpenseImageWidth / cropWidth, maximumExpenseImageHeight / cropHeight);
  const targetWidth = Math.round(cropWidth * scale);
  const targetHeight = Math.round(cropHeight * scale);
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The selected file could not be prepared for upload."));
      image.src = objectUrl;
    });

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = cropWidth;
    sourceCanvas.height = cropHeight;
    const sourceContext = sourceCanvas.getContext("2d");
    const destinationCanvas = document.createElement("canvas");
    destinationCanvas.width = targetWidth;
    destinationCanvas.height = targetHeight;

    if (!sourceContext) {
      throw new Error("Your browser could not prepare this image for upload.");
    }

    // JPEG has no transparency; give transparent source images a clean background.
    sourceContext.fillStyle = "#ffffff";
    sourceContext.fillRect(0, 0, cropWidth, cropHeight);

    // Centre-crop the image to the same aspect ratio as the dashboard thumbnail.
    // This makes the result predictable and prevents CSS object-cover from making
    // another crop at display time.
    sourceContext.drawImage(
      image,
      Math.round((width - cropWidth) / 2),
      Math.round((height - cropHeight) / 2),
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    await pica().resize(sourceCanvas, destinationCanvas, { quality: 3 });
    const blob = await pica().toBlob(destinationCanvas, "image/jpeg", 0.9);
    if (!blob) {
      throw new Error("The selected file could not be prepared for upload.");
    }

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "project-image"}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const uploadExpenseImage = async (file: File) => {
  await validateExpenseImage(file);
  const preparedFile = await prepareExpenseImage(file);
  const extension = preparedFile.name.includes(".") ? preparedFile.name.slice(preparedFile.name.lastIndexOf(".")) : "";
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const key = `${storagePathPrefix}/${crypto.randomUUID()}${safeExtension}`;

  await uploadData({
    path: key,
    data: preparedFile,
    options: {
      contentType: preparedFile.type || "image/png",
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

export const usePublicDashboard = () =>
  useQuery({
    queryKey: ["public-dashboard"],
    queryFn: async () => {
      const response = await api.get<PublicDashboardResponse>("/dashboard");
      return {
        ...response,
        projects: await resolveExpenseImageUrls(response.projects ?? []),
        news: response.news ?? [],
        didYouKnow: response.didYouKnow ?? [],
        liturgies: response.liturgies ?? [],
        settings: {
          ...defaultDashboardSettings,
          ...response.settings,
          common: { ...defaultDashboardSettings.common, ...response.settings?.common },
          expenses: { ...defaultDashboardSettings.expenses, ...response.settings?.expenses },
          budgetProgress: { ...defaultDashboardSettings.budgetProgress, ...response.settings?.budgetProgress },
          news: { ...defaultDashboardSettings.news, ...response.settings?.news },
          didYouKnow: { ...defaultDashboardSettings.didYouKnow, ...response.settings?.didYouKnow },
          liturgy: { ...defaultDashboardSettings.liturgy, ...response.settings?.liturgy },
        },
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

export const useAdminDidYouKnow = () =>
  useQuery({
    queryKey: ["admin-did-you-know"],
    queryFn: async () => {
      const response = await api.get<DidYouKnowListResponse>("/admin/did-you-know");
      return response.items;
    },
  });

export const useDashboardSettings = () =>
  useQuery({
    queryKey: ["dashboard-settings"],
    queryFn: async () => {
      try {
        const response = await api.get<DashboardSettingsResponse>("/admin/settings");
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

export const useSetExpenseActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { expenseId: string; active: boolean }) =>
      api.put<ApproveChurchExpenseResponse>(`/expenses/${input.expenseId}/active`, {
        active: input.active,
      } satisfies SetChurchItemActiveInput),
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

export const useSetNewsActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { newsId: string; active: boolean }) =>
      api.put<ApproveChurchNewsResponse>(`/news/${input.newsId}/active`, {
        active: input.active,
      } satisfies SetChurchItemActiveInput),
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

export const useSaveDidYouKnow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; values: CreateChurchDidYouKnowInput | UpdateChurchDidYouKnowInput }) => {
      if (input.id) {
        return api.put<ChurchDidYouKnow>(`/did-you-know/${input.id}`, input.values);
      }

      return api.post<ChurchDidYouKnow>("/did-you-know", input.values);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useSetDidYouKnowActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { didYouKnowId: string; active: boolean }) =>
      api.put<{ item: ChurchDidYouKnow }>(`/did-you-know/${input.didYouKnowId}/active`, {
        active: input.active,
      } satisfies SetChurchItemActiveInput),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-dashboard"] }),
      ]);
    },
  });
};

export const useDeleteDidYouKnow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (didYouKnowId: string) => api.delete<{ success: true }>(`/did-you-know/${didYouKnowId}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-did-you-know"] }),
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

export const useReorderDidYouKnow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReorderChurchDidYouKnowInput) =>
      api.put<DidYouKnowListResponse>("/did-you-know/order", payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-did-you-know"] }),
        queryClient.invalidateQueries({ queryKey: ["public-did-you-know"] }),
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
    return defaultDashboardSettings.liturgy.upcomingLiturgiesCount;
  }

  return Math.max(1, Math.min(10, Math.floor(value as number)));
};

export const churchNewsCategoryChoices = churchNewsCategories;
export { getExpenseApprovalStatus, isExpenseVisible, isNewsVisible, isDidYouKnowVisible };
