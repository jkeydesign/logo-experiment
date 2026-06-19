export type Condition = 'human' | 'collab' | 'ai' | 'mixed'

export type ConditionLabel =
  | '시안 제시형'
  | '추천 제시형'
  | '평가 근거 제시형'

export type SetId = 'A' | 'B' | 'C'

export type DecisionType = '보류' | '제외'

export type Q1Action = DecisionType | '최종선택' | '계속보류'

export type AxisKey =
  | 'brand_fit'
  | 'target_fit'
  | 'comp_diff'
  | 'scalable'
  | 'timeless'
  | 'natural'
  | 'harmony'
  | 'refinement'

export interface AxisScores {
  brand_fit: number
  target_fit: number
  comp_diff: number
  scalable: number
  timeless: number
  natural: number
  harmony: number
  refinement: number
}

export interface BrandBrief {
  code: string
  name: string
  namingMeaning?: string
  category: string
  priceRange?: string
  overview?: string
  target: string
  positioning: string
  competitors: string
  competitiveContext?: string
  environments: string[]
  applicationMedia?: string[]
  keywords: string[]
  toneManner?: string
  developmentDirection?: string
  judgeAxes: string[]
}

export interface Logo {
  id: string
  name: string
  meta: string
  style: string
  color: string
  imageSrc?: string
  isAiRecommended?: boolean
  aiRank?: number
  aiExplanation?: string
}

export interface ConditionAssignment {
  order: 1 | 2 | 3
  condition: Condition
  conditionLabel: ConditionLabel
  setId: SetId
  setBriefCode: string
  latinSquareGroup: string
}

export interface StimulusLogRow {
  participant_id: string
  latin_square_group: string | null
  condition_order: string
  condition_type: ConditionLabel
  condition_group: 'presentation_only' | 'recommendation' | 'evaluation' | null
  set_id: SetId
  stimulus_id: string
  display_order: number
  ai_recommended: boolean
  ai_recommend_rank: number | null
  ai_rank: number | null
  ai_score: number | null
  ai_explanation: string | null
  ai_score_brand_fit: number | null
  ai_score_target_fit: number | null
  ai_score_competitive_diff: number | null
  ai_score_expandability: number | null
  ai_score_durability: number | null
  ai_score_naturalness: number | null
  ai_score_harmony: number | null
  ai_score_elaboration: number | null
  user_score_brand_fit_initial: number | null
  user_score_target_fit_initial: number | null
  user_score_competitive_diff_initial: number | null
  user_score_expandability_initial: number | null
  user_score_durability_initial: number | null
  user_score_naturalness_initial: number | null
  user_score_harmony_initial: number | null
  user_score_elaboration_initial: number | null
  user_score_brand_fit_final: number | null
  user_score_target_fit_final: number | null
  user_score_competitive_diff_final: number | null
  user_score_expandability_final: number | null
  user_score_durability_final: number | null
  user_score_naturalness_final: number | null
  user_score_harmony_final: number | null
  user_score_elaboration_final: number | null
  brand_overall_fit_score_final: number | null
  visual_overall_quality_score_final: number | null
  main_judgment_criteria: string | null
  main_judgment_criteria_count: number
  brand_5axis_avg_initial: number | null
  visual_3axis_avg_initial: number | null
  total_score_initial: number | null
  brand_5axis_avg_final: number | null
  visual_3axis_avg_final: number | null
  total_score_final: number | null
  initial_decision_hold_or_exclude: DecisionType | null
  final_decision_hold_or_exclude: DecisionType | null
  decision_changed: boolean
  change_direction: '보류→제외' | '제외→보류' | '유지' | null
  score_modified: boolean
  modified_items_count: number
  brand_score_modified_count: number
  visual_score_modified_count: number
  ai_score_acceptance_rate: number | null
  auto_rank_initial: number | null
  auto_rank_final: number | null
  final_selected: boolean
  final_selected_rank: number | null
  final_selected_is_ai_recommended: boolean | null
  timestamp_initial_decision: string | null
  timestamp_score_revision: string | null
  timestamp_final_selection: string | null
  score_100_initial: number | null
  score_100_final: number | null
  set_brief_code: string
}

export interface ActivityEvent {
  participantId: string
  sessionId: string
  timestamp: string
  eventMs: number
  sinceExperimentStartMs: number
  sincePreviousEventMs: number
  eventName: string
  condition?: Condition
  conditionLabel?: ConditionLabel
  setId?: SetId
  stimulusId?: string
  detail?: string
  payload?: Record<string, unknown>
}

export interface ExperimentState {
  participantId: string
  sessionId: string
  experimentStartedAt: number | null
  lastEventAt: number | null
  assignments: ConditionAssignment[]
  rows: StimulusLogRow[]
  events: ActivityEvent[]
  setParticipant: (participantId: string) => void
  setAssignments: (assignments: ConditionAssignment[]) => void
  startExperiment: (startedAt?: number) => void
  logEvent: (eventName: string, payload?: Omit<ActivityEvent, 'participantId' | 'sessionId' | 'timestamp' | 'eventMs' | 'sinceExperimentStartMs' | 'sincePreviousEventMs' | 'eventName'> & { payload?: Record<string, unknown> }) => void
  startTimer: (logoId: string) => void
  upsertStimulusRow: (row: StimulusLogRow) => void
  exportRowsJson: () => void
  exportRowsCsv: () => void
  exportEventsJson: () => void
  exportEventsCsv: () => void
  resetSession: () => void
}
