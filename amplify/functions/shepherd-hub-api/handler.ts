import { randomUUID } from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyHandlerV2 } from "aws-lambda";

import {
  churchNewsApprovalStatuses,
  churchNewsCategories,
  churchExpenseCategories,
  churchExpenseStatuses,
  churchStatusModes,
  type ChurchNews,
  type ChurchNewsApprovalStatus,
  type ChurchNewsCategory,
  defaultDashboardSettings,
  type CreateChurchNewsInput,
  type ChurchExpense,
  type ChurchExpenseCategory,
  type ChurchExpenseStatus,
  type ChurchExpenseStatusMode,
  type CreateChurchExpenseInput,
  type DashboardSettings,
  type SetChurchItemActiveInput,
  getExpenseApprovalStatus,
  getNewsApprovalStatus,
  isExpenseVisible,
  isNewsVisible,
  type ReorderChurchNewsInput,
  type ReorderChurchExpensesInput,
  type ChurchDidYouKnow,
  type DidYouKnowCardColor,
  type CreateChurchDidYouKnowInput,
  type ReorderChurchDidYouKnowInput,
  isDidYouKnowVisible,
} from "../../../shared/church-dashboard.js";

type BaseItem = {
  PK: string;
  SK: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
};

type ExpenseItem = BaseItem & {
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
};

type SettingsItem = BaseItem & {
  settings: DashboardSettings;
};

type NewsItem = BaseItem & {
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
};

type DidYouKnowItem = BaseItem & {
  id: string;
  factText: string;
  highlightText?: string;
  supportingText?: string;
  icon?: string;
  colorTheme?: DidYouKnowCardColor;
  visibleFrom?: string;
  visibleUntil?: string;
  active: boolean;
  displayOrder: number;
};

type RequestContext = {
  groups: string[];
  isAdmin: boolean;
};

type GoogleCalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
};

const churchTimeZone = "America/Toronto";
const churchDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: churchTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const tableName = process.env.SHEPHERD_HUB_RECORDS_TABLE;

if (!tableName) {
  throw new Error("Missing SHEPHERD_HUB_RECORDS_TABLE environment variable.");
}

const ddbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

const padDisplayOrder = (displayOrder: number) => displayOrder.toString().padStart(5, "0");
const expensePk = (id: string) => `EXPENSE#${id}`;
const newsPk = (id: string) => `NEWS#${id}`;
const didYouKnowPk = (id: string) => `DID_YOU_KNOW#${id}`;
const settingsPk = () => "SETTINGS#DASHBOARD";

const normalizeGroups = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeGroups(entry));
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeGroups(parsed);
    } catch {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ""));
    }
  }

  return trimmed.split(",").map((entry) => entry.trim());
};

const getRequestContext = (event: APIGatewayProxyEventV2WithJWTAuthorizer): RequestContext => {
  const claims = event.requestContext.authorizer?.jwt.claims ?? {};
  const groups = normalizeGroups(claims["cognito:groups"]);
  return {
    groups,
    isAdmin: groups.includes("admin"),
  };
};

const requireAdmin = (context: RequestContext) => {
  if (!context.isAdmin) {
    throw Object.assign(new Error("You do not have permission to perform this action."), { statusCode: 403 });
  }
};

const parseBody = <T>(event: APIGatewayProxyEventV2WithJWTAuthorizer): T => {
  if (!event.body) {
    throw Object.assign(new Error("Request body is required."), { statusCode: 400 });
  }

  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 });
  }
};

const isEnumValue = <T extends readonly string[]>(allowedValues: T, value: unknown): value is T[number] =>
  typeof value === "string" && allowedValues.includes(value);

const parseOptionalString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw Object.assign(new Error("Expected a string value."), { statusCode: 400 });
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseObject = (value: unknown, fieldName: string) => {
  if (!isRecord(value)) {
    throw Object.assign(new Error(`${fieldName} must be an object.`), { statusCode: 400 });
  }

  return value;
};

const parseRequiredString = (value: unknown, fieldName: string) => {
  const parsedValue = parseOptionalString(value);
  if (!parsedValue) {
    throw Object.assign(new Error(`${fieldName} is required.`), { statusCode: 400 });
  }

  return parsedValue;
};

const parseNumber = (value: unknown, fieldName: string) => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw Object.assign(new Error(`${fieldName} must be a non-negative number.`), { statusCode: 400 });
  }

  return value;
};

const parsePositiveNumber = (value: unknown, fieldName: string, minimum: number) => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value) || value < minimum) {
    throw Object.assign(new Error(`${fieldName} must be at least ${minimum}.`), { statusCode: 400 });
  }

  return value;
};

const parseIntegerInRange = (value: unknown, fieldName: string, minimum: number, maximum: number) => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw Object.assign(new Error(`${fieldName} must be an integer between ${minimum} and ${maximum}.`), {
      statusCode: 400,
    });
  }

  return value;
};

const parseBoolean = (value: unknown, fieldName: string) => {
  if (typeof value !== "boolean") {
    throw Object.assign(new Error(`${fieldName} must be true or false.`), { statusCode: 400 });
  }

  return value;
};

const validateSetActiveInput = (input: Record<string, unknown>): SetChurchItemActiveInput => ({
  active: parseBoolean(input.active, "active"),
});

const validateVisibilityRange = (visibleFrom: string | undefined, visibleUntil: string | undefined) => {
  if (visibleFrom && visibleUntil && new Date(visibleFrom).getTime() > new Date(visibleUntil).getTime()) {
    throw Object.assign(new Error("visibleUntil must be on or after visibleFrom."), { statusCode: 400 });
  }
};

