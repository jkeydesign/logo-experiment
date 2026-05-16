// ============================================================
// 로고 실험 데이터 수집 — Google Apps Script
// ============================================================
// 사용법:
//   1. Google Sheets 새 파일 생성
//   2. 확장 프로그램 > Apps Script 열기
//   3. 이 코드 전체 붙여넣기
//   4. SHEET_ID 를 현재 스프레드시트 ID로 교체
//      (시트 URL에서 /d/XXXX/edit 부분의 XXXX)
//   5. 저장 후 배포 > 새 배포 > 유형: 웹 앱
//      실행 계정: 나(본인), 액세스 권한: 모든 사용자
//   6. 배포 URL을 복사해 GitHub Secret NEXT_PUBLIC_GAS_URL 에 저장
// ============================================================

const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'

// ── 시트별 헤더 정의 ──────────────────────────────────────

const EVENT_HEADERS = [
  'received_at',
  'participantId',
  'sessionId',
  'timestamp',
  'eventMs',
  'sinceExperimentStartMs',
  'sincePreviousEventMs',
  'eventName',
  'condition',
  'conditionLabel',
  'setId',
  'stimulusId',
  'detail',
  'payload_json',
]

const ROW_HEADERS = [
  'received_at',
  'row_key',
  'participant_id',
  'condition_order',
  'condition_type',
  'set_id',
  'stimulus_id',
  'display_order',
  'ai_recommended',
  'ai_recommend_rank',
  'ai_score_brand_fit',
  'ai_score_target_fit',
  'ai_score_competitive_diff',
  'ai_score_expandability',
  'ai_score_durability',
  'ai_score_naturalness',
  'ai_score_harmony',
  'ai_score_elaboration',
  'user_score_brand_fit_initial',
  'user_score_target_fit_initial',
  'user_score_competitive_diff_initial',
  'user_score_expandability_initial',
  'user_score_durability_initial',
  'user_score_naturalness_initial',
  'user_score_harmony_initial',
  'user_score_elaboration_initial',
  'user_score_brand_fit_final',
  'user_score_target_fit_final',
  'user_score_competitive_diff_final',
  'user_score_expandability_final',
  'user_score_durability_final',
  'user_score_naturalness_final',
  'user_score_harmony_final',
  'user_score_elaboration_final',
  'brand_overall_fit_score_final',
  'visual_overall_quality_score_final',
  'main_judgment_criteria',
  'main_judgment_criteria_count',
  'brand_5axis_avg_initial',
  'visual_3axis_avg_initial',
  'total_score_initial',
  'brand_5axis_avg_final',
  'visual_3axis_avg_final',
  'total_score_final',
  'initial_decision_hold_or_exclude',
  'final_decision_hold_or_exclude',
  'decision_changed',
  'change_direction',
  'score_modified',
  'modified_items_count',
  'brand_score_modified_count',
  'visual_score_modified_count',
  'ai_score_acceptance_rate',
  'auto_rank_initial',
  'auto_rank_final',
  'final_selected',
  'final_selected_rank',
  'final_selected_is_ai_recommended',
  'timestamp_initial_decision',
  'timestamp_score_revision',
  'timestamp_final_selection',
]

const ASSIGNMENT_HEADERS = [
  'received_at',
  'participantId',
  'sessionId',
  'timestamp',
  'assignments_json',
]

// ── 메인 엔드포인트 ───────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const ss = SpreadsheetApp.openById(SHEET_ID)
    const now = new Date().toISOString()

    if (data.kind === 'event') {
      appendEvent(ss, data, now)
    } else if (data.kind === 'stimulus_row') {
      upsertStimulusRow(ss, data, now)
    } else if (data.kind === 'assignment') {
      appendAssignment(ss, data, now)
    }

    return jsonResponse({ ok: true })
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) })
  }
}

// GET 요청으로 시트 요약 확인 (관리자용)
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID)
    const eventSheet = ss.getSheetByName('events')
    const rowSheet = ss.getSheetByName('stimulus_rows')
    const summary = {
      events: eventSheet ? eventSheet.getLastRow() - 1 : 0,
      stimulus_rows: rowSheet ? rowSheet.getLastRow() - 1 : 0,
      fetched_at: new Date().toISOString(),
    }
    return jsonResponse(summary)
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) })
  }
}

// ── 시트별 처리 함수 ──────────────────────────────────────

