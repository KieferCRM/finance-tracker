export type MonthRange = {
  month: string;
  startDate: string;
  endDate: string;
  nextStartDate: string;
};

function toMonthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRangeFromParam(monthParam: string | null): MonthRange {
  const now = new Date();
  const fallbackMonth = toMonthString(now);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : fallbackMonth;

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const nextStart = new Date(Date.UTC(year, monthIndex + 1, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    month,
    startDate: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-01`,
    endDate: `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`,
    nextStartDate: `${nextStart.getUTCFullYear()}-${String(nextStart.getUTCMonth() + 1).padStart(2, "0")}-01`,
  };
}