const validateExpenseInput = (input: Record<string, unknown>): CreateChurchExpenseInput => {
  const category = input.category;
  if (!isEnumValue(churchExpenseCategories, category)) {
    throw Object.assign(new Error("category is invalid."), { statusCode: 400 });
  }

  const statusMode = input.statusMode;
  if (!isEnumValue(churchStatusModes, statusMode)) {
    throw Object.assign(new Error("statusMode is invalid."), { statusCode: 400 });
  }

  const manualStatus = input.manualStatus;
  if (manualStatus !== undefined && !isEnumValue(churchExpenseStatuses, manualStatus)) {
    throw Object.assign(new Error("manualStatus is invalid."), { statusCode: 400 });
  }

  const paymentDate = parseOptionalIsoDate(input.paymentDate, "paymentDate");
  const visibleFrom = parseOptionalIsoDate(input.visibleFrom, "visibleFrom");
  const visibleUntil = parseOptionalIsoDate(input.visibleUntil, "visibleUntil");
  const requiresApproval = input.requiresApproval === undefined ? undefined : parseBoolean(input.requiresApproval, "requiresApproval");
  const approvalStatus = input.approvalStatus;
  if (approvalStatus !== undefined && !isEnumValue(churchNewsApprovalStatuses, approvalStatus)) {
    throw Object.assign(new Error("approvalStatus is invalid."), { statusCode: 400 });
  }
  validateVisibilityRange(visibleFrom, visibleUntil);

  return {
    title: parseRequiredString(input.title, "title"),
    description: parseOptionalString(input.description),
    paymentDate,
    visibleFrom,
    visibleUntil,
    requiresApproval,
    approvalStatus: approvalStatus as ChurchNewsApprovalStatus | undefined,
    category,
    totalBudget: parseNumber(input.totalBudget, "totalBudget"),
    fundedAmount: parseNumber(input.fundedAmount, "fundedAmount"),
    showFunded: input.showFunded === undefined ? undefined : parseBoolean(input.showFunded, "showFunded"),
    showProgress: input.showProgress === undefined ? undefined : parseBoolean(input.showProgress, "showProgress"),
    showStatus: input.showStatus === undefined ? undefined : parseBoolean(input.showStatus, "showStatus"),
    imageUrl: parseOptionalString(input.imageUrl),
    imageKey: parseOptionalString(input.imageKey),
    icon: parseOptionalString(input.icon),
    active: parseBoolean(input.active, "active"),
    statusMode,
    manualStatus: manualStatus as ChurchExpenseStatus | undefined,
    customStatusText: parseOptionalString(input.customStatusText),
    customSubText: parseOptionalString(input.customSubText),
  };
};

const validateDidYouKnowInput = (input: Record<string, unknown>): CreateChurchDidYouKnowInput => {
  const visibleFrom = parseOptionalIsoDate(input.visibleFrom, "visibleFrom");
  const visibleUntil = parseOptionalIsoDate(input.visibleUntil, "visibleUntil");
  validateVisibilityRange(visibleFrom, visibleUntil);
  const colorTheme = parseOptionalString(input.colorTheme);
  if (colorTheme && !["default", "blue", "green", "rose", "violet"].includes(colorTheme)) {
    throw Object.assign(new Error("colorTheme is invalid."), { statusCode: 400 });
  }

  return {
    factText: parseRequiredString(input.factText, "factText"),
    highlightText: parseOptionalString(input.highlightText),
    supportingText: parseOptionalString(input.supportingText),
    icon: parseOptionalString(input.icon),
    colorTheme: colorTheme as DidYouKnowCardColor | undefined,
    visibleFrom,
    visibleUntil,
    active: parseBoolean(input.active, "active"),
  };
};

const validateSettingsInput = (input: Record<string, unknown>): DashboardSettings => {
  const common = parseObject(input.common, "common");
  const expenses = parseObject(input.expenses, "expenses");
  const news = parseObject(input.news, "news");
  const didYouKnow = input.didYouKnow === undefined ? undefined : parseObject(input.didYouKnow, "didYouKnow");
  const liturgy = parseObject(input.liturgy, "liturgy");

  return {
    common: {
      churchName: parseRequiredString(common.churchName, "common.churchName"),
      showClock: parseBoolean(common.showClock, "common.showClock"),
      showDate: parseBoolean(common.showDate, "common.showDate"),
      showExpensesPage: parseBoolean(common.showExpensesPage, "common.showExpensesPage"),
      showNewsPage: parseBoolean(common.showNewsPage, "common.showNewsPage"),
      showDidYouKnowPage: common.showDidYouKnowPage === undefined
        ? defaultDashboardSettings.common.showDidYouKnowPage
        : parseBoolean(common.showDidYouKnowPage, "common.showDidYouKnowPage"),
      refreshIntervalSeconds: parsePositiveNumber(common.refreshIntervalSeconds, "common.refreshIntervalSeconds", 15),
      mainViewRotationIntervalSeconds: parsePositiveNumber(
        common.mainViewRotationIntervalSeconds,
        "common.mainViewRotationIntervalSeconds",
        5,
      ),
      mainVerseText: parseOptionalString(common.mainVerseText),
      mainVerseReference: parseOptionalString(common.mainVerseReference),
    },
    expenses: {
      dashboardTitle: parseRequiredString(expenses.dashboardTitle, "expenses.dashboardTitle"),
      churchWebsiteUrl: parseOptionalString(expenses.churchWebsiteUrl),
      donationUrl: parseOptionalString(expenses.donationUrl),
      eTransferText: parseOptionalString(expenses.eTransferText),
      itemsPerPage: parsePositiveNumber(expenses.itemsPerPage, "expenses.itemsPerPage", 1),
    },
    news: {
      dashboardTitle: parseRequiredString(news.dashboardTitle, "news.dashboardTitle"),
      itemsPerPage: parsePositiveNumber(news.itemsPerPage, "news.itemsPerPage", 1),
    },
    didYouKnow: {
      dashboardTitle: didYouKnow?.dashboardTitle === undefined
        ? defaultDashboardSettings.didYouKnow.dashboardTitle
        : parseRequiredString(didYouKnow.dashboardTitle, "didYouKnow.dashboardTitle"),
      itemsPerPage: didYouKnow?.itemsPerPage === undefined
        ? defaultDashboardSettings.didYouKnow.itemsPerPage
        : parsePositiveNumber(didYouKnow.itemsPerPage, "didYouKnow.itemsPerPage", 1),
    },
    liturgy: {
      googleCalendarId: parseOptionalString(liturgy.googleCalendarId),
      googleCalendarApiKey: parseOptionalString(liturgy.googleCalendarApiKey),
      lookAheadWeeks: parseIntegerInRange(
        liturgy.lookAheadWeeks,
        "liturgy.lookAheadWeeks",
        1,
        8,
      ),
      upcomingLiturgiesCount: parseIntegerInRange(
        liturgy.upcomingLiturgiesCount,
        "liturgy.upcomingLiturgiesCount",
        1,
        10,
      ),
    },
  };
};

