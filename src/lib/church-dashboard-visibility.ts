type DateBoundary = "start" | "end";

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const buildLocalBoundaryDate = (year: number, month: number, day: number, boundary: DateBoundary) =>
  boundary === "end"
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

export const toDateInputValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return value.slice(0, 10);
};

export const toDateTimeInputValue = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const normalizeOptionalValue = (value?: string) => value?.trim() || undefined;

export const normalizeDateValue = (value?: string, boundary: DateBoundary = "start") => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const dateOnlyMatch = trimmed.match(dateOnlyPattern);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return buildLocalBoundaryDate(Number(year), Number(month), Number(day), boundary).toISOString();
  }

  return new Date(trimmed).toISOString();
};

export const getVisibilityRangeError = (visibleFrom?: string, visibleUntil?: string) => {
  const normalizedFrom = normalizeDateValue(visibleFrom);
  const normalizedUntil = normalizeDateValue(visibleUntil, "end");

  if (!normalizedFrom || !normalizedUntil) {
    return "";
  }

  return new Date(normalizedUntil).getTime() < new Date(normalizedFrom).getTime()
    ? "Visible until must be on or after visible from."
    : "";
};
