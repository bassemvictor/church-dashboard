export const churchExpenseCategories = [
  "PROJECT",
  "OPERATING_EXPENSE",
  "MAINTENANCE",
  "MINISTRY",
  "OTHER",
] as const;

export const churchExpenseStatuses = [
  "FUNDED",
  "ON_TRACK",
  "NEEDS_SUPPORT",
  "URGENT",
] as const;

export const churchStatusModes = ["AUTO", "MANUAL"] as const;
export const churchNewsApprovalStatuses = ["NOT_REQUIRED", "PENDING", "APPROVED"] as const;
export const churchNewsCategories = [
  "GENERAL",
  "THIS_WEEK",
  "UPCOMING",
  "REGISTRATION",
  "SERVICE",
  "YOUTH",
] as const;

export type ChurchExpenseCategory = typeof churchExpenseCategories[number];
export type ChurchExpenseStatus = typeof churchExpenseStatuses[number];
export type ChurchExpenseStatusMode = typeof churchStatusModes[number];
export type ChurchNewsApprovalStatus = typeof churchNewsApprovalStatuses[number];
export type ChurchNewsCategory = typeof churchNewsCategories[number];

export type ChurchExpense = {
  id: string;
  title: string;
  description?: string;
  paymentDate?: string;
  visibleFrom?: string;
  visibleUntil?: string;
  requiresApproval?: boolean;
  approvalStatus?: ChurchNewsApprovalStatus;
  category: ChurchExpenseCategory;
  totalBudget: number;
  fundedAmount: number;
  showFunded?: boolean;
  showProgress?: boolean;
  showStatus?: boolean;
  imageUrl?: string;
  imageKey?: string;
  icon?: string;
  displayOrder: number;
  active: boolean;
  statusMode: ChurchExpenseStatusMode;
  manualStatus?: ChurchExpenseStatus;
  customStatusText?: string;
  customSubText?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardSettings = {
  common: {
    churchName: string;
    showClock: boolean;
    showDate: boolean;
    showExpensesPage: boolean;
    showNewsPage: boolean;
    showDidYouKnowPage: boolean;
    refreshIntervalSeconds: number;
    mainViewRotationIntervalSeconds: number;
    mainVerseText?: string;
    mainVerseReference?: string;
  };
  expenses: {
    dashboardTitle: string;
    churchWebsiteUrl?: string;
    donationUrl?: string;
    eTransferText?: string;
    itemsPerPage: number;
  };
  news: {
    dashboardTitle: string;
    itemsPerPage: number;
  };
  didYouKnow: {
    dashboardTitle: string;
    itemsPerPage: number;
  };
  liturgy: {
    googleCalendarId?: string;
    googleCalendarApiKey?: string;
    lookAheadWeeks: number;
    upcomingLiturgiesCount: number;
  };
};

export type ChurchNews = {
  id: string;
  title: string;
  description?: string;
  category?: ChurchNewsCategory;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  requiresApproval?: boolean;
  approvalStatus?: ChurchNewsApprovalStatus;
  location?: string;
  icon?: string;
  active: boolean;
  priority?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ChurchDidYouKnow = {
  id: string;
  factText: string;
  highlightText?: string;
  supportingText?: string;
  icon?: string;
  visibleFrom?: string;
  visibleUntil?: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ChurchLiturgy = {
  id: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListResponse = {
  items: ChurchExpense[];
  generatedAt: string;
};

export type NewsListResponse = {
  items: ChurchNews[];
  generatedAt: string;
};

export type DidYouKnowListResponse = {
  items: ChurchDidYouKnow[];
  generatedAt: string;
};

export type DashboardSettingsResponse = {
  settings: DashboardSettings;
};

export type PublicDashboardResponse = {
  projects: ChurchExpense[];
  news: ChurchNews[];
  didYouKnow: ChurchDidYouKnow[];
  liturgies: ChurchLiturgy[];
  settings: DashboardSettings;
  serverTime: string;
};

export type CreateChurchExpenseInput = {
  title: string;
  description?: string;
  paymentDate?: string;
  visibleFrom?: string;
  visibleUntil?: string;
  requiresApproval?: boolean;
  approvalStatus?: ChurchNewsApprovalStatus;
  category: ChurchExpenseCategory;
  totalBudget: number;
  fundedAmount: number;
  showFunded?: boolean;
  showProgress?: boolean;
  showStatus?: boolean;
  imageUrl?: string;
  imageKey?: string;
  icon?: string;
  active: boolean;
  statusMode: ChurchExpenseStatusMode;
  manualStatus?: ChurchExpenseStatus;
  customStatusText?: string;
  customSubText?: string;
};

export type UpdateChurchExpenseInput = CreateChurchExpenseInput;

export type CreateChurchNewsInput = {
  title: string;
  description?: string;
  category?: ChurchNewsCategory;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  requiresApproval?: boolean;
  approvalStatus?: ChurchNewsApprovalStatus;
  location?: string;
  icon?: string;
  active: boolean;
  priority?: number;
};

export type UpdateChurchNewsInput = CreateChurchNewsInput;

export type CreateChurchDidYouKnowInput = {
  factText: string;
  highlightText?: string;
  supportingText?: string;
  icon?: string;
  visibleFrom?: string;
  visibleUntil?: string;
  active: boolean;
};

export type UpdateChurchDidYouKnowInput = CreateChurchDidYouKnowInput;

export type ReorderChurchExpensesInput = {
  items: Array<{
    id: string;
    displayOrder: number;
  }>;
};

export type ReorderChurchNewsInput = {
  items: Array<{
    id: string;
    displayOrder: number;
  }>;
};

export type ReorderChurchDidYouKnowInput = {
  items: Array<{
    id: string;
    displayOrder: number;
  }>;
};

export type ApproveChurchNewsResponse = {
  item: ChurchNews;
};

export type ApproveChurchExpenseResponse = {
  item: ChurchExpense;
};

export type SetChurchItemActiveInput = {
  active: boolean;
};

export type UpdateDashboardSettingsInput = DashboardSettings;

export const dashboardStatusThresholds: Array<{
  minPercentage: number;
  status: ChurchExpenseStatus;
}> = [
  { minPercentage: 100, status: "FUNDED" },
  { minPercentage: 70, status: "ON_TRACK" },
  { minPercentage: 40, status: "NEEDS_SUPPORT" },
  { minPercentage: 0, status: "URGENT" },
];

export const defaultDashboardSettings: DashboardSettings = {
  common: {
    churchName: "St. Mark Coptic Orthodox Church",
    showClock: true,
    showDate: true,
    showExpensesPage: true,
    showNewsPage: true,
    showDidYouKnowPage: true,
    refreshIntervalSeconds: 300,
    mainViewRotationIntervalSeconds: 30,
    mainVerseText:
      "Each one must give as he has decided in his heart, not reluctantly or under compulsion, for God loves a cheerful giver.",
    mainVerseReference: "2 Corinthians 9:7",
  },
  expenses: {
    dashboardTitle: "ONGOING PROJECTS & EXPENSES",
    churchWebsiteUrl: "",
    donationUrl: "",
    eTransferText: "give@stmarkexample.ca",
    itemsPerPage: 4,
  },
  news: {
    dashboardTitle: "CHURCH NEWS & ANNOUNCEMENTS",
    itemsPerPage: 4,
  },
  didYouKnow: {
    dashboardTitle: "DID YOU KNOW?",
    itemsPerPage: 4,
  },
  liturgy: {
    googleCalendarId: "",
    googleCalendarApiKey: "",
    lookAheadWeeks: 3,
    upcomingLiturgiesCount: 3,
  },
};

const resolveNow = (now: Date | string | number) => (now instanceof Date ? now : new Date(now));
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const resolveVisibilityBoundaryTime = (value: string, boundary: "start" | "end") => {
  const matchedDateOnly = value.match(dateOnlyPattern);
  if (matchedDateOnly) {
    const [, year, month, day] = matchedDateOnly;
    const date = boundary === "end"
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    return date.getTime();
  }

  return new Date(value).getTime();
};

export const isVisibleWithinWindow = (
  window: { visibleFrom?: string; visibleUntil?: string },
  now: Date | string | number = new Date(),
) => {
  const currentTime = resolveNow(now).getTime();

  if (window.visibleFrom) {
    const startTime = resolveVisibilityBoundaryTime(window.visibleFrom, "start");
    if (!Number.isNaN(startTime) && currentTime < startTime) {
      return false;
    }
  }

  if (window.visibleUntil) {
    const endTime = resolveVisibilityBoundaryTime(window.visibleUntil, "end");
    if (!Number.isNaN(endTime) && currentTime > endTime) {
      return false;
    }
  }

  return true;
};

export const getNewsApprovalStatus = (
  news: Pick<ChurchNews, "requiresApproval" | "approvalStatus">,
): ChurchNewsApprovalStatus => {
  if (!news.requiresApproval) {
    return "NOT_REQUIRED";
  }

  return news.approvalStatus ?? "PENDING";
};

export const isNewsApproved = (news: Pick<ChurchNews, "requiresApproval" | "approvalStatus">) =>
  !news.requiresApproval || getNewsApprovalStatus(news) === "APPROVED";

export const getExpenseApprovalStatus = (
  expense: Pick<ChurchExpense, "requiresApproval" | "approvalStatus">,
): ChurchNewsApprovalStatus => {
  if (!expense.requiresApproval) {
    return "NOT_REQUIRED";
  }

  return expense.approvalStatus ?? "PENDING";
};

export const isExpenseApproved = (expense: Pick<ChurchExpense, "requiresApproval" | "approvalStatus">) =>
  !expense.requiresApproval || getExpenseApprovalStatus(expense) === "APPROVED";

export const isExpenseVisible = (
  expense: Pick<ChurchExpense, "active" | "visibleFrom" | "visibleUntil" | "requiresApproval" | "approvalStatus">,
  now: Date | string | number = new Date(),
) =>
  expense.active &&
  isVisibleWithinWindow({
    visibleFrom: expense.visibleFrom,
    visibleUntil: expense.visibleUntil,
  }, now) &&
  isExpenseApproved(expense);

export const isNewsVisible = (
  news: Pick<ChurchNews, "active" | "startDate" | "endDate" | "requiresApproval" | "approvalStatus">,
  now: Date | string | number = new Date(),
) =>
  news.active &&
  isVisibleWithinWindow({
    visibleFrom: news.startDate,
    visibleUntil: news.endDate,
  }, now) &&
  isNewsApproved(news);

export const isDidYouKnowVisible = (
  item: Pick<ChurchDidYouKnow, "active" | "visibleFrom" | "visibleUntil">,
  now: Date | string | number = new Date(),
) =>
  item.active &&
  isVisibleWithinWindow({
    visibleFrom: item.visibleFrom,
    visibleUntil: item.visibleUntil,
  }, now);