const sanitizeDashboardSettings = (settings?: Partial<DashboardSettings>): DashboardSettings => ({
  ...defaultDashboardSettings,
  ...settings,
  common: { ...defaultDashboardSettings.common, ...settings?.common },
  expenses: { ...defaultDashboardSettings.expenses, ...settings?.expenses },
  news: { ...defaultDashboardSettings.news, ...settings?.news },
  didYouKnow: { ...defaultDashboardSettings.didYouKnow, ...settings?.didYouKnow },
  liturgy: { ...defaultDashboardSettings.liturgy, ...settings?.liturgy },
});

const sanitizePublicDashboardSettings = (settings: DashboardSettings): DashboardSettings => ({
  ...settings,
  liturgy: {
    ...settings.liturgy,
    googleCalendarApiKey: "",
  },
});

const toExpense = (item: ExpenseItem): ChurchExpense => ({
  id: item.id,
  title: item.title,
  description: item.description,
  paymentDate: item.paymentDate,
  visibleFrom: item.visibleFrom,
  visibleUntil: item.visibleUntil,
  requiresApproval: item.requiresApproval,
  approvalStatus: item.approvalStatus,
  category: item.category,
  totalBudget: item.totalBudget,
  fundedAmount: item.fundedAmount,
  showFunded: item.showFunded ?? true,
  showProgress: item.showProgress ?? true,
  showStatus: item.showStatus ?? true,
  imageUrl: item.imageUrl,
  imageKey: item.imageKey,
  icon: item.icon,
  displayOrder: item.displayOrder,
  active: item.active,
  statusMode: item.statusMode,
  manualStatus: item.manualStatus,
  customStatusText: item.customStatusText,
  customSubText: item.customSubText,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const toExpenseItem = (expense: ChurchExpense): ExpenseItem => ({
  PK: expensePk(expense.id),
  SK: "EXPENSE",
  entityType: "Expense",
  GSI1PK: "EXPENSE",
  GSI1SK: `${padDisplayOrder(expense.displayOrder)}#${expense.id}`,
  GSI2PK: expense.active ? "EXPENSE#ACTIVE" : "EXPENSE#INACTIVE",
  GSI2SK: `${padDisplayOrder(expense.displayOrder)}#${expense.id}`,
  ...expense,
});

const toNews = (item: NewsItem): ChurchNews => ({
  id: item.id,
  title: item.title,
  description: item.description,
  category: item.category,
  eventDate: item.eventDate,
  startDate: item.startDate,
  endDate: item.endDate,
  requiresApproval: item.requiresApproval,
  approvalStatus: item.approvalStatus,
  location: item.location,
  icon: item.icon,
  active: item.active,
  priority: item.priority,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const toNewsItem = (news: ChurchNews): NewsItem => ({
  PK: newsPk(news.id),
  SK: "NEWS",
  entityType: "ChurchNews",
  GSI1PK: "NEWS",
  GSI1SK: `${padDisplayOrder(news.displayOrder)}#${news.id}`,
  GSI2PK: news.active ? "NEWS#ACTIVE" : "NEWS#INACTIVE",
  GSI2SK: `${padDisplayOrder(news.displayOrder)}#${news.id}`,
  ...news,
});

const toDidYouKnow = (item: DidYouKnowItem): ChurchDidYouKnow => ({
  id: item.id,
  factText: item.factText,
  highlightText: item.highlightText,
  supportingText: item.supportingText,
  icon: item.icon,
  colorTheme: item.colorTheme,
  visibleFrom: item.visibleFrom,
  visibleUntil: item.visibleUntil,
  active: item.active,
  displayOrder: item.displayOrder,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const toDidYouKnowItem = (item: ChurchDidYouKnow): DidYouKnowItem => ({
  PK: didYouKnowPk(item.id),
  SK: "DID_YOU_KNOW",
  entityType: "ChurchDidYouKnow",
  GSI1PK: "DID_YOU_KNOW",
  GSI1SK: `${padDisplayOrder(item.displayOrder)}#${item.id}`,
  GSI2PK: item.active ? "DID_YOU_KNOW#ACTIVE" : "DID_YOU_KNOW#INACTIVE",
  GSI2SK: `${padDisplayOrder(item.displayOrder)}#${item.id}`,
  ...item,
});

const parseOptionalIsoDate = (value: unknown, fieldName: string) => {
  const parsed = parseOptionalString(value);
  if (!parsed) {
    return undefined;
  }

  const normalized = new Date(parsed);
  if (Number.isNaN(normalized.getTime())) {
    throw Object.assign(new Error(`${fieldName} must be a valid date.`), { statusCode: 400 });
  }

  return normalized.toISOString();
};

const validateNewsInput = (input: Record<string, unknown>): CreateChurchNewsInput => {
  const category = input.category;
  if (category !== undefined && !isEnumValue(churchNewsCategories, category)) {
    throw Object.assign(new Error("category is invalid."), { statusCode: 400 });
  }

  const startDate = parseOptionalIsoDate(input.startDate, "startDate");
  const endDate = parseOptionalIsoDate(input.endDate, "endDate");
  const eventDate = parseOptionalIsoDate(input.eventDate, "eventDate");
  const requiresApproval = input.requiresApproval === undefined ? undefined : parseBoolean(input.requiresApproval, "requiresApproval");
  const approvalStatus = input.approvalStatus;
  if (approvalStatus !== undefined && !isEnumValue(churchNewsApprovalStatuses, approvalStatus)) {
    throw Object.assign(new Error("approvalStatus is invalid."), { statusCode: 400 });
  }
  validateVisibilityRange(startDate, endDate);

  return {
    title: parseRequiredString(input.title, "title"),
    description: parseOptionalString(input.description),
    category: category as ChurchNewsCategory | undefined,
    eventDate,
    startDate,
    endDate,
    requiresApproval,
    approvalStatus: approvalStatus as ChurchNewsApprovalStatus | undefined,
    location: parseOptionalString(input.location),
    icon: parseOptionalString(input.icon),
    active: parseBoolean(input.active, "active"),
    priority: input.priority === undefined ? undefined : parseNumber(input.priority, "priority"),
  };
};

const listExpenses = async (activeOnly: boolean, now = new Date()) => {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: activeOnly ? "GSI2" : "GSI1",
      KeyConditionExpression: activeOnly ? "GSI2PK = :pk" : "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": activeOnly ? "EXPENSE#ACTIVE" : "EXPENSE",
      },
    }),
  );

  const items = (result.Items ?? []) as ExpenseItem[];
  return (activeOnly ? items.filter((item) => isExpenseVisible(item, now)) : items)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toExpense);
};

const compareNews = (left: ChurchNews, right: ChurchNews) => {
  const priorityDiff = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const orderDiff = left.displayOrder - right.displayOrder;
  if (orderDiff !== 0) {
    return orderDiff;
  }

  const leftEventTime = left.eventDate ? new Date(left.eventDate).getTime() : Number.POSITIVE_INFINITY;
  const rightEventTime = right.eventDate ? new Date(right.eventDate).getTime() : Number.POSITIVE_INFINITY;
  return leftEventTime - rightEventTime;
};

const listNews = async (activeOnly: boolean, now = new Date()) => {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: activeOnly ? "GSI2" : "GSI1",
      KeyConditionExpression: activeOnly ? "GSI2PK = :pk" : "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": activeOnly ? "NEWS#ACTIVE" : "NEWS",
      },
    }),
  );

  const items = (result.Items ?? []) as NewsItem[];
  const visibleItems = activeOnly ? items.filter((item) => isNewsVisible(item, now)) : items;
  return visibleItems
    .map(toNews)
    .sort(activeOnly ? compareNews : (left, right) => left.displayOrder - right.displayOrder);
};

