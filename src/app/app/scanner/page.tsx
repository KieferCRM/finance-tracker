"use client";

import { ChangeEvent, useMemo, useState } from "react";

type TipoutBase = "total_sales" | "alcohol_sales" | "food_sales";

type TipoutRule = {
  id: string;
  label: string;
  percentage: string;
  base: TipoutBase;
};

const DEFAULT_RULES: TipoutRule[] = [
  { id: "bar", label: "Bar", percentage: "5", base: "alcohol_sales" },
  { id: "backservers", label: "Backservers", percentage: "3", base: "food_sales" },
];

const BASE_OPTIONS: Array<{ value: TipoutBase; label: string }> = [
  { value: "total_sales", label: "Total Sales" },
  { value: "alcohol_sales", label: "Bar Sales" },
  { value: "food_sales", label: "Food Sales" },
];

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function toNumber(value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric;
}

function positiveAmount(value: string): number {
  return Math.max(0, toNumber(value));
}

function amountForBase(base: TipoutBase, totalSales: number, alcoholSales: number, foodSales: number): number {
  if (base === "alcohol_sales") return alcoholSales;
  if (base === "food_sales") return foodSales;
  return totalSales;
}

export default function ScannerPage() {
  const [totalSales, setTotalSales] = useState("");
  const [alcoholSales, setAlcoholSales] = useState("");
  const [foodSales, setFoodSales] = useState("");
  const [grossTips, setGrossTips] = useState("");
  const [parking, setParking] = useState("");
  const [actualTakeHome, setActualTakeHome] = useState("");
  const [rules, setRules] = useState<TipoutRule[]>(DEFAULT_RULES);

  const parsedTotalSales = positiveAmount(totalSales);
  const parsedAlcoholSales = positiveAmount(alcoholSales);
  const parsedFoodSales = positiveAmount(foodSales);
  const parsedGrossTips = positiveAmount(grossTips);
  const parsedParking = positiveAmount(parking);
  const parsedActualTakeHome = positiveAmount(actualTakeHome);

  const calculatedRules = useMemo(() => {
    return rules.map((rule) => {
      const baseAmount = amountForBase(rule.base, parsedTotalSales, parsedAlcoholSales, parsedFoodSales);
      const pct = Math.max(0, toNumber(rule.percentage));
      const tipoutAmount = (baseAmount * pct) / 100;
      return {
        ...rule,
        baseAmount,
        pct,
        tipoutAmount,
      };
    });
  }, [rules, parsedTotalSales, parsedAlcoholSales, parsedFoodSales]);

  const totalTipout = calculatedRules.reduce((sum, rule) => sum + rule.tipoutAmount, 0);
  const expectedTakeHome = parsedGrossTips - parsedParking - totalTipout;
  const variance = parsedActualTakeHome - expectedTakeHome;

  function updateRule(id: string, patch: Partial<TipoutRule>) {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function addRule() {
    const id = `rule_${Date.now()}`;
    setRules((prev) => [...prev, { id, label: "", percentage: "", base: "total_sales" }]);
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((rule) => rule.id !== id));
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0) return;
    // Placeholder hook for future OCR integration.
    alert("Receipt OCR is not connected yet. Manual entry below is active now.");
    event.target.value = "";
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Cashout Scanner</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Configure tipout rules per restaurant and calculate expected take-home. You can use multiple percentages with different sales bases.
        </p>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <strong>Receipt Photo (OCR Prep)</strong>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onImageChange}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
        />
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Image upload is ready; OCR extraction can be connected in the next step.</div>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <strong>Sales + Tips</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <input type="number" min="0" step="0.01" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="Total Sales" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <input type="number" min="0" step="0.01" value={alcoholSales} onChange={(e) => setAlcoholSales(e.target.value)} placeholder="Bar Sales" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <input type="number" min="0" step="0.01" value={foodSales} onChange={(e) => setFoodSales(e.target.value)} placeholder="Food Sales" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <input type="number" min="0" step="0.01" value={grossTips} onChange={(e) => setGrossTips(e.target.value)} placeholder="Gross Tips" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <input type="number" min="0" step="0.01" value={parking} onChange={(e) => setParking(e.target.value)} placeholder="- Parking" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <input type="number" min="0" step="0.01" value={actualTakeHome} onChange={(e) => setActualTakeHome(e.target.value)} placeholder="Actual Take-Home" style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
        </div>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong>Tipout Rules</strong>
          <button type="button" onClick={addRule} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "8px 10px" }}>
            Add Rule
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {calculatedRules.map((rule) => (
            <article key={rule.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input
                  value={rule.label}
                  onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                  placeholder="Who gets this tipout?"
                  style={{ padding: 9, borderRadius: 8, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rule.percentage}
                  onChange={(e) => updateRule(rule.id, { percentage: e.target.value })}
                  placeholder="%"
                  style={{ padding: 9, borderRadius: 8, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                />
                <select
                  value={rule.base}
                  onChange={(e) => updateRule(rule.id, { base: e.target.value as TipoutBase })}
                  style={{ padding: 9, borderRadius: 8, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                >
                  {BASE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  style={{ border: "1px solid var(--line)", borderRadius: 8, background: "transparent", color: "var(--text)", padding: "9px 10px" }}
                >
                  Remove
                </button>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {rule.pct.toFixed(2)}% of {money(rule.baseAmount)} = <strong style={{ color: "var(--text)" }}>{money(rule.tipoutAmount)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid rgba(255, 216, 77, 0.75)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 8 }}>
        <strong>Cashout Summary</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Gross Tips</div>
            <div style={{ fontWeight: 700 }}>{money(parsedGrossTips)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Tipout Total</div>
            <div style={{ fontWeight: 700 }}>{money(totalTipout)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Parking Deduction</div>
            <div style={{ fontWeight: 700 }}>-{money(parsedParking)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Expected Take-Home</div>
            <div style={{ fontWeight: 700 }}>{money(expectedTakeHome)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 10, background: "var(--surface-2)" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Actual vs Expected</div>
            <div style={{ fontWeight: 700, color: variance < 0 ? "#ff9ea8" : "var(--text)" }}>{money(variance)}</div>
          </article>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Parking always subtracts from total. Tipout is calculated from the selected sales base and subtracts from expected take-home here.
        </div>
      </section>
    </main>
  );
}
