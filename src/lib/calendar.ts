export const DAY_OFF_NOTE = "__TIPTAB_DAY_OFF__";

export type DayOffLikeEntry = {
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
};

export function isDayOffEntry(row: DayOffLikeEntry): boolean {
  return (
    Number(row.cash_tips) <= 0 &&
    Number(row.card_tips) <= 0 &&
    Number(row.hours_worked) <= 0 &&
    (row.note ?? "").trim() === DAY_OFF_NOTE
  );
}
