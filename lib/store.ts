import { create } from 'zustand'
import type {
  ActivityEvent,
  ConditionAssignment,
  ExperimentState,
  StimulusLogRow,
} from '@/types'

const makeSessionId = () => `session_${Date.now()}`

const CSV_COLUMNS: Array<keyof StimulusLogRow> = [
  'participant_id',
  'latin_square_group',
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

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return ''
  const str = String(value).replace(/"/g, '""')
  return /[",\n]/.test(str) ? `"${str}"` : str
}

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL ?? ''

function persistEntry(payload: unknown) {
  if (!GAS_URL) return
  // text/plain 으로 보내면 CORS preflight(OPTIONS) 없이 GAS에 전달됨
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).catch(() => {
    // 네트워크 오류 시 실험 진행에 영향 없도록 무시
  })
}

function getRowKey(row: StimulusLogRow) {
  return `${row.participant_id}|${row.condition_type}|${row.set_id}|${row.stimulus_id}`
}

function timelineMeta(experimentStartedAt: number | null, lastEventAt: number | null, nowMs: number) {
  const startedAt = experimentStartedAt ?? nowMs
  const previousAt = lastEventAt ?? startedAt
  return {
    startedAt,
    previousAt,
    sinceExperimentStartMs: Math.max(0, nowMs - startedAt),
    sincePreviousEventMs: Math.max(0, nowMs - previousAt),
  }
}

export const useExperiment = create<ExperimentState>((set, get) => ({
  participantId: '',
  sessionId: makeSessionId(),
  experimentStartedAt: null,
  lastEventAt: null,
  assignments: [],
  rows: [],
  events: [],

  setParticipant: (participantId) => {
    set({
      participantId,
      sessionId: makeSessionId(),
      experimentStartedAt: null,
      lastEventAt: null,
      assignments: [],
      rows: [],
      events: [],
    })
  },

  setAssignments: (assignments: ConditionAssignment[]) => {
    set({ assignments })
    persistEntry({
      kind: 'assignment',
      timestamp: new Date().toISOString(),
      participantId: get().participantId,
      sessionId: get().sessionId,
      assignments,
    })
  },

  startExperiment: (startedAt?: number) => {
    const now = startedAt ?? Date.now()
    set({ experimentStartedAt: now, lastEventAt: now })
  },

  logEvent: (eventName, payload = {}) => {
    const state = get()
    const nowMs = Date.now()
    const meta = timelineMeta(state.experimentStartedAt, state.lastEventAt, nowMs)

    const event: ActivityEvent = {
      participantId: state.participantId,
      sessionId: state.sessionId,
      timestamp: new Date(nowMs).toISOString(),
      eventMs: nowMs,
      sinceExperimentStartMs: meta.sinceExperimentStartMs,
      sincePreviousEventMs: meta.sincePreviousEventMs,
      eventName,
      condition: payload.condition,
      conditionLabel: payload.conditionLabel,
      setId: payload.setId,
      stimulusId: payload.stimulusId,
      detail: payload.detail,
      payload: payload.payload,
    }

    set((prev) => ({
      events: [event, ...prev.events],
      experimentStartedAt: prev.experimentStartedAt ?? meta.startedAt,
      lastEventAt: nowMs,
    }))

    persistEntry({ kind: 'event', ...event })
  },

  startTimer: () => {
    // Legacy compatibility for previously mounted components.
  },

  upsertStimulusRow: (row) => {
    set((prev) => {
      const key = getRowKey(row)
      const index = prev.rows.findIndex((item) => getRowKey(item) === key)
      const rows = [...prev.rows]
      if (index >= 0) {
        rows[index] = row
      } else {
        rows.push(row)
      }

      persistEntry({
        kind: 'stimulus_row',
        timestamp: new Date().toISOString(),
        participantId: prev.participantId,
        sessionId: prev.sessionId,
        row,
      })

      return { rows }
    })
  },

  exportRowsJson: () => {
    const { participantId, sessionId, rows, assignments } = get()
    const payload = {
      participantId,
      sessionId,
      exportedAt: new Date().toISOString(),
      assignments,
      rows,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${participantId || 'participant'}_${sessionId}_stimulus_rows.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportRowsCsv: () => {
    const { participantId, sessionId, rows } = get()
    const header = CSV_COLUMNS.join(',')
    const lines = rows.map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(','))
    const csv = `\uFEFF${header}\n${lines.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${participantId || 'participant'}_${sessionId}_stimulus_rows.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  exportEventsJson: () => {
    const { participantId, sessionId, events } = get()
    const payload = {
      participantId,
      sessionId,
      exportedAt: new Date().toISOString(),
      events: [...events].reverse(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${participantId || 'participant'}_${sessionId}_events.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  resetSession: () => {
    set({
      participantId: '',
      sessionId: makeSessionId(),
      experimentStartedAt: null,
      lastEventAt: null,
      assignments: [],
      rows: [],
      events: [],
    })
  },
}))