const listDidYouKnow = async (activeOnly: boolean, now = new Date()) => {
  const result = await documentClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: activeOnly ? "GSI2" : "GSI1",
      KeyConditionExpression: activeOnly ? "GSI2PK = :pk" : "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": activeOnly ? "DID_YOU_KNOW#ACTIVE" : "DID_YOU_KNOW",
      },
    }),
  );

  const items = (result.Items ?? []) as DidYouKnowItem[];
  return (activeOnly ? items.filter((item) => isDidYouKnowVisible(item, now)) : items)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(toDidYouKnow);
};

const hasConfiguredGoogleCalendar = (settings: DashboardSettings) =>
  Boolean(settings.liturgy.googleCalendarId && settings.liturgy.googleCalendarApiKey);

const extractDateFromGoogleEvent = (event: GoogleCalendarEvent) => {
  const startValue = event.start?.dateTime ?? event.start?.date;
  if (!startValue) {
    return null;
  }

  if (event.start?.date) {
    return event.start.date;
  }

  const parsed = new Date(startValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return churchDateFormatter.format(parsed);
};

const formatGoogleEventDescription = (event: GoogleCalendarEvent, summary: string) => {
  const parts: string[] = [];
  const normalizedSummary = summary.trim();

  if (normalizedSummary && normalizedSummary.toLowerCase() !== "divine liturgy") {
    parts.push(normalizedSummary);
  }

  const startDateTime = event.start?.dateTime;
  if (startDateTime) {
    const parsed = new Date(startDateTime);
    if (!Number.isNaN(parsed.getTime())) {
      parts.push(
        new Intl.DateTimeFormat("en-CA", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: churchTimeZone,
        }).format(parsed),
      );
    }
  }

  if (event.location?.trim()) {
    parts.push(event.location.trim());
  }

  return parts.length ? parts.join(" · ") : undefined;
};

const listGoogleCalendarLiturgies = async (settings: DashboardSettings, now = new Date()) => {
  const calendarId = settings.liturgy.googleCalendarId?.trim();
  const apiKey = settings.liturgy.googleCalendarApiKey?.trim();
  if (!calendarId || !apiKey) {
    return [];
  }

  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + settings.liturgy.lookAheadWeeks * 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "250");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load Google Calendar liturgies (${response.status}).`);
  }

  const payload = await response.json() as GoogleCalendarEventsResponse;
  const items: Array<{
    id: string;
    date: string;
    startDateTime?: string;
    endDateTime?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }> = [];

  for (const event of payload.items ?? []) {
    const summary = event.summary?.trim();
    if (!summary || !summary.toLowerCase().includes("divine liturgy")) {
      continue;
    }

    const date = extractDateFromGoogleEvent(event);
    if (!date) {
      continue;
    }

    items.push({
      id: event.id ?? `${date}-${summary.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      date,
      startDateTime: event.start?.dateTime,
      endDateTime: event.end?.dateTime,
      description: formatGoogleEventDescription(event, summary),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  return items.sort((left, right) => left.date.localeCompare(right.date));
};

