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

  const panelStyle = {
    border: "1px solid var(--line)",
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,216,77,0.03) 100%)",
    padding: 14,
    display: "grid",
    gap: 10,
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "#0f1726",
    color: "var(--text)",
  };

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section
        style={{
          border: "1px solid rgba(255, 216, 77, 0.72)",
          borderRadius: 16,
          padding: 16,
          background: "linear-gradient(135deg, rgba(255,216,77,0.14) 0%, rgba(255,216,77,0.02) 56%, rgba(11,18,30,0.2) 100%)",
          boxShadow: "0 10px 28px rgba(255, 216, 77, 0.15)",
          display: "grid",
          gap: 8,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 0.4 }}>Cashout Scanner</h1>
        <p style={{ margin: 0, color: "var(--muted)", maxWidth: 760 }}>
          Clean cashout math with custom tipout rules. Add your sales and tips, then compare expected take-home against actual cashout.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <article style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <strong style={{ fontSize: 16 }}>Receipt Upload</strong>
              <span style={{ fontSize: 12, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 999, padding: "4px 8px" }}>OCR Prep</span>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={onImageChange} style={inputStyle} />
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Image upload is ready. OCR parsing can plug into this flow next.</div>
          </article>

          <article style={panelStyle}>
            <strong style={{ fontSize: 16 }}>Sales + Inputs</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
              <input type="number" min="0" step="0.01" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="Total Sales" style={inputStyle} />
              <input type="number" min="0" step="0.01" value={alcoholSales} onChange={(e) => setAlcoholSales(e.target.value)} placeholder="Bar Sales" style={inputStyle} />
              <input type="number" min="0" step="0.01" value={foodSales} onChange={(e) => setFoodSales(e.target.value)} placeholder="Food Sales" style={inputStyle} />
              <input type="number" min="0" step="0.01" value={grossTips} onChange={(e) => setGrossTips(e.target.value)} placeholder="Gross Tips" style={inputStyle} />
              <input type="number" min="0" step="0.01" value={parking} onChange={(e) => setParking(e.target.value)} placeholder="- Parking" style={inputStyle} />
              <input type="number" min="0" step="0.01" value={actualTakeHome} onChange={(e) => setActualTakeHome(e.target.value)} placeholder="Actual Take-Home" style={inputStyle} />
            </div>
          </article>

          <article style={panelStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 16 }}>Tipout Rules</strong>
              <button
                type="button"
                onClick={addRule}
                style={{ border: "1px solid rgba(255,216,77,0.65)", borderRadius: 8, background: "rgba(255,216,77,0.12)", color: "var(--text)", padding: "8px 10px", fontWeight: 700 }}
              >
                Add Rule
              </button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {calculatedRules.map((rule) => (
                <article
                  key={rule.id}
                  style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "rgba(17, 24, 39, 0.5)", display: "grid", gap: 8 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(130px, 2fr) minmax(86px, 1fr) minmax(120px, 1fr) auto", gap: 8, alignItems: "center" }}>
                    <input value={rule.label} onChange={(e) => updateRule(rule.id, { label: e.target.value })} placeholder="Role" style={inputStyle} />
                    <input type="number" min="0" step="0.01" value={rule.percentage} onChange={(e) => updateRule(rule.id, { percentage: e.target.value })} placeholder="%" style={inputStyle} />
                    <select value={rule.base} onChange={(e) => updateRule(rule.id, { base: e.target.value as TipoutBase })} style={inputStyle}>
                      {BASE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.id)}
                      style={{ border: "1px solid var(--line)", borderRadius: 8, background: "transparent", color: "var(--text)", padding: "10px 10px" }}
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
          </article>
        </div>

        <aside
          style={{
            border: "1px solid rgba(255, 216, 77, 0.78)",
            borderRadius: 14,
            background: "linear-gradient(180deg, rgba(255,216,77,0.09) 0%, rgba(17,24,39,0.4) 100%)",
            padding: 14,
            display: "grid",
            gap: 10,
            boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.7 }}>Expected Take-Home</span>
            <strong style={{ fontSize: 34, lineHeight: 1 }}>{money(expectedTakeHome)}</strong>
            <div
              style={{
                display: "inline-flex",
                width: "fit-content",
                borderRadius: 999,
                border: variance < 0 ? "1px solid rgba(255,106,124,0.45)" : "1px solid rgba(124,255,175,0.35)",
                background: variance < 0 ? "rgba(255,106,124,0.12)" : "rgba(124,255,175,0.12)",
                color: variance < 0 ? "#ffb4bf" : "#b7ffd5",
                padding: "4px 10px",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Variance: {money(variance)}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--muted)" }}>Gross Tips</span>
              <strong>{money(parsedGrossTips)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--muted)" }}>Tipout Total</span>
              <strong>- {money(totalTipout)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--muted)" }}>Parking</span>
              <strong>- {money(parsedParking)}</strong>
            </div>
            <div style={{ borderTop: "1px dashed rgba(255,255,255,0.12)", paddingTop: 8, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "var(--muted)" }}>Actual Take-Home</span>
              <strong>{money(parsedActualTakeHome)}</strong>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, color: "var(--muted)", fontSize: 12, lineHeight: 1.5 }}>
            Formula: <code style={{ color: "var(--text)" }}>Gross Tips - Tipout - Parking</code>
          </div>
        </aside>
      </section>
    </main>
  );
}