function appendEvent(ss, data, now) {
  const sheet = getOrCreateSheet(ss, 'events', EVENT_HEADERS)
  sheet.appendRow([
    now,
    data.participantId ?? '',
    data.sessionId ?? '',
    data.timestamp ?? '',
    data.eventMs ?? '',
    data.sinceExperimentStartMs ?? '',
    data.sincePreviousEventMs ?? '',
    data.eventName ?? '',
    data.condition ?? '',
    data.conditionLabel ?? '',
    data.setId ?? '',
    data.stimulusId ?? '',
    data.detail ?? '',
    data.payload ? JSON.stringify(data.payload) : '',
  ])
}

function upsertStimulusRow(ss, data, now) {
  const sheet = getOrCreateSheet(ss, 'stimulus_rows', ROW_HEADERS)
  const row = data.row ?? {}
  const key = [row.participant_id, row.condition_type, row.set_id, row.stimulus_id].join('|')

  // 기존 행 탐색 (B열 = row_key, 2번째 컬럼)
  const lastRow = sheet.getLastRow()
  if (lastRow > 1) {
    const keyCol = sheet.getRange(2, 2, lastRow - 1, 1).getValues()
    for (let i = 0; i < keyCol.length; i++) {
      if (keyCol[i][0] === key) {
        // 기존 행 업데이트
        const rowData = buildRowData(row, now, key)
        sheet.getRange(i + 2, 1, 1, ROW_HEADERS.length).setValues([rowData])
        return
      }
    }
  }

  // 신규 행 추가
  sheet.appendRow(buildRowData(row, now, key))
}

function appendAssignment(ss, data, now) {
  const sheet = getOrCreateSheet(ss, 'assignments', ASSIGNMENT_HEADERS)
  sheet.appendRow([
    now,
    data.participantId ?? '',
    data.sessionId ?? '',
    data.timestamp ?? '',
    JSON.stringify(data.assignments ?? []),
  ])
}

// ── 유틸 ─────────────────────────────────────────────────

function buildRowData(row, now, key) {
  return [
    now,
    key,
    row.participant_id ?? '',
    row.condition_order ?? '',
    row.condition_type ?? '',
    row.set_id ?? '',
    row.stimulus_id ?? '',
    row.display_order ?? '',
    row.ai_recommended ?? '',
    row.ai_recommend_rank ?? '',
    row.ai_score_brand_fit ?? '',
    row.ai_score_target_fit ?? '',
    row.ai_score_competitive_diff ?? '',
    row.ai_score_expandability ?? '',
    row.ai_score_durability ?? '',
    row.ai_score_naturalness ?? '',
    row.ai_score_harmony ?? '',
    row.ai_score_elaboration ?? '',
    row.user_score_brand_fit_initial ?? '',
    row.user_score_target_fit_initial ?? '',
    row.user_score_competitive_diff_initial ?? '',
    row.user_score_expandability_initial ?? '',
    row.user_score_durability_initial ?? '',
    row.user_score_naturalness_initial ?? '',
    row.user_score_harmony_initial ?? '',
    row.user_score_elaboration_initial ?? '',
    row.user_score_brand_fit_final ?? '',
    row.user_score_target_fit_final ?? '',
    row.user_score_competitive_diff_final ?? '',
    row.user_score_expandability_final ?? '',
    row.user_score_durability_final ?? '',
    row.user_score_naturalness_final ?? '',
    row.user_score_harmony_final ?? '',
    row.user_score_elaboration_final ?? '',
    row.brand_overall_fit_score_final ?? '',
    row.visual_overall_quality_score_final ?? '',
    row.main_judgment_criteria ?? '',
    row.main_judgment_criteria_count ?? '',
    row.brand_5axis_avg_initial ?? '',
    row.visual_3axis_avg_initial ?? '',
    row.total_score_initial ?? '',
    row.brand_5axis_avg_final ?? '',
    row.visual_3axis_avg_final ?? '',
    row.total_score_final ?? '',
    row.initial_decision_hold_or_exclude ?? '',
    row.final_decision_hold_or_exclude ?? '',
    row.decision_changed ?? '',
    row.change_direction ?? '',
    row.score_modified ?? '',
    row.modified_items_count ?? '',
    row.brand_score_modified_count ?? '',
    row.visual_score_modified_count ?? '',
    row.ai_score_acceptance_rate ?? '',
    row.auto_rank_initial ?? '',
    row.auto_rank_final ?? '',
    row.final_selected ?? '',
    row.final_selected_rank ?? '',
    row.final_selected_is_ai_recommended ?? '',
    row.timestamp_initial_decision ?? '',
    row.timestamp_score_revision ?? '',
    row.timestamp_final_selection ?? '',
  ]
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8eaf6')
  }
  return sheet
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
