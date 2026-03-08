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
  const [actualTakeHome, setActualTakeHome] = useState("");
  const [rules, setRules] = useState<TipoutRule[]>(DEFAULT_RULES);

  const parsedTotalSales = positiveAmount(totalSales);
  const parsedAlcoholSales = positiveAmount(alcoholSales);
  const parsedFoodSales = positiveAmount(foodSales);
  const parsedGrossTips = positiveAmount(grossTips);
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
  const expectedTakeHome = parsedGrossTips - totalTipout;
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
    alert("Receipt OCR is not connected yet. Manual entry below is active now.");
    event.target.value = "";
  }

  const cardStyle = {
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: 12,
    display: "grid",
    gap: 8,
  } as const;

  const inputStyle = {
    width: "100%",
    padding: "10px 11px",
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "#0f1726",
    color: "var(--text)",
  } as const;

  return (
    <main style={{ display: "grid", gap: 10, maxWidth: 760, margin: "0 auto" }}>
      <section style={{ ...cardStyle, border: "1px solid rgba(255, 216, 77, 0.7)", background: "linear-gradient(180deg, rgba(255,216,77,0.1) 0%, rgba(255,216,77,0.02) 100%)" }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Cashout Scanner</h1>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Quick cashout math with custom tipout rules.</div>
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>Receipt Upload</strong>
        <input type="file" accept="image/*" capture="environment" onChange={onImageChange} style={inputStyle} />
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>Sales + Tips</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <input type="number" min="0" step="0.01" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="Total Sales" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={alcoholSales} onChange={(e) => setAlcoholSales(e.target.value)} placeholder="Bar Sales" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={foodSales} onChange={(e) => setFoodSales(e.target.value)} placeholder="Food Sales" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={grossTips} onChange={(e) => setGrossTips(e.target.value)} placeholder="Gross Tips" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={actualTakeHome} onChange={(e) => setActualTakeHome(e.target.value)} placeholder="Actual Take-Home" style={inputStyle} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Tipout Rules</strong>
          <button type="button" onClick={addRule} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 9px", background: "var(--surface-2)", color: "var(--text)" }}>
            Add Rule
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {calculatedRules.map((rule) => (
            <article key={rule.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 9, background: "var(--surface-2)", display: "grid", gap: 7 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr auto", gap: 7, alignItems: "center" }}>
                <input value={rule.label} onChange={(e) => updateRule(rule.id, { label: e.target.value })} placeholder="Role" style={inputStyle} />
                <input type="number" min="0" step="0.01" value={rule.percentage} onChange={(e) => updateRule(rule.id, { percentage: e.target.value })} placeholder="%" style={inputStyle} />
                <select value={rule.base} onChange={(e) => updateRule(rule.id, { base: e.target.value as TipoutBase })} style={inputStyle}>
                  {BASE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => removeRule(rule.id)} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "transparent", color: "var(--text)", padding: "9px" }}>
                  Remove
                </button>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {rule.pct.toFixed(2)}% of {money(rule.baseAmount)} = <strong style={{ color: "var(--text)" }}>{money(rule.tipoutAmount)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, border: "1px solid rgba(255, 216, 77, 0.75)", background: "linear-gradient(180deg, rgba(255,216,77,0.08) 0%, rgba(255,216,77,0.02) 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Expected Take-Home</span>
          <span style={{ fontWeight: 800 }}>{money(expectedTakeHome)}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", padding: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Gross Tips</div>
            <div style={{ fontWeight: 700 }}>{money(parsedGrossTips)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", padding: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Tipout</div>
            <div style={{ fontWeight: 700 }}>- {money(totalTipout)}</div>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", padding: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Variance</div>
            <div style={{ fontWeight: 700, color: variance < 0 ? "#ff9ea8" : "var(--text)" }}>{money(variance)}</div>
          </article>
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Formula: <code style={{ color: "var(--text)" }}>Gross Tips - Tipout</code>
        </div>
      </section>
    </main>
  );
}
