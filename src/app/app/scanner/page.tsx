"use client";

import { ChangeEvent, useMemo, useState } from "react";

type TipoutBase = "total_sales" | "alcohol_sales" | "food_sales";

type ScannerParseResponse = {
  total_sales: number | null;
  bar_sales: number | null;
  food_sales: number | null;
  gross_tips: number | null;
  actual_take_home: number | null;
};

type ParsedRule = {
  label: string;
  percentage: number;
  base: TipoutBase;
};

const BASE_LABELS: Record<TipoutBase, string> = {
  total_sales: "Total Sales",
  alcohol_sales: "Bar Sales",
  food_sales: "Food + N/A Beverage Sales",
};

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

function toInputValue(value: number | null): string {
  return typeof value === "number" ? value.toFixed(2) : "";
}

function detectRuleBase(text: string): TipoutBase {
  const value = text.toLowerCase();

  if (value.includes("food") || value.includes("n/a beverage") || value.includes("na beverage") || value.includes("non alcoholic")) {
    return "food_sales";
  }
  if (value.includes("bar") || value.includes("alcohol") || value.includes("wine") || value.includes("beer") || value.includes("liquor") || value.includes("reserve")) {
    return "alcohol_sales";
  }
  return "total_sales";
}

function detectRuleLabel(text: string, base: TipoutBase): string {
  const lower = text.toLowerCase();
  const explicitTo = lower.match(/\bto\s+([a-z][a-z\s/&-]{1,32})/i);

  if (explicitTo) {
    const cleaned = explicitTo[1].replace(/\b(on|of|for|from|at)\b.*$/i, "").trim();
    if (cleaned) {
      return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  if (lower.includes("backserver") || lower.includes("server assistant")) return "Backservers";
  if (lower.includes("runner")) return "Runners";
  if (lower.includes("host")) return "Hosts";
  if (base === "food_sales") return "Backservers";
  if (base === "alcohol_sales") return "Bar";
  return "Tipout";
}

function parseTipoutRulesFromText(raw: string): ParsedRule[] {
  const text = raw.trim();
  if (!text) return [];

  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*%([^%]*)/gi));
  if (matches.length === 0) return [];

  const parsed: ParsedRule[] = [];

  for (const match of matches) {
    const percentage = Number(match[1]);
    if (!Number.isFinite(percentage) || percentage < 0) continue;

    const context = (match[2] ?? "").trim();
    const base = detectRuleBase(context);
    const label = detectRuleLabel(context, base);

    parsed.push({ label, percentage, base });
  }

  const deduped = new Map<string, ParsedRule>();
  for (const rule of parsed) {
    const key = `${rule.label.toLowerCase()}|${rule.base}|${rule.percentage}`;
    if (!deduped.has(key)) deduped.set(key, rule);
  }

  return Array.from(deduped.values()).slice(0, 8);
}

export default function ScannerPage() {
  const [totalSales, setTotalSales] = useState("");
  const [alcoholSales, setAlcoholSales] = useState("");
  const [foodSales, setFoodSales] = useState("");
  const [grossTips, setGrossTips] = useState("");
  const [actualTakeHome, setActualTakeHome] = useState("");
  const [tipoutRuleText, setTipoutRuleText] = useState("5% to bar on wine/beer/liquor/reserve wine, 3% to backservers on food and n/a beverage");
  const [parsing, setParsing] = useState(false);
  const [parseNotice, setParseNotice] = useState("");

  const parsedTotalSales = positiveAmount(totalSales);
  const parsedAlcoholSales = positiveAmount(alcoholSales);
  const parsedFoodSales = positiveAmount(foodSales);
  const parsedGrossTips = positiveAmount(grossTips);
  const parsedActualTakeHome = positiveAmount(actualTakeHome);

  const parsedRules = useMemo(() => parseTipoutRulesFromText(tipoutRuleText), [tipoutRuleText]);

  const calculatedRules = useMemo(() => {
    return parsedRules.map((rule) => {
      const baseAmount = amountForBase(rule.base, parsedTotalSales, parsedAlcoholSales, parsedFoodSales);
      const tipoutAmount = (baseAmount * rule.percentage) / 100;

      return {
        ...rule,
        baseAmount,
        tipoutAmount,
      };
    });
  }, [parsedRules, parsedTotalSales, parsedAlcoholSales, parsedFoodSales]);

  const totalTipout = calculatedRules.reduce((sum, rule) => sum + rule.tipoutAmount, 0);
  const expectedTakeHome = parsedGrossTips - totalTipout;
  const variance = parsedActualTakeHome - expectedTakeHome;

  async function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParsing(true);
    setParseNotice("");

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/scanner/parse", {
        method: "POST",
        body: formData,
      });

      const json = (await res.json().catch(() => ({}))) as Partial<ScannerParseResponse> & { error?: string };
      if (!res.ok) {
        setParseNotice(json.error ?? "Could not parse this image. You can still enter values manually.");
        return;
      }

      setTotalSales(toInputValue(json.total_sales ?? null));
      setAlcoholSales(toInputValue(json.bar_sales ?? null));
      setFoodSales(toInputValue(json.food_sales ?? null));
      setGrossTips(toInputValue(json.gross_tips ?? null));
      setActualTakeHome(toInputValue(json.actual_take_home ?? null));
      setParseNotice("Receipt parsed. Confirm values, then tipout math updates automatically.");
    } catch {
      setParseNotice("Could not parse this image right now. You can still enter values manually.");
    } finally {
      setParsing(false);
    }
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
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Tell TipTapped how tipout works once, then it runs the math for you.</div>
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>Receipt Upload (Optional)</strong>
        <input type="file" accept="image/*" capture="environment" onChange={onImageChange} style={inputStyle} />
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {parsing ? "Parsing receipt..." : parseNotice || "Upload your checkout photo to auto-fill sales + tips."}
        </div>
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>How Tipout Works</strong>
        <textarea
          value={tipoutRuleText}
          onChange={(e) => setTipoutRuleText(e.target.value)}
          rows={3}
          placeholder="Example: 5% to bar on wine/beer/liquor/reserve wine, 3% to backservers on food and n/a beverage"
          style={{ ...inputStyle, resize: "vertical", minHeight: 82 }}
        />
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          Include percentages and what sales each role tips out on. Parser supports food + n/a beverage and bar categories.
        </div>
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>Sales + Tips</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          <input type="number" min="0" step="0.01" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="Total Sales" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={alcoholSales} onChange={(e) => setAlcoholSales(e.target.value)} placeholder="Bar Sales" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={foodSales} onChange={(e) => setFoodSales(e.target.value)} placeholder="Food + N/A Beverage" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={grossTips} onChange={(e) => setGrossTips(e.target.value)} placeholder="Gross Tips" style={inputStyle} />
          <input type="number" min="0" step="0.01" value={actualTakeHome} onChange={(e) => setActualTakeHome(e.target.value)} placeholder="Actual Take-Home" style={inputStyle} />
        </div>
      </section>

      <section style={cardStyle}>
        <strong style={{ fontSize: 14 }}>Parsed Tipout Rules</strong>
        {calculatedRules.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>No valid tipout rules found yet. Add percentages in the tipout description.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {calculatedRules.map((rule, index) => (
              <article key={`${rule.label}-${rule.base}-${rule.percentage}-${index}`} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 9, background: "var(--surface-2)", display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{rule.label}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {rule.percentage.toFixed(2)}% of {BASE_LABELS[rule.base]}
                  </span>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {money(rule.baseAmount)} x {rule.percentage.toFixed(2)}% = <strong style={{ color: "var(--text)" }}>{money(rule.tipoutAmount)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
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
