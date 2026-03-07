export function mapScheduleError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("schedule_sources") || normalized.includes("schedule_events")) {
    return "Schedule tables are missing. Run docs/sql/003_schedule_calendar_sync.sql in Supabase first.";
  }
  return message;
}