const listPublicLiturgies = async (settings: DashboardSettings, now = new Date()) => {
  if (!hasConfiguredGoogleCalendar(settings)) {
    return [];
  }

  try {
    return await listGoogleCalendarLiturgies(settings, now);
  } catch (error) {
    console.error("Unable to refresh Google Calendar liturgies.", error);
    return [];
  }
};

const getExpense = async (id: string) => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: expensePk(id),
        SK: "EXPENSE",
      },
    }),
  );

  return result.Item as ExpenseItem | undefined;
};

const getNews = async (id: string) => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: newsPk(id),
        SK: "NEWS",
      },
    }),
  );

  return result.Item as NewsItem | undefined;
};

const getDidYouKnow = async (id: string) => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: didYouKnowPk(id), SK: "DID_YOU_KNOW" },
    }),
  );

  return result.Item as DidYouKnowItem | undefined;
};

const getSettings = async () => {
  const result = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: settingsPk(),
        SK: "SETTINGS",
      },
    }),
  );

  const settingsItem = result.Item as SettingsItem | undefined;
  return sanitizeDashboardSettings(settingsItem?.settings);
};

const saveSettings = async (settings: DashboardSettings) => {
  const now = new Date().toISOString();
  const current = await documentClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: settingsPk(),
        SK: "SETTINGS",
      },
    }),
  );
  const existing = current.Item as SettingsItem | undefined;
  const sanitizedSettings = sanitizeDashboardSettings(settings);

  const item: SettingsItem = {
    PK: settingsPk(),
    SK: "SETTINGS",
    entityType: "DashboardSettings",
    settings: sanitizedSettings,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );

  return sanitizedSettings;
};

const createExpense = async (input: CreateChurchExpenseInput) => {
  const now = new Date().toISOString();
  const existingItems = await listExpenses(false);
  const nextDisplayOrder = existingItems.length + 1;

  const expense: ChurchExpense = {
    id: randomUUID(),
    displayOrder: nextDisplayOrder,
    createdAt: now,
    updatedAt: now,
    ...input,
    showFunded: input.showFunded ?? false,
    showProgress: input.showProgress ?? false,
    showStatus: input.showStatus ?? false,
    requiresApproval: input.requiresApproval ?? false,
    approvalStatus: input.requiresApproval ? "PENDING" : "NOT_REQUIRED",
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toExpenseItem(expense),
    }),
  );

  return expense;
};

const createNews = async (input: CreateChurchNewsInput) => {
  const now = new Date().toISOString();
  const existingItems = await listNews(false);
  const nextDisplayOrder = existingItems.length + 1;

  const news: ChurchNews = {
    id: randomUUID(),
    displayOrder: nextDisplayOrder,
    createdAt: now,
    updatedAt: now,
    ...input,
    requiresApproval: input.requiresApproval ?? false,
    approvalStatus: input.requiresApproval ? "PENDING" : "NOT_REQUIRED",
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toNewsItem(news),
    }),
  );

  return news;
};

const createDidYouKnow = async (input: CreateChurchDidYouKnowInput) => {
  const now = new Date().toISOString();
  const item: ChurchDidYouKnow = {
    id: randomUUID(),
    displayOrder: (await listDidYouKnow(false)).length + 1,
    createdAt: now,
    updatedAt: now,
    ...input,
  };

  await documentClient.send(new PutCommand({ TableName: tableName, Item: toDidYouKnowItem(item) }));
  return item;
};

const updateExpense = async (id: string, input: CreateChurchExpenseInput) => {
  const existing = await getExpense(id);
  if (!existing) {
    throw Object.assign(new Error("Expense not found."), { statusCode: 404 });
  }

  const nextRequiresApproval = input.requiresApproval ?? existing.requiresApproval ?? false;
  const nextApprovalStatus = !nextRequiresApproval
    ? "NOT_REQUIRED"
    : getExpenseApprovalStatus({
      requiresApproval: true,
      approvalStatus: input.approvalStatus ?? existing.approvalStatus,
    }) === "APPROVED"
      ? "APPROVED"
      : "PENDING";

  const expense: ChurchExpense = {
    id,
    createdAt: existing.createdAt,
    displayOrder: existing.displayOrder,
    updatedAt: new Date().toISOString(),
    ...input,
    showFunded: input.showFunded ?? existing.showFunded ?? true,
    showProgress: input.showProgress ?? existing.showProgress ?? true,
    showStatus: input.showStatus ?? existing.showStatus ?? true,
    requiresApproval: nextRequiresApproval,
    approvalStatus: nextApprovalStatus,
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toExpenseItem(expense),
    }),
  );

  return expense;
};

const approveExpense = async (id: string) => {
  const existing = await getExpense(id);
  if (!existing) {
    throw Object.assign(new Error("Expense not found."), { statusCode: 404 });
  }

  const expense: ChurchExpense = {
    ...toExpense(existing),
    requiresApproval: existing.requiresApproval ?? false,
    approvalStatus: existing.requiresApproval ? "APPROVED" : "NOT_REQUIRED",
    updatedAt: new Date().toISOString(),
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toExpenseItem(expense),
    }),
  );

  return expense;
};

const setExpenseActiveState = async (id: string, active: boolean) => {
  const existing = await getExpense(id);
  if (!existing) {
    throw Object.assign(new Error("Expense not found."), { statusCode: 404 });
  }

  const expense: ChurchExpense = {
    ...toExpense(existing),
    updatedAt: new Date().toISOString(),
    active,
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toExpenseItem(expense),
    }),
  );

  return expense;
};

const updateNews = async (id: string, input: CreateChurchNewsInput) => {
  const existing = await getNews(id);
  if (!existing) {
    throw Object.assign(new Error("News item not found."), { statusCode: 404 });
  }

  const nextRequiresApproval = input.requiresApproval ?? existing.requiresApproval ?? false;
  const nextApprovalStatus = !nextRequiresApproval
    ? "NOT_REQUIRED"
    : getNewsApprovalStatus({
      requiresApproval: true,
      approvalStatus: input.approvalStatus ?? existing.approvalStatus,
    }) === "APPROVED"
      ? "APPROVED"
      : "PENDING";

  const news: ChurchNews = {
    id,
    createdAt: existing.createdAt,
    displayOrder: existing.displayOrder,
    updatedAt: new Date().toISOString(),
    ...input,
    requiresApproval: nextRequiresApproval,
    approvalStatus: nextApprovalStatus,
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toNewsItem(news),
    }),
  );

  return news;
};

