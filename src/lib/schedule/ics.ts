export type ParsedScheduleEvent = {
  external_id: string;
  title: string;
  location: string | null;
  notes: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

type DateToken = {
  date: string;
  time: string;
  hasTime: boolean;
};

type RRule = {
  freq: string;
  interval: number;
  count?: number;
  until?: string;
  byDay?: string[];
};

const WEEKDAY_TOKEN_TO_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function unfoldLines(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  for (const raw of rawLines) {
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1);
      continue;
    }
    lines.push(raw);
  }

  return lines;
}

function decodeIcsText(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parsePropertyLine(line: string): IcsProperty | null {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex <= 0) return null;

  const key = line.slice(0, separatorIndex);
  const value = decodeIcsText(line.slice(separatorIndex + 1));
  const [nameRaw, ...paramParts] = key.split(";");
  const name = nameRaw.trim().toUpperCase();
  if (!name) return null;

  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const paramName = part.slice(0, eqIdx).trim().toUpperCase();
    const paramValue = part.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (paramName) params[paramName] = paramValue;
  }

  return { name, params, value };
}

function toIsoDate(year: string, month: string, day: string): string {
  return `${year}-${month}-${day}`;
}

function parseDateToken(value: string): DateToken | null {
  const raw = value.trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?Z?)?$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = toIsoDate(year, month, day);
  if (!hour || !minute) {
    return { date, time: "", hasTime: false };
  }
  return { date, time: `${hour}:${minute}`, hasTime: true };
}

function parseDateProperty(prop: IcsProperty | undefined): DateToken | null {
  if (!prop) return null;

  const valueType = prop.params.VALUE?.toUpperCase();
  const token = parseDateToken(prop.value);
  if (!token) return null;

  if (valueType === "DATE") {
    return { date: token.date, time: "", hasTime: false };
  }

  return token;
}

function parseRRule(value: string): RRule | null {
  const raw = value.trim();
  if (!raw) return null;

  const parts = raw.split(";");
  const fields: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim().toUpperCase();
    const val = part.slice(eqIdx + 1).trim();
    if (key) fields[key] = val;
  }

  const freq = fields.FREQ?.toUpperCase();
  if (!freq) return null;

  const intervalNum = Number(fields.INTERVAL ?? "1");
  const interval = Number.isFinite(intervalNum) && intervalNum > 0 ? Math.floor(intervalNum) : 1;

  const countNum = Number(fields.COUNT ?? "");
  const count = Number.isFinite(countNum) && countNum > 0 ? Math.floor(countNum) : undefined;

  const untilToken = fields.UNTIL ? parseDateToken(fields.UNTIL) : null;
  const byDay =
    fields.BYDAY?.split(",")
      .map((token) => token.trim().toUpperCase())
      .filter((token) => token in WEEKDAY_TOKEN_TO_INDEX) ?? undefined;

  return {
    freq,
    interval,
    count,
    until: untilToken?.date,
    byDay: byDay && byDay.length > 0 ? byDay : undefined,
  };
}

function dateToUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekdayToken(date: Date): string {
  const day = date.getUTCDay();
  return day === 0 ? "SU" : day === 1 ? "MO" : day === 2 ? "TU" : day === 3 ? "WE" : day === 4 ? "TH" : day === 5 ? "FR" : "SA";
}

function startOfIsoWeek(date: Date): Date {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  return addUtcDays(date, -mondayOffset);
}

function occurrenceKey(date: string, time: string): string {
  return `${date}|${time || ""}`;
}

function parseExdates(properties: IcsProperty[]): Set<string> {
  const keys = new Set<string>();

  for (const prop of properties) {
    const tokens = prop.value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    for (const token of tokens) {
      const parsed = parseDateToken(token);
      if (!parsed) continue;
      keys.add(occurrenceKey(parsed.date, parsed.time));
    }
  }

  return keys;
}

