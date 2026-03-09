import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

export const runtime = "nodejs";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type ParsedReceipt = {
  total_sales: unknown;
  gross_tips: unknown;
  actual_take_home: unknown;
  food: unknown;
  na_beverage: unknown;
  beer: unknown;
  wine: unknown;
  liquor: unknown;
  reserve_wine: unknown;
  bar_sales: unknown;
  food_sales: unknown;
};

const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024;

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(2));
  }

  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const isParenNegative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw
    .replace(/[,$]/g, "")
    .replace(/^\((.*)\)$/, "$1")
    .replace(/\(\+\)|\(-\)|\+|\s/g, "");

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  const signed = isParenNegative ? -Math.abs(num) : num;
  return Number(signed.toFixed(2));
}

function fromUnknown(value: unknown, fallback = 0): number {
  const parsed = parseAmount(value);
  return parsed === null ? fallback : parsed;
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const direct = safeJsonParse<Record<string, unknown>>(trimmed);
  if (direct) return trimmed;

  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFence?.[1]) {
    const fenced = codeFence[1].trim();
    if (safeJsonParse<Record<string, unknown>>(fenced)) return fenced;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    if (safeJsonParse<Record<string, unknown>>(slice)) return slice;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthedSupabase();
  if (!user) return response!;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Scanner is not configured yet. Add OPENAI_API_KEY to server environment variables." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const receipt = formData.get("receipt");

  if (!(receipt instanceof File)) {
    return NextResponse.json({ error: "No receipt image received." }, { status: 400 });
  }
  if (!receipt.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
  }
  if (receipt.size > MAX_RECEIPT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Please upload a file smaller than 8MB." },
      { status: 413 },
    );
  }

  const imageBuffer = Buffer.from(await receipt.arrayBuffer());
  const imageBase64 = imageBuffer.toString("base64");
  const mimeType = receipt.type || "image/jpeg";
  const model = process.env.OPENAI_SCANNER_MODEL || "gpt-4o-mini";

  const prompt = [
    "You are parsing a restaurant server checkout receipt image.",
    "Extract ONLY these fields as JSON with numeric values or null when missing:",
    "{",
    '  "total_sales": number|null,',
    '  "gross_tips": number|null,',
    '  "actual_take_home": number|null,',
    '  "food": number|null,',
    '  "na_beverage": number|null,',
    '  "beer": number|null,',
    '  "wine": number|null,',
    '  "liquor": number|null,',
    '  "reserve_wine": number|null',
    "}",
    "Use values from the SALES section where available.",
    "For gross_tips, prefer the TOTAL TIPS value.",
    "For actual_take_home, prefer TOTAL CASH OWED or final cash owed/take-home line.",
    "Numbers should be plain (no commas, no currency symbols).",
    "Return JSON only.",
  ].join("\n");

  let rawResponse: OpenAIChatResponse;
  let openAIResponse: Response;
  try {
    openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return strict JSON only." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });
    rawResponse = (await openAIResponse.json().catch(() => ({}))) as OpenAIChatResponse;
  } catch {
    return NextResponse.json({ error: "Could not reach scanner service right now." }, { status: 502 });
  }

  if (!openAIResponse.ok) {
    const message = rawResponse.error?.message || "Receipt parsing failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const content = rawResponse.choices?.[0]?.message?.content ?? "";
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return NextResponse.json({ error: "Could not read structured data from this receipt." }, { status: 422 });
  }

  const parsed = safeJsonParse<Partial<ParsedReceipt>>(jsonText);
  if (!parsed) {
    return NextResponse.json({ error: "Could not parse receipt values." }, { status: 422 });
  }

  const food = parseAmount(parsed.food);
  const naBeverage = parseAmount(parsed.na_beverage);
  const beer = parseAmount(parsed.beer);
  const wine = parseAmount(parsed.wine);
  const liquor = parseAmount(parsed.liquor);
  const reserveWine = parseAmount(parsed.reserve_wine);

  const derivedFoodSales = Number((fromUnknown(food) + fromUnknown(naBeverage)).toFixed(2));
  const derivedBarSales = Number((fromUnknown(beer) + fromUnknown(wine) + fromUnknown(liquor) + fromUnknown(reserveWine)).toFixed(2));

  const modelFoodSales = parseAmount(parsed.food_sales);
  const modelBarSales = parseAmount(parsed.bar_sales);

  const totalSales = parseAmount(parsed.total_sales);
  const grossTips = parseAmount(parsed.gross_tips);
  const actualTakeHome = parseAmount(parsed.actual_take_home);

  return NextResponse.json({
    total_sales: totalSales ?? (derivedBarSales > 0 || derivedFoodSales > 0 ? Number((derivedBarSales + derivedFoodSales).toFixed(2)) : null),
    bar_sales: modelBarSales ?? (derivedBarSales > 0 ? derivedBarSales : null),
    food_sales: modelFoodSales ?? (derivedFoodSales > 0 ? derivedFoodSales : null),
    gross_tips: grossTips,
    actual_take_home: actualTakeHome,
  });
}
