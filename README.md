# TipTab (Standalone)

This is a separate project from `ig-social-crm`.

## Goal
BarMath for Bartenders: a playful, dark-themed tip-income tracker for servers and bartenders to replace spreadsheet budgeting.

## MVP
- Log shift income (cash tips, card tips, hourly)
- Log expenses by category
- Monthly reports with savings insights
- CSV export for backup/taxes
- CSV import from Google Sheets exports
- Optional Plaid bank sync (connect + transaction sync)
- Optional Google Sheets auto-sync on new income/expense entries

## Suggested Stack
- Next.js App Router
- Supabase Auth + Postgres

## Start Here
1. Apply SQL in `docs/sql/001_base_schema.sql` to a new Supabase project.
2. Optional but recommended for bank sync: apply `docs/sql/002_bank_integration_plaid.sql`.
3. Copy `.env.example` to `.env.local` and fill values.
4. Generate an encryption key for bank tokens:
   - `openssl rand -base64 32`
   - paste into `BANK_TOKEN_ENCRYPTION_KEY`
5. Install and run:
   - `npm install`
   - `npm run dev`
6. Open `http://localhost:3002`.

## Google Sheets Auto Sync
1. Follow full setup: `docs/google-sheets/setup.md`.
2. Set in `.env.local`:
   - `GOOGLE_SHEETS_WEBHOOK_URL`
   - `GOOGLE_SHEETS_WEBHOOK_SECRET`
3. Test connection with:
   - `POST /api/integrations/google-sheets/test`
4. Every new income or expense entry triggers a webhook event automatically.

## Reports
- Monthly report page: `/app/report`
- CSV import page: `/app/import`

## Plaid Setup
1. Create a Plaid app in Plaid Dashboard.
2. Use `sandbox` first:
   - `PLAID_ENV=sandbox`
   - set `PLAID_CLIENT_ID` and `PLAID_SECRET`
3. Connect account in app at `/app/bank`.
4. Click `Sync Transactions` to import into `bank_transactions`.
