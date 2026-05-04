/**
 * Ronald Gym Tracker — Apps Script backend
 *
 * Deployment: Deploy → New deployment → Web app
 *   Execute as: Me (your Google account)
 *   Who has access: Anyone
 *
 * Sheet structure required:
 *   Sheet "Sessions": ID | Date | Training | Duration | Notes
 *   Sheet "Sets":     SessionID | ExerciseID | ExerciseName | SetNum | Weight | Reps | Notes
 *
 * Both sheets must have header row in row 1.
 */

const SHEET_SESSIONS = 'Sessions';
const SHEET_SETS = 'Sets';

// =============================================================
// GET — read history (returns JSON via callback for JSONP-like flow)
// =============================================================
function doGet(e) {
  try {
    const action = (e.parameter.action || 'history').toString();
    const callback = e.parameter.callback; // optional JSONP

    let result;

    if (action === 'history') {
      result = readHistory();
    } else if (action === 'ping') {
      result = { ok: true, time: new Date().toISOString() };
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    return jsonResponse(result, callback);
  } catch (err) {
    return jsonResponse({ error: err.toString() }, e.parameter.callback);
  }
}

// =============================================================
// POST — write session + sets (no-cors compatible)
// =============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Expected payload:
    // {
    //   sessionId: "SES-xxx",
    //   date: "2026-05-04",
    //   trainingId: 2,
    //   trainingName: "Tréning 2",
    //   duration: null,
    //   notes: "",
    //   sets: [
    //     { exerciseId: "2C1", exerciseName: "Rumunský MŤ", setNum: 1, weight: 24, reps: 10, notes: "" },
    //     ...
    //   ]
    // }

    writeSession(data);

    return jsonResponse({ ok: true, sessionId: data.sessionId });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// =============================================================
// READ — return all sessions + sets as structured JSON
// =============================================================
function readHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  const setsSheet = ss.getSheetByName(SHEET_SETS);

  if (!sessSheet || !setsSheet) {
    throw new Error('Hárky "Sessions" a "Sets" neboli nájdené v Sheete.');
  }

  // Sessions
  const sessRange = sessSheet.getDataRange().getValues();
  const sessions = [];
  for (let i = 1; i < sessRange.length; i++) {
    const r = sessRange[i];
    if (!r[0]) continue; // skip empty
    sessions.push({
      sessionId: String(r[0]),
      date: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
      training: String(r[2]),
      duration: r[3] || null,
      notes: r[4] || '',
    });
  }

  // Sets — group by sessionId
  const setsRange = setsSheet.getDataRange().getValues();
  const setsBySession = {};
  for (let i = 1; i < setsRange.length; i++) {
    const r = setsRange[i];
    if (!r[0]) continue;
    const sid = String(r[0]);
    if (!setsBySession[sid]) setsBySession[sid] = [];
    setsBySession[sid].push({
      exerciseId: String(r[1]),
      exerciseName: String(r[2]),
      setNum: Number(r[3]) || 0,
      weight: r[4] === '' ? null : Number(r[4]),
      reps: r[5] === '' ? null : Number(r[5]),
      notes: r[6] || '',
    });
  }

  // Attach sets to sessions
  sessions.forEach(s => {
    s.sets = setsBySession[s.sessionId] || [];
  });

  // Newest first
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { ok: true, sessions };
}

// =============================================================
// WRITE — append session + its sets, or update if sessionId exists
// =============================================================
function writeSession(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessSheet = ss.getSheetByName(SHEET_SESSIONS);
  const setsSheet = ss.getSheetByName(SHEET_SETS);

  if (!sessSheet || !setsSheet) {
    throw new Error('Hárky "Sessions" a "Sets" neboli nájdené.');
  }

  const sid = data.sessionId;
  if (!sid) throw new Error('Chýba sessionId.');

  // 1. Upsert session row
  const sessData = sessSheet.getDataRange().getValues();
  let sessRowIdx = -1;
  for (let i = 1; i < sessData.length; i++) {
    if (String(sessData[i][0]) === sid) { sessRowIdx = i + 1; break; }
  }

  const sessRow = [
    sid,
    data.date || new Date().toISOString().slice(0, 10),
    data.trainingName || '',
    data.duration || '',
    data.notes || '',
  ];

  if (sessRowIdx > 0) {
    sessSheet.getRange(sessRowIdx, 1, 1, sessRow.length).setValues([sessRow]);
  } else {
    sessSheet.appendRow(sessRow);
  }

  // 2. Replace all sets for this session (delete + reinsert)
  const setsData = setsSheet.getDataRange().getValues();
  const rowsToDelete = [];
  for (let i = setsData.length - 1; i >= 1; i--) {
    if (String(setsData[i][0]) === sid) rowsToDelete.push(i + 1);
  }
  rowsToDelete.forEach(rowNum => setsSheet.deleteRow(rowNum));

  if (Array.isArray(data.sets) && data.sets.length > 0) {
    const setsRows = data.sets.map(s => [
      sid,
      s.exerciseId || '',
      s.exerciseName || '',
      s.setNum || '',
      s.weight === null || s.weight === undefined ? '' : s.weight,
      s.reps === null || s.reps === undefined ? '' : s.reps,
      s.notes || '',
    ]);
    setsSheet.getRange(setsSheet.getLastRow() + 1, 1, setsRows.length, 7).setValues(setsRows);
  }
}

// =============================================================
// JSON helper — returns ContentService output, JSONP if callback given
// =============================================================
function jsonResponse(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================================
// One-time setup — run once manually to create sheets if missing
// =============================================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sess = ss.getSheetByName(SHEET_SESSIONS);
  if (!sess) {
    sess = ss.insertSheet(SHEET_SESSIONS);
  }
  if (sess.getLastRow() === 0) {
    sess.appendRow(['ID', 'Date', 'Training', 'Duration', 'Notes']);
    sess.getRange(1, 1, 1, 5).setFontWeight('bold');
    sess.setFrozenRows(1);
  }

  let sets = ss.getSheetByName(SHEET_SETS);
  if (!sets) {
    sets = ss.insertSheet(SHEET_SETS);
  }
  if (sets.getLastRow() === 0) {
    sets.appendRow(['SessionID', 'ExerciseID', 'ExerciseName', 'SetNum', 'Weight', 'Reps', 'Notes']);
    sets.getRange(1, 1, 1, 7).setFontWeight('bold');
    sets.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert('Hárky pripravené. Teraz Deploy → New deployment → Web app.');
}
