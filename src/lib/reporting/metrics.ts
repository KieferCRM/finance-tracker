import { isDayOffEntry } from "@/lib/calendar";

export type IncomeEntry = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
  created_at: string;
};

export type ExpenseEntry = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
};

export type MonthlyReport = {
  totalIncome: number;
  totalHours: number;
  totalExpenses: number;
  savingsAmount: number;
  savingsRate: number;
  shiftCount: number;
  avgShiftIncome: number;
  topCategories: Array<{ category: string; amount: number; pctOfIncome: number }>;
  insights: string[];
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function categoryKey(value: string | null | undefined): string {
  return (value || "other").trim().toLowerCase();
}

export function shiftIncomeValue(row: IncomeEntry): number {
  return Number(row.cash_tips) + Number(row.card_tips);
}

export function buildMonthlyReport(incomes: IncomeEntry[], expenses: ExpenseEntry[]): MonthlyReport {
  const includedIncomes = incomes.filter((row) => !isDayOffEntry(row));
  const totalIncome = includedIncomes.reduce((sum, row) => sum + shiftIncomeValue(row), 0);
  const totalHours = includedIncomes.reduce((sum, row) => sum + Number(row.hours_worked), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + Number(row.amount), 0);
  const savingsAmount = expenses
    .filter((row) => categoryKey(row.category) === "savings")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const savingsRate = totalExpenses > 0 ? (savingsAmount / totalExpenses) * 100 : 0;

  const byCategory = new Map<string, number>();
  for (const row of expenses) {
    const key = categoryKey(row.category);
    byCategory.set(key, (byCategory.get(key) ?? 0) + Number(row.amount));
  }

  const topCategories = Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount: roundCurrency(amount),
      pctOfIncome: totalIncome > 0 ? roundCurrency((amount / totalIncome) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const discretionaryKeys = new Set(["going out", "entertainment", "shopping", "misc", "other"]);
  const discretionaryTotal = expenses
    .filter((row) => discretionaryKeys.has(categoryKey(row.category)))
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const foodAndRides = expenses
    .filter((row) => {
      const k = categoryKey(row.category);
      return k === "food" || k === "rides" || k === "transport";
    })
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const insights: string[] = [];
  if (savingsAmount <= 0) {
    insights.push("No savings logged this month. Add an entry with category 'savings' when you move money.");
  }
  if (totalIncome > 0 && discretionaryTotal / totalIncome > 0.25) {
    insights.push("Leak alert: discretionary spend is above 25% of your income this month.");
  }
  if (totalIncome > 0 && foodAndRides / totalIncome > 0.2) {
    insights.push("Food + rides is over 20% of income. Add a hard per-shift cap to stop bleed.");
  }
  if (insights.length === 0) {
    insights.push("Solid month so far. Keep logging daily to protect your savings rate.");
  }

  return {
    totalIncome: roundCurrency(totalIncome),
    totalHours: roundCurrency(totalHours),
    totalExpenses: roundCurrency(totalExpenses),
    savingsAmount: roundCurrency(savingsAmount),
    savingsRate: roundCurrency(savingsRate),
    shiftCount: includedIncomes.length,
    avgShiftIncome: includedIncomes.length > 0 ? roundCurrency(totalIncome / includedIncomes.length) : 0,
    topCategories,
    insights,
  };
}