const approveNews = async (id: string) => {
  const existing = await getNews(id);
  if (!existing) {
    throw Object.assign(new Error("News item not found."), { statusCode: 404 });
  }

  const news: ChurchNews = {
    ...toNews(existing),
    requiresApproval: existing.requiresApproval ?? false,
    approvalStatus: existing.requiresApproval ? "APPROVED" : "NOT_REQUIRED",
    updatedAt: new Date().toISOString(),
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toNewsItem(news),
    }),
  );

  return news;
};

const setNewsActiveState = async (id: string, active: boolean) => {
  const existing = await getNews(id);
  if (!existing) {
    throw Object.assign(new Error("News item not found."), { statusCode: 404 });
  }

  const news: ChurchNews = {
    ...toNews(existing),
    updatedAt: new Date().toISOString(),
    active,
  };

  await documentClient.send(
    new PutCommand({
      TableName: tableName,
      Item: toNewsItem(news),
    }),
  );

  return news;
};

const updateDidYouKnow = async (id: string, input: CreateChurchDidYouKnowInput) => {
  const existing = await getDidYouKnow(id);
  if (!existing) {
    throw Object.assign(new Error("Did You Know item not found."), { statusCode: 404 });
  }

  const item: ChurchDidYouKnow = {
    id,
    displayOrder: existing.displayOrder,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    ...input,
  };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: toDidYouKnowItem(item) }));
  return item;
};

const setDidYouKnowActiveState = async (id: string, active: boolean) => {
  const existing = await getDidYouKnow(id);
  if (!existing) {
    throw Object.assign(new Error("Did You Know item not found."), { statusCode: 404 });
  }

  const item: ChurchDidYouKnow = { ...toDidYouKnow(existing), active, updatedAt: new Date().toISOString() };
  await documentClient.send(new PutCommand({ TableName: tableName, Item: toDidYouKnowItem(item) }));
  return item;
};

const deleteExpense = async (id: string) => {
  const existing = await getExpense(id);
  if (!existing) {
    throw Object.assign(new Error("Expense not found."), { statusCode: 404 });
  }

  await documentClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: expensePk(id),
        SK: "EXPENSE",
      },
    }),
  );

  const remainingExpenses = await listExpenses(false);
  const reordered = remainingExpenses
    .filter((item) => item.id !== id)
    .map((item, index) => ({
      ...item,
      displayOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));

  if (reordered.length) {
    await reorderExpenses({
      items: reordered.map((item) => ({ id: item.id, displayOrder: item.displayOrder })),
    });
  }
};

const deleteNews = async (id: string) => {
  const existing = await getNews(id);
  if (!existing) {
    throw Object.assign(new Error("News item not found."), { statusCode: 404 });
  }

  await documentClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: newsPk(id),
        SK: "NEWS",
      },
    }),
  );

  const remainingNews = await listNews(false);
  const reordered = remainingNews
    .filter((item) => item.id !== id)
    .map((item, index) => ({
      ...item,
      displayOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));

  if (reordered.length) {
    await reorderNews({
      items: reordered.map((item) => ({ id: item.id, displayOrder: item.displayOrder })),
    });
  }
};

const deleteDidYouKnow = async (id: string) => {
  const existing = await getDidYouKnow(id);
  if (!existing) {
    throw Object.assign(new Error("Did You Know item not found."), { statusCode: 404 });
  }

  await documentClient.send(new DeleteCommand({
    TableName: tableName,
    Key: { PK: didYouKnowPk(id), SK: "DID_YOU_KNOW" },
  }));

  const remaining = await listDidYouKnow(false);
  if (remaining.length) {
    await reorderDidYouKnow({
      items: remaining.map((item, index) => ({ id: item.id, displayOrder: index + 1 })),
    });
  }
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const reorderExpenses = async (input: ReorderChurchExpensesInput) => {
  if (!Array.isArray(input.items) || !input.items.length) {
    throw Object.assign(new Error("items must contain at least one expense."), { statusCode: 400 });
  }

  const invalidItem = input.items.find(
    (item) =>
      !item ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.displayOrder !== "number" ||
      !Number.isFinite(item.displayOrder),
  );
  if (invalidItem) {
    throw Object.assign(new Error("Each order item must include a valid id and displayOrder."), { statusCode: 400 });
  }

  const result = await documentClient.send(
    new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: input.items.map((item) => ({
            PK: expensePk(item.id),
            SK: "EXPENSE",
          })),
        },
      },
    }),
  );

  const existingItems = (result.Responses?.[tableName] ?? []) as ExpenseItem[];
  if (existingItems.length !== input.items.length) {
    throw Object.assign(new Error("One or more expenses could not be found."), { statusCode: 404 });
  }

  const existingMap = new Map(existingItems.map((item) => [item.id, item]));
  const now = new Date().toISOString();

  const updateRequests = input.items.map((item) => {
    const existing = existingMap.get(item.id);
    if (!existing) {
      throw Object.assign(new Error("Expense not found."), { statusCode: 404 });
    }

    return {
      Update: {
        TableName: tableName,
        Key: {
          PK: existing.PK,
          SK: existing.SK,
        },
        UpdateExpression: "SET displayOrder = :displayOrder, updatedAt = :updatedAt, GSI1SK = :gsi1sk, GSI2SK = :gsi2sk",
        ExpressionAttributeValues: {
          ":displayOrder": item.displayOrder,
          ":updatedAt": now,
          ":gsi1sk": `${padDisplayOrder(item.displayOrder)}#${item.id}`,
          ":gsi2sk": `${padDisplayOrder(item.displayOrder)}#${item.id}`,
        },
      },
    };
  });

  for (const requestChunk of chunk(updateRequests, 25)) {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: requestChunk,
      }),
    );
  }

  return listExpenses(false);
};

