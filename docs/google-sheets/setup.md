# Google Sheets Setup (End-to-End)

Use this to make every new income/expense entry automatically append to a Google Sheet.

## 1) Create the spreadsheet
1. Create a new Google Sheet.
2. Name it `TipTab`.

## 2) Add Apps Script webhook
1. In the sheet, go to `Extensions -> Apps Script`.
2. Replace the default script with contents from:
   - `docs/google-sheets/apps-script-webhook.gs`
3. Set `SECRET` at the top of that script to a random value.
4. Save.

## 3) Deploy web app
1. Click `Deploy -> New deployment`.
2. Type: `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone`.
5. Deploy and copy the `Web app URL`.

## 4) Configure `.env.local`
Add:

```env
GOOGLE_SHEETS_WEBHOOK_URL=<your web app url>
GOOGLE_SHEETS_WEBHOOK_SECRET=<same SECRET value from Apps Script>
```

Restart dev server after updating env vars.

## 5) Verify connection
1. Log into the app.
2. Send test event:
   - `POST /api/integrations/google-sheets/test`
3. You should see a new row in sheet tab `events`.

## 6) Verify real writes
1. Add one income entry in `/app/ledger#income`.
2. Add one expense entry in `/app/ledger#expenses`.
3. Confirm rows appear in tabs:
   - `income_entries`
   - `expense_entries`

## 7) Import sheet CSV back into TipTab
1. In Google Sheets, open the `income_entries` tab and download as CSV.
2. In TipTab, go to `/app/import` and upload that CSV.
3. Repeat for `expense_entries` if needed.

## Event payloads sent by the app
- `event: "income_created"`
- `event: "expense_created"`
- `event: "connection_test"`
