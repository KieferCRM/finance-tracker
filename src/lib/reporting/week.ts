export type WeekRange = {
  date: string;
  startDate: string;
  endDate: string;
};

function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function weekRangeFromParam(dateParam: string | null): WeekRange {
  const fallback = new Date();
  const parsed = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T00:00:00.000Z`) : fallback;

  const anchor = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const day = anchor.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() + mondayOffset);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    date: formatDate(anchor),
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}