function expandRecurringDates(baseDate: string, rrule: RRule): string[] {
  const horizonStart = formatUtcDate(addUtcDays(new Date(), -365));
  const horizonEnd = formatUtcDate(addUtcDays(new Date(), 730));

  const base = dateToUtc(baseDate);
  const start = dateToUtc(horizonStart);
  const hardEnd = dateToUtc(horizonEnd);
  const ruleEnd = rrule.until ? dateToUtc(rrule.until) : hardEnd;
  const end = ruleEnd.getTime() < hardEnd.getTime() ? ruleEnd : hardEnd;

  const maxOccurrences = 1600;
  const results: string[] = [];
  let seen = 0;

  if (rrule.freq === "DAILY") {
    let cursor = base;
    while (cursor.getTime() <= end.getTime() && seen < maxOccurrences) {
      seen += 1;
      if (!rrule.count || seen <= rrule.count) {
        if (cursor.getTime() >= start.getTime()) {
          results.push(formatUtcDate(cursor));
        }
      }
      if (rrule.count && seen >= rrule.count) break;
      cursor = addUtcDays(cursor, rrule.interval);
    }
    return results;
  }

  if (rrule.freq === "WEEKLY") {
    const byDay = new Set(rrule.byDay && rrule.byDay.length > 0 ? rrule.byDay : [weekdayToken(base)]);
    const baseWeekStart = startOfIsoWeek(base);
    let cursor = base;

    while (cursor.getTime() <= end.getTime() && seen < maxOccurrences) {
      const weeksFromBase = Math.floor((startOfIsoWeek(cursor).getTime() - baseWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const isIntervalWeek = weeksFromBase >= 0 && weeksFromBase % rrule.interval === 0;
      const isAllowedDay = byDay.has(weekdayToken(cursor));
      const isAtOrAfterBase = cursor.getTime() >= base.getTime();

      if (isAtOrAfterBase && isIntervalWeek && isAllowedDay) {
        seen += 1;
        if (!rrule.count || seen <= rrule.count) {
          if (cursor.getTime() >= start.getTime()) {
            results.push(formatUtcDate(cursor));
          }
        }
        if (rrule.count && seen >= rrule.count) break;
      }

      cursor = addUtcDays(cursor, 1);
    }

    return results;
  }

  return [baseDate];
}

function firstProperty(map: Map<string, IcsProperty[]>, key: string): IcsProperty | undefined {
  return map.get(key)?.[0];
}

function getAllProperties(map: Map<string, IcsProperty[]>, key: string): IcsProperty[] {
  return map.get(key) ?? [];
}

export function parseIcsEvents(text: string): ParsedScheduleEvent[] {
  const lines = unfoldLines(text);
  const eventProps: Array<Map<string, IcsProperty[]>> = [];

  let current: Map<string, IcsProperty[]> | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === "BEGIN:VEVENT") {
      current = new Map<string, IcsProperty[]>();
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (current) eventProps.push(current);
      current = null;
      continue;
    }

    if (!current) continue;

    const parsed = parsePropertyLine(trimmed);
    if (!parsed) continue;

    const list = current.get(parsed.name) ?? [];
    list.push(parsed);
    current.set(parsed.name, list);
  }

  const parsedEvents: ParsedScheduleEvent[] = [];

  for (const props of eventProps) {
    const uid = firstProperty(props, "UID")?.value.trim() || `event-${parsedEvents.length + 1}`;
    const title = firstProperty(props, "SUMMARY")?.value.trim() || "Scheduled Shift";
    const location = firstProperty(props, "LOCATION")?.value.trim() || null;
    const notes = firstProperty(props, "DESCRIPTION")?.value.trim() || null;

    const dtStart = parseDateProperty(firstProperty(props, "DTSTART"));
    if (!dtStart) continue;

    const dtEnd = parseDateProperty(firstProperty(props, "DTEND"));
    const recurrenceId = parseDateProperty(firstProperty(props, "RECURRENCE-ID"));
    const rrule = parseRRule(firstProperty(props, "RRULE")?.value ?? "");
    const exdates = parseExdates(getAllProperties(props, "EXDATE"));

    const allDay = !dtStart.hasTime;
    const startTime = allDay ? "" : dtStart.time;
    const endTime = allDay ? "" : dtEnd?.time ?? "";

    let occurrenceDates: string[] = [];
    if (recurrenceId) {
      occurrenceDates = [dtStart.date];
    } else if (rrule) {
      occurrenceDates = expandRecurringDates(dtStart.date, rrule);
    } else {
      occurrenceDates = [dtStart.date];
    }

    for (const occurrenceDate of occurrenceDates) {
      const recurrenceKey = occurrenceKey(occurrenceDate, startTime);
      if (exdates.has(recurrenceKey) || exdates.has(occurrenceKey(occurrenceDate, ""))) continue;

      const externalId =
        recurrenceId || rrule
          ? `${uid}:${occurrenceDate}:${startTime || "all-day"}`
          : uid;

      parsedEvents.push({
        external_id: externalId,
        title,
        location,
        notes,
        shift_date: occurrenceDate,
        start_time: startTime,
        end_time: endTime,
        all_day: allDay,
      });

      if (parsedEvents.length >= 5000) break;
    }

    if (parsedEvents.length >= 5000) break;
  }

  const unique = new Map<string, ParsedScheduleEvent>();
  for (const event of parsedEvents) {
    const key = `${event.external_id}|${event.shift_date}|${event.start_time}`;
    if (!unique.has(key)) unique.set(key, event);
  }

  return Array.from(unique.values()).sort((a, b) => {
    if (a.shift_date !== b.shift_date) return a.shift_date.localeCompare(b.shift_date);
    return a.start_time.localeCompare(b.start_time);
  });
}