const reorderNews = async (input: ReorderChurchNewsInput) => {
  if (!Array.isArray(input.items) || !input.items.length) {
    throw Object.assign(new Error("items must contain at least one news item."), { statusCode: 400 });
  }

  const invalidItem = input.items.find(
    (item) =>
      !item ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.displayOrder !== "number" ||
      !Number.isFinite(item.displayOrder),
  );
  if (invalidItem) {
    throw Object.assign(new Error("Each order item must include a valid id and displayOrder."), { statusCode: 400 });
  }

  const result = await documentClient.send(
    new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: input.items.map((item) => ({
            PK: newsPk(item.id),
            SK: "NEWS",
          })),
        },
      },
    }),
  );

  const existingItems = (result.Responses?.[tableName] ?? []) as NewsItem[];
  if (existingItems.length !== input.items.length) {
    throw Object.assign(new Error("One or more news items could not be found."), { statusCode: 404 });
  }

  const existingMap = new Map(existingItems.map((item) => [item.id, item]));
  const now = new Date().toISOString();

  const updateRequests = input.items.map((item) => {
    const existing = existingMap.get(item.id);
    if (!existing) {
      throw Object.assign(new Error("News item not found."), { statusCode: 404 });
    }

    return {
      Update: {
        TableName: tableName,
        Key: {
          PK: existing.PK,
          SK: existing.SK,
        },
        UpdateExpression: "SET displayOrder = :displayOrder, updatedAt = :updatedAt, GSI1SK = :gsi1sk, GSI2SK = :gsi2sk",
        ExpressionAttributeValues: {
          ":displayOrder": item.displayOrder,
          ":updatedAt": now,
          ":gsi1sk": `${padDisplayOrder(item.displayOrder)}#${item.id}`,
          ":gsi2sk": `${padDisplayOrder(item.displayOrder)}#${item.id}`,
        },
      },
    };
  });

  for (const requestChunk of chunk(updateRequests, 25)) {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: requestChunk,
      }),
    );
  }

  return listNews(false);
};

const reorderDidYouKnow = async (input: ReorderChurchDidYouKnowInput) => {
  if (!Array.isArray(input.items) || !input.items.length) {
    throw Object.assign(new Error("items must contain at least one Did You Know item."), { statusCode: 400 });
  }

  const invalidItem = input.items.find(
    (item) =>
      !item ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.displayOrder !== "number" ||
      !Number.isFinite(item.displayOrder),
  );
  if (invalidItem) {
    throw Object.assign(new Error("Each order item must include a valid id and displayOrder."), { statusCode: 400 });
  }

  const result = await documentClient.send(new BatchGetCommand({
    RequestItems: {
      [tableName]: {
        Keys: input.items.map((item) => ({ PK: didYouKnowPk(item.id), SK: "DID_YOU_KNOW" })),
      },
    },
  }));
  const existingItems = (result.Responses?.[tableName] ?? []) as DidYouKnowItem[];
  if (existingItems.length !== input.items.length) {
    throw Object.assign(new Error("One or more Did You Know items could not be found."), { statusCode: 404 });
  }

  const existingMap = new Map(existingItems.map((item) => [item.id, item]));
  const now = new Date().toISOString();
  const updateRequests = input.items.map((item) => {
    const existing = existingMap.get(item.id);
    if (!existing) {
      throw Object.assign(new Error("Did You Know item not found."), { statusCode: 404 });
    }
    const gsiSortKey = `${padDisplayOrder(item.displayOrder)}#${item.id}`;
    return {
      Update: {
        TableName: tableName,
        Key: { PK: existing.PK, SK: existing.SK },
        UpdateExpression: "SET displayOrder = :displayOrder, updatedAt = :updatedAt, GSI1SK = :gsi1sk, GSI2SK = :gsi2sk",
        ExpressionAttributeValues: {
          ":displayOrder": item.displayOrder,
          ":updatedAt": now,
          ":gsi1sk": gsiSortKey,
          ":gsi2sk": gsiSortKey,
        },
      },
    };
  });

  for (const requestChunk of chunk(updateRequests, 25)) {
    await documentClient.send(new TransactWriteCommand({ TransactItems: requestChunk }));
  }
  return listDidYouKnow(false);
};

