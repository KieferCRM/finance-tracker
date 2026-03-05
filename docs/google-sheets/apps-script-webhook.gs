const SECRET = 'replace-with-your-secret';

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (SECRET && String(body.webhook_secret || '') !== SECRET) {
      return jsonResponse_({ error: 'unauthorized' });
    }

    const eventType = String(body.event || '').trim();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date().toISOString();

    if (eventType === 'income_created') {
      const sheet = ensureSheet_(spreadsheet, 'income_entries', [
        'received_at',
        'user_id',
        'id',
        'shift_date',
        'venue',
        'cash_tips',
        'card_tips',
        'hours_worked',
        'note',
        'created_at',
      ]);
      const row = body.row || {};
      sheet.appendRow([
        now,
        body.user_id || '',
        row.id || '',
        row.shift_date || '',
        row.venue || '',
        row.cash_tips || 0,
        row.card_tips || 0,
        row.hours_worked || row.hourly_wages || 0,
        row.note || '',
        row.created_at || '',
      ]);
      return jsonResponse_({ ok: true, sheet: 'income_entries' });
    }

    if (eventType === 'expense_created') {
      const sheet = ensureSheet_(spreadsheet, 'expense_entries', [
        'received_at',
        'user_id',
        'id',
        'expense_date',
        'category',
        'amount',
        'note',
        'created_at',
      ]);
      const row = body.row || {};
      sheet.appendRow([
        now,
        body.user_id || '',
        row.id || '',
        row.expense_date || '',
        row.category || '',
        row.amount || 0,
        row.note || '',
        row.created_at || '',
      ]);
      return jsonResponse_({ ok: true, sheet: 'expense_entries' });
    }

    if (eventType === 'connection_test') {
      const sheet = ensureSheet_(spreadsheet, 'events', [
        'received_at',
        'event',
        'user_id',
        'note',
      ]);
      sheet.appendRow([now, eventType, body.user_id || '', body.note || '']);
      return jsonResponse_({ ok: true, sheet: 'events' });
    }

    return jsonResponse_({ error: 'unsupported_event', event: eventType });
  } catch (error) {
    return jsonResponse_({ error: String(error) });
  }
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
