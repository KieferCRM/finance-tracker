export const PRO_UNDER_CONSTRUCTION_MESSAGE = "Pro plan is under construction pending Plaid approval.";

export function isProEnabled(): boolean {
  return String(process.env.PLAID_APPROVED ?? "")
    .trim()
    .toLowerCase() === "true";
}