export const handler: APIGatewayProxyHandlerV2 = async (rawEvent) => {
  const event = rawEvent as APIGatewayProxyEventV2WithJWTAuthorizer;

  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;
    const context = getRequestContext(event);

    if (method === "GET" && path === "/expenses") {
      const items = await listExpenses(true);
      return jsonResponse(200, {
        items,
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/news") {
      const items = await listNews(true);
      return jsonResponse(200, {
        items,
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/did-you-know") {
      const items = await listDidYouKnow(true);
      return jsonResponse(200, { items, generatedAt: new Date().toISOString() });
    }

    if (method === "GET" && path === "/liturgies") {
      const settings = await getSettings();
      const items = await listPublicLiturgies(settings);
      return jsonResponse(200, {
        items,
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/dashboard") {
      const settings = await getSettings();
      const [projects, news, didYouKnow, liturgies] = await Promise.all([
        listExpenses(true),
        listNews(true),
        listDidYouKnow(true),
        listPublicLiturgies(settings),
      ]);

      return jsonResponse(200, {
        projects,
        news,
        didYouKnow,
        liturgies,
        settings: sanitizePublicDashboardSettings(settings),
        serverTime: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/settings") {
      return jsonResponse(200, {
        settings: sanitizePublicDashboardSettings(await getSettings()),
      });
    }

    if (method === "GET" && path === "/admin/expenses") {
      requireAdmin(context);
      return jsonResponse(200, {
        items: await listExpenses(false),
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/admin/news") {
      requireAdmin(context);
      return jsonResponse(200, {
        items: await listNews(false),
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "GET" && path === "/admin/did-you-know") {
      requireAdmin(context);
      return jsonResponse(200, { items: await listDidYouKnow(false), generatedAt: new Date().toISOString() });
    }

    if (method === "GET" && path === "/admin/settings") {
      requireAdmin(context);
      return jsonResponse(200, {
        settings: await getSettings(),
      });
    }

    if (method === "POST" && path === "/expenses") {
      requireAdmin(context);
      const input = validateExpenseInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(201, await createExpense(input));
    }

    const approveExpenseMatch = path.match(/^\/expenses\/([^/]+)\/approve$/);
    if (approveExpenseMatch && method === "PUT") {
      requireAdmin(context);
      return jsonResponse(200, {
        item: await approveExpense(approveExpenseMatch[1] ?? ""),
      });
    }

    const setExpenseActiveMatch = path.match(/^\/expenses\/([^/]+)\/active$/);
    if (setExpenseActiveMatch && method === "PUT") {
      requireAdmin(context);
      const input = validateSetActiveInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(200, {
        item: await setExpenseActiveState(setExpenseActiveMatch[1] ?? "", input.active),
      });
    }

    if (method === "POST" && path === "/news") {
      requireAdmin(context);
      const input = validateNewsInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(201, await createNews(input));
    }

    if (method === "POST" && path === "/did-you-know") {
      requireAdmin(context);
      const input = validateDidYouKnowInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(201, await createDidYouKnow(input));
    }

    const approveNewsMatch = path.match(/^\/news\/([^/]+)\/approve$/);
    if (approveNewsMatch && method === "PUT") {
      requireAdmin(context);
      return jsonResponse(200, {
        item: await approveNews(approveNewsMatch[1] ?? ""),
      });
    }

    const setNewsActiveMatch = path.match(/^\/news\/([^/]+)\/active$/);
    if (setNewsActiveMatch && method === "PUT") {
      requireAdmin(context);
      const input = validateSetActiveInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(200, {
        item: await setNewsActiveState(setNewsActiveMatch[1] ?? "", input.active),
      });
    }

    const setDidYouKnowActiveMatch = path.match(/^\/did-you-know\/([^/]+)\/active$/);
    if (setDidYouKnowActiveMatch && method === "PUT") {
      requireAdmin(context);
      const input = validateSetActiveInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(200, { item: await setDidYouKnowActiveState(setDidYouKnowActiveMatch[1] ?? "", input.active) });
    }

    if (method === "PUT" && path === "/expenses/order") {
      requireAdmin(context);
      const input = parseBody<ReorderChurchExpensesInput>(event);
      return jsonResponse(200, {
        items: await reorderExpenses(input),
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "PUT" && path === "/news/order") {
      requireAdmin(context);
      const input = parseBody<ReorderChurchNewsInput>(event);
      return jsonResponse(200, {
        items: await reorderNews(input),
        generatedAt: new Date().toISOString(),
      });
    }

    if (method === "PUT" && path === "/did-you-know/order") {
      requireAdmin(context);
      const input = parseBody<ReorderChurchDidYouKnowInput>(event);
      return jsonResponse(200, { items: await reorderDidYouKnow(input), generatedAt: new Date().toISOString() });
    }

    if (method === "PUT" && path === "/admin/settings") {
      requireAdmin(context);
      const input = validateSettingsInput(parseBody<Record<string, unknown>>(event));
      return jsonResponse(200, {
        settings: await saveSettings(input),
      });
    }

    const expenseIdMatch = path.match(/^\/expenses\/([^/]+)$/);
    if (expenseIdMatch) {
      requireAdmin(context);
      const expenseId = expenseIdMatch[1] ?? "";

      if (method === "GET") {
        const expense = await getExpense(expenseId);
        if (!expense) {
          return jsonResponse(404, { message: "Expense not found." });
        }

        return jsonResponse(200, toExpense(expense));
      }

      if (method === "PUT") {
        const input = validateExpenseInput(parseBody<Record<string, unknown>>(event));
        return jsonResponse(200, await updateExpense(expenseId, input));
      }

      if (method === "DELETE") {
        await deleteExpense(expenseId);
        return jsonResponse(200, { success: true });
      }
    }

    const newsIdMatch = path.match(/^\/news\/([^/]+)$/);
    if (newsIdMatch) {
      requireAdmin(context);
      const newsId = newsIdMatch[1] ?? "";

      if (method === "GET") {
        const news = await getNews(newsId);
        if (!news) {
          return jsonResponse(404, { message: "News item not found." });
        }

        return jsonResponse(200, toNews(news));
      }

      if (method === "PUT") {
        const input = validateNewsInput(parseBody<Record<string, unknown>>(event));
        return jsonResponse(200, await updateNews(newsId, input));
      }

      if (method === "DELETE") {
        await deleteNews(newsId);
        return jsonResponse(200, { success: true });
      }
    }

    const didYouKnowIdMatch = path.match(/^\/did-you-know\/([^/]+)$/);
    if (didYouKnowIdMatch) {
      requireAdmin(context);
      const id = didYouKnowIdMatch[1] ?? "";
      if (method === "GET") {
        const item = await getDidYouKnow(id);
        return item ? jsonResponse(200, toDidYouKnow(item)) : jsonResponse(404, { message: "Did You Know item not found." });
      }
      if (method === "PUT") {
        const input = validateDidYouKnowInput(parseBody<Record<string, unknown>>(event));
        return jsonResponse(200, await updateDidYouKnow(id, input));
      }
      if (method === "DELETE") {
        await deleteDidYouKnow(id);
        return jsonResponse(200, { success: true });
      }
    }

    return jsonResponse(404, { message: "Route not found." });
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return jsonResponse(statusCode, { message });
  }
};
