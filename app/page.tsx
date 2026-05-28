'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AXIS_LABELS,
  BRAND_AXIS_IDS,
  CONDITION_GUIDES,
  VISUAL_AXIS_IDS,
  createAiSuggestedScores,
  createLatinSquareAssignments,
  getBriefByCode,
  getSetBrief,
  getStimulusSet,
} from '@/lib/data'
import { useExperiment } from '@/lib/store'
import type {
  AxisKey,
  AxisScores,
  BrandBrief,
  ConditionAssignment,
  ConditionLabel,
  DecisionType,
  Logo,
  SetId,
  StimulusLogRow,
} from '@/types'

type ScreenStep = 'consent' | 'participation_consent' | 'screening' | 'brief' | 'instruction' | 'evaluation' | 'result' | 'post_survey' | 'comparison_survey' | 'debriefing_check' | 'debriefing' | 'eligibility_collection' | 'completed'
type RightTab = 'hold' | 'exclude'
type EligibilityCheck = {
  q1: 'yes' | 'no' | null
  q2: 'yes' | 'no' | null
  q3: 'yes' | 'no' | null
  q4: 'yes' | 'no' | null
}
type PostExperimentAnswers = {
  fullName: string
  ageGroup: string
  email: string
  career: string
  logoProjects: string
  field: string
  aiUse: string
  portfolioUrl: string
}

type PostSurveyLikertKey = 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8'
type PostSurveyAnswers = {
  infoType: string | null
  q3: number | null
  q4: number | null
  q5: number | null
  q6: number | null
  q7: number | null
  q8: number | null
  freeText: string
}
type CompSurveyAnswers = {
  easiest: string | null; strongestAgency: string | null; highestConfidence: string | null
  mostPractical: string | null; preferred: string | null; mostUsefulAi: string | null
  preferredExploration: string | null; preferredComparison: string | null
  preferredFinalSelection: string | null; freeText: string
}
type DebriefCheckAnswers = {
  sourceUnderstanding: string | null
  sourceInfluence: number | null
  sourceComment: string
}
const INITIAL_POST_SURVEY: PostSurveyAnswers = {
  infoType: null, q3: null, q4: null,
  q5: null, q6: null, q7: null, q8: null, freeText: '',
}
const INITIAL_COMP_SURVEY: CompSurveyAnswers = {
  easiest: null, strongestAgency: null, highestConfidence: null,
  mostPractical: null, preferred: null, mostUsefulAi: null,
  preferredExploration: null, preferredComparison: null,
  preferredFinalSelection: null, freeText: '',
}
const INITIAL_DEBRIEF_CHECK: DebriefCheckAnswers = {
  sourceUnderstanding: null, sourceInfluence: null, sourceComment: '',
}
const DEBRIEF_SOURCE_UNDERSTANDING_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '실시간 AI가 산출한 정보라고 이해했다', value: 'realtime_ai' },
  { label: '조건 간 비교를 위해 사전에 구성된 정보일 수 있다고 이해했다', value: 'preconfigured_possible' },
  { label: '두 가능성이 모두 있다고 이해했다', value: 'both_possible' },
  { label: '잘 모르겠다', value: 'unknown' },
]
const POST_SURVEY_INFO_TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'AI 관련 정보 없이 로고 시안만 제시되었다', value: 'visual_only' },
  { label: 'AI 추천 시안이 표시되었다', value: 'recommendation' },
  { label: 'AI 평가 순위와 시각 평가 설명이 표시되었다.', value: 'score_rank' },
  { label: '잘 모르겠다', value: 'unknown' },
]
const POST_SURVEY_COMMON: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q3', text: '최종 선택한 시안은 적절하다고 생각한다.' },
  { key: 'q4', text: '시안 판단 과정은 내가 주도했다고 생각한다.' },
  { key: 'q5', text: 'AI가 나의 판단 과정에 개입했다고 생각한다.' },
]
const POST_SURVEY_COLLAB: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q6', text: 'AI 추천 정보는 신뢰할 만하다고 생각한다.' },
  { key: 'q7', text: 'AI 추천 정보는 시안 판단에 유용했다고 생각한다.' },
]
const POST_SURVEY_AI_ONLY: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q6', text: 'AI 평가 점수 또는 순위는 신뢰할 만하다고 생각한다.' },
  { key: 'q7', text: 'AI 평가 점수 또는 순위는 시안 판단에 유용했다고 생각한다.' },
  { key: 'q8', text: 'AI 점수 또는 순위 때문에 나의 판단 기준이 흔들렸다고 생각한다.' },
]
const COND_LABELS_ALL: string[] = ['시안 제시형', '추천 제시형', '평가 제시형']
const COMP_QUESTIONS: Array<{ key: keyof CompSurveyAnswers; text: string; options: string[] }> = [
  { key: 'easiest', text: '세 조건 중 로고 시안을 판단하기 가장 쉬웠던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'strongestAgency', text: '세 조건 중 자신의 전문적 판단을 유지하기 가장 쉬웠던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'highestConfidence', text: '세 조건 중 최종 선택에 대한 확신이 가장 높았던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'mostPractical', text: '세 조건 중 실제 디자인 실무의 검토 과정에 가장 가깝다고 느낀 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferred', text: '향후 유사한 로고 시안 검토 상황에서 다시 사용하고 싶은 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'mostUsefulAi', text: '세 조건 중 AI 정보가 가장 유용하다고 느껴진 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferredExploration', text: '초기 후보 검토 단계에 가장 적절하다고 느낀 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferredComparison', text: '후보 유지/제외를 비교하며 판단하는 단계에 가장 적절하다고 느낀 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferredFinalSelection', text: '최종 시안 1개를 선택하는 단계에 가장 적절하다고 느낀 조건은 무엇입니까?', options: COND_LABELS_ALL },
]

interface StimulusCardState {
  stimulus: Logo
  displayOrder: number
  aiScores: AxisScores | null
  currentScores: Partial<AxisScores>
  initialScores: AxisScores | null
  finalScores: AxisScores | null
  brandOverallScore: number | null
  visualOverallScore: number | null
  mainJudgmentCriteria: string[]
  initialDecision: DecisionType | null
  finalDecision: DecisionType | null
  initialDecisionTs: string | null
  revisionTs: string | null
}

interface AppHistoryState {
  __aiLogoticsHistory: true
  step: ScreenStep
  currentConditionIndex: number
  participantInput: string
  participantError: string
  hasCheckedExperimentConsent: boolean
  consentAgreed: boolean
  consentTimestamp: string | null
  eligibilityCheck: EligibilityCheck
  eligibilityError: string
  cards: StimulusCardState[]
  editingCardId: string | null
  rightTab: RightTab
  activeStimulusId: string | null
  pendingDecision: DecisionType | null
  decisionNotice: string
  detailNotice: { stimulusId: string; message: string } | null
  briefCodeInput: string
  briefCodeError: string
  briefOverride: BrandBrief | null
  hasGenerated: boolean
  isGenerating: boolean
  visibleGeneratedCount: number
  finalSelectedStimulusId: string | null
  finalSelectionTs: string | null
  showLogCenter: boolean
  logCenterTab: 'view' | 'export'
  showFinalModal: boolean
  finalGuardNotice: { attemptedStimulusId: string; incompleteIds: string[] } | null
}

const AXIS_KEYS: AxisKey[] = [
  'brand_fit',
  'target_fit',
  'comp_diff',
  'scalable',
  'timeless',
  'natural',
  'harmony',
  'refinement',
]

const SCORE_LABEL: Record<number, string> = {
  1: '매우 낮음',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '매우 높음',
}

const BRAND_SUMMARY_REFERENCES = [
  { label: '의미 적합성', source: '브랜드 적합성', desc: '포지셔닝과 가치 키워드를 담아내는가?' },
  { label: '타깃 전달성', source: '타깃 적합성', desc: '타깃에게 의도한 의미가 전달되는가?' },
  { label: '경쟁 차별성', source: '경쟁 차별성', desc: '경쟁사의 시각 특성과 충분히 구분되는가?' },
  { label: '적용 확장성', source: '확장 가능성', desc: '다양한 매체와 응용 환경에서 일관되게 작동하는가?' },
  { label: '정체성 일관성', source: '시간 지속성', desc: '5~10년 후에도 유효한 형태인가?' },
]

const VISUAL_SUMMARY_REFERENCES = [
  { label: '자연성', source: '자연성', desc: '이 형태는 직관적으로 읽히고 친숙하게 느껴지는가?' },
  { label: '조화성', source: '조화성', desc: '시각 요소들이 균형 있고 안정적으로 배치되어 있는가?' },
  { label: '정교성', source: '정교성', desc: '단순하거나 복잡한 정도, 즉 디자인의 풍부함이 이 브랜드에 적절한 수준인가?' },
]

const MAIN_JUDGMENT_CRITERIA = [
  '의미 적합성',
  '타깃 전달성',
  '경쟁 차별성',
  '적용 확장성',
  '정체성 일관성',
  '자연성',
  '조화성',
  '정교성',
] as const

const LOGO_ASSET_VERSION = '20260515-ovbne-g-crop'
const RESEARCHER_EMAIL = 'kjully1492@gmail.com'
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzUddGpzIdpEcUvv85HwoKyOdxtLajnFuHEkcYGyMDqx-6BaBjPjPInK5nkj0twsymA/exec'

const INITIAL_ELIGIBILITY_CHECK: EligibilityCheck = { q1: null, q2: null, q3: null, q4: null }
const INITIAL_POST_EXPERIMENT: PostExperimentAnswers = {
  fullName: '', ageGroup: '', email: '', career: '', logoProjects: '', field: '', aiUse: '', portfolioUrl: '',
}

const ELIGIBILITY_QUESTIONS: Array<{ key: keyof EligibilityCheck; text: string }> = [
  { key: 'q1', text: '만 19세 이상입니까?' },
  { key: 'q2', text: '현재 디자인 분야에서 실무에 종사하고 있습니까?' },
  { key: 'q3', text: '디자인 실무 경력이 5년 이상입니까?' },
  { key: 'q4', text: '브랜드 로고 또는 CI 관련 프로젝트 경험이 3건 이상 있습니까?' },
]

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPortfolioUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const LS_COUNTER_KEY = 'logoexp_participant_counter'

function assignNextParticipant(): { code: string; lsIndex: number; lsGroup: string } {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_COUNTER_KEY) : null
  const prev = stored ? parseInt(stored, 10) : 0
  const n = prev + 1
  if (typeof window !== 'undefined') localStorage.setItem(LS_COUNTER_KEY, String(n))
  const lsIndex = (n - 1) % 6
  const lsGroup = `LS0${lsIndex + 1}`
  const code = `P${String(n).padStart(3, '0')}`
  return { code, lsIndex, lsGroup }
}


const CONDITION_SURFACE: Record<ConditionLabel, string> = {
  '시안 제시형': '#f8f8f8',
  '추천 제시형': '#f2f2f2',
  '평가 제시형': '#ececec',
}

const CONDITION_COLOR: Record<ConditionLabel, string> = {
  '시안 제시형': '#111111',
  '추천 제시형': '#4b5563',
  '평가 제시형': '#6b7280',
}

const INSTRUCTION_CONDITION_STYLE: Record<ConditionLabel, { button: string; surface: string; border: string; text: string }> = {
  '시안 제시형': { button: '#525d6e', surface: '#f5f6f7', border: '#525d6e', text: '#2d3748' },
  '추천 제시형': { button: '#6b7280', surface: '#f1f2f4', border: '#6b7280', text: '#374151' },
  '평가 제시형': { button: '#8a8f98', surface: '#e8eaed', border: '#8a8f98', text: '#4b5563' },
}

const AI_VISUAL_EVALUATION_TEXT: Record<number, string> = {
  1: '곡선의 흐름이 자연스럽고 형태 대비가 안정적으로 보입니다.',
  2: '기하 형태 간 균형이 좋고 조형적 완성도가 비교적 높습니다.',
  3: '대칭 구조가 명확하며 중심축의 조화가 안정적으로 보입니다.',
  4: '형태 대비는 강하지만 일부 요소의 연결성이 다소 분절적으로 보입니다.',
  5: '부드러운 곡선 구조가 있으나 전체 형태의 긴장감은 비교적 약합니다.',
  6: '형태의 리듬감은 있으나 요소 간 조화와 정교성은 다소 낮게 보입니다.',
  7: '기본 형태는 명확하지만 세부 조형의 완성도와 균형감이 제한적입니다.',
  8: '시각적 인상은 형성되지만 형태 간 비례와 정돈감이 다소 부족합니다.',
  9: '조형 요소의 관계가 불안정하며 전체적인 시각 완성도가 낮게 보입니다.',
}

const SYMBOL_SVG: Record<string, (color: string) => string> = {
  serif: c => `<circle cx="14" cy="22" r="10" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="22" r="4" fill="${c}" opacity=".22"/>`,
  sans: c => `<rect x="5" y="13" width="18" height="18" rx="5" fill="none" stroke="${c}" stroke-width="1.8"/><rect x="9" y="17" width="10" height="10" rx="3" fill="${c}" opacity=".18"/>`,
  mono: c => `<polygon points="14,9 25,20 14,31 3,20" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="20" r="3" fill="${c}" opacity=".35"/>`,
  icon: c => `<circle cx="14" cy="20" r="4.2" fill="${c}" opacity=".8"/><circle cx="7.3" cy="14.2" r="2.8" fill="${c}" opacity=".35"/><circle cx="20.7" cy="14.2" r="2.8" fill="${c}" opacity=".35"/><circle cx="10.2" cy="11.2" r="2.3" fill="${c}" opacity=".35"/><circle cx="17.8" cy="11.2" r="2.3" fill="${c}" opacity=".35"/>`,
  badge: c => `<path d="M14 8 L23 13 L23 24 L14 30 L5 24 L5 13 Z" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M14 12 L19 15 L19 22 L14 25 L9 22 L9 15 Z" fill="${c}" opacity=".2"/>`,
  letter: c => `<rect x="5" y="11" width="18" height="18" rx="3" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M9 25 L19 15" stroke="${c}" stroke-width="1.4" opacity=".75"/>`,
  serif2: c => `<circle cx="10.5" cy="20" r="6.5" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="17.5" cy="20" r="6.5" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  symbol: c => `<path d="M4 20 C7 13, 11 13, 14 20 C17 27, 21 27, 24 20" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
  script: c => `<path d="M4 23 C8 16, 11 16, 14 23 C17 30, 20 30, 24 23" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getWordmarkFromName(name: string): string {
  const firstToken = name.trim().split(/\s+/)[0] ?? 'LOGO'
  return firstToken.slice(0, 14).toUpperCase()
}

function renderLogoSvg(logo: Logo): string {
  if (logo.imageSrc) {
    const versionedSrc = logo.imageSrc.includes('?')
      ? logo.imageSrc
      : `${logo.imageSrc}?v=${LOGO_ASSET_VERSION}`
    const src = escapeSvgText(versionedSrc)
    const alt = escapeSvgText(logo.name)
    return `<img src="${src}" alt="${alt}" style="width:88%;height:88%;object-fit:contain;display:block;margin:auto;background:#ffffff;" />`
  }

  const symbolFn = SYMBOL_SVG[logo.style] ?? SYMBOL_SVG.serif
  const wordmark = escapeSvgText(getWordmarkFromName(logo.name))
  const color = logo.color
  return `<svg width="100%" height="100%" viewBox="0 0 132 78" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="124" height="66" rx="10" fill="rgba(255,255,255,.9)" />
    <g>${symbolFn(color)}</g>
    <text x="73" y="29" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="${color}" opacity=".65" letter-spacing="1.1">SYMBOL + WORDMARK</text>
    <text x="73" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="Arial, sans-serif" font-weight="700" letter-spacing=".7" fill="${color}">${wordmark}</text>
  </svg>`
}

function toAxisScores(scores: Partial<AxisScores>): AxisScores | null {
  for (const key of AXIS_KEYS) {
    const value = scores[key]
    if (typeof value !== 'number' || value < 1 || value > 5) {
      return null
    }
  }

  return {
    brand_fit: scores.brand_fit as number,
    target_fit: scores.target_fit as number,
    comp_diff: scores.comp_diff as number,
    scalable: scores.scalable as number,
    timeless: scores.timeless as number,
    natural: scores.natural as number,
    harmony: scores.harmony as number,
    refinement: scores.refinement as number,
  }
}

function calcMetrics(scores: AxisScores) {
  const brand = (scores.brand_fit + scores.target_fit + scores.comp_diff + scores.scalable + scores.timeless) / 5
  const visual = (scores.natural + scores.harmony + scores.refinement) / 3
  const total = (brand * 5 + visual * 3) / 8
  return {
    brand: +brand.toFixed(3),
    visual: +visual.toFixed(3),
    total: +total.toFixed(3),
    score100: +((total / 5) * 100).toFixed(2),
  }
}

function createSummaryScores(source: AxisScores, group: 'brand' | 'visual', value: number): AxisScores {
  if (group === 'brand') {
    return {
      ...source,
      brand_fit: value,
      target_fit: value,
      comp_diff: value,
      scalable: value,
      timeless: value,
    }
  }

  return {
    ...source,
    natural: value,
    harmony: value,
    refinement: value,
  }
}

function createScoresFromSummary(brandScore: number | null, visualScore: number | null): AxisScores | null {
  if (typeof brandScore !== 'number' || typeof visualScore !== 'number') {
    return null
  }

  return {
    brand_fit: brandScore,
    target_fit: brandScore,
    comp_diff: brandScore,
    scalable: brandScore,
    timeless: brandScore,
    natural: visualScore,
    harmony: visualScore,
    refinement: visualScore,
  }
}

function applySummaryGroupScore(scores: Partial<AxisScores>, group: 'brand' | 'visual', value: number): Partial<AxisScores> {
  if (group === 'brand') {
    return {
      ...scores,
      brand_fit: value,
      target_fit: value,
      comp_diff: value,
      scalable: value,
      timeless: value,
    }
  }

  return {
    ...scores,
    natural: value,
    harmony: value,
    refinement: value,
  }
}

function isDetailEvaluationComplete(card: StimulusCardState) {
  return (
    typeof card.brandOverallScore === 'number' &&
    typeof card.visualOverallScore === 'number' &&
    card.mainJudgmentCriteria.length >= 1 &&
    card.mainJudgmentCriteria.length <= 2
  )
}

function getDetailAxisScores(card: StimulusCardState): AxisScores | null {
  return createScoresFromSummary(card.brandOverallScore, card.visualOverallScore)
}

function getCardSortScore(card: StimulusCardState) {
  return card.finalScores ? calcMetrics(card.finalScores).total : -1
}

function getCardDisplayMetrics(card: StimulusCardState) {
  return card.finalScores ? calcMetrics(card.finalScores) : null
}

function diffCount(initial: AxisScores | null, final: AxisScores | null) {
  if (!initial || !final) {
    return { total: 0, brand: 0, visual: 0 }
  }

  let total = 0
  let brand = 0
  let visual = 0

  AXIS_KEYS.forEach((axis) => {
    if (initial[axis] !== final[axis]) {
      total += 1
      if ((BRAND_AXIS_IDS as readonly string[]).includes(axis)) {
        brand += 1
      } else if ((VISUAL_AXIS_IDS as readonly string[]).includes(axis)) {
        visual += 1
      }
    }
  })

  return { total, brand, visual }
}

function aiAcceptanceRate(aiScores: AxisScores | null, finalScores: AxisScores | null) {
  if (!aiScores || !finalScores) return null

  let same = 0
  AXIS_KEYS.forEach((axis) => {
    if (aiScores[axis] === finalScores[axis]) {
      same += 1
    }
  })

  return +((same / AXIS_KEYS.length) * 100).toFixed(2)
}

function toRecommended(logo: Logo) {
  return (logo.aiRank ?? 99) <= 3
}

function toRecommendRank(logo: Logo) {
  return toRecommended(logo) ? (logo.aiRank ?? null) : null
}

function rankMap(items: Array<{ id: string; score: number }>) {
  const sorted = [...items].sort((a, b) => b.score - a.score)
  const map: Record<string, number> = {}
  sorted.forEach((item, idx) => {
    map[item.id] = idx + 1
  })
  return map
}

function createEmptyStimulusRow(
  participantId: string,
  conditionOrderLabel: string,
  assignment: ConditionAssignment,
  card: StimulusCardState
): StimulusLogRow {
  const exposeAiRecommendation = assignment.condition !== 'human'
  const exposeAiScore = assignment.condition === 'ai'

  return {
    participant_id: participantId,
    latin_square_group: assignment.latinSquareGroup,
    condition_order: conditionOrderLabel,
    condition_type: assignment.conditionLabel,
    set_id: assignment.setId,
    stimulus_id: card.stimulus.id,
    display_order: card.displayOrder,
    ai_recommended: exposeAiRecommendation ? toRecommended(card.stimulus) : false,
    ai_recommend_rank: exposeAiRecommendation ? toRecommendRank(card.stimulus) : null,
    ai_score_brand_fit: exposeAiScore ? (card.aiScores?.brand_fit ?? null) : null,
    ai_score_target_fit: exposeAiScore ? (card.aiScores?.target_fit ?? null) : null,
    ai_score_competitive_diff: exposeAiScore ? (card.aiScores?.comp_diff ?? null) : null,
    ai_score_expandability: exposeAiScore ? (card.aiScores?.scalable ?? null) : null,
    ai_score_durability: exposeAiScore ? (card.aiScores?.timeless ?? null) : null,
    ai_score_naturalness: exposeAiScore ? (card.aiScores?.natural ?? null) : null,
    ai_score_harmony: exposeAiScore ? (card.aiScores?.harmony ?? null) : null,
    ai_score_elaboration: exposeAiScore ? (card.aiScores?.refinement ?? null) : null,
    user_score_brand_fit_initial: null,
    user_score_target_fit_initial: null,
    user_score_competitive_diff_initial: null,
    user_score_expandability_initial: null,
    user_score_durability_initial: null,
    user_score_naturalness_initial: null,
    user_score_harmony_initial: null,
    user_score_elaboration_initial: null,
    user_score_brand_fit_final: null,
    user_score_target_fit_final: null,
    user_score_competitive_diff_final: null,
    user_score_expandability_final: null,
    user_score_durability_final: null,
    user_score_naturalness_final: null,
    user_score_harmony_final: null,
    user_score_elaboration_final: null,
    brand_overall_fit_score_final: null,
    visual_overall_quality_score_final: null,
    main_judgment_criteria: null,
    main_judgment_criteria_count: 0,
    brand_5axis_avg_initial: null,
    visual_3axis_avg_initial: null,
    total_score_initial: null,
    brand_5axis_avg_final: null,
    visual_3axis_avg_final: null,
    total_score_final: null,
    initial_decision_hold_or_exclude: null,
    final_decision_hold_or_exclude: null,
    decision_changed: false,
    change_direction: null,
    score_modified: false,
    modified_items_count: 0,
    brand_score_modified_count: 0,
    visual_score_modified_count: 0,
    ai_score_acceptance_rate: null,
    auto_rank_initial: null,
    auto_rank_final: null,
    final_selected: false,
    final_selected_rank: null,
    final_selected_is_ai_recommended: null,
    timestamp_initial_decision: null,
    timestamp_score_revision: null,
    timestamp_final_selection: null,
    score_100_initial: null,
    score_100_final: null,
    set_brief_code: assignment.setBriefCode,
  }
}

export default function Home() {
  const {
    participantId,
    assignments,
    rows,
    events,
    setParticipant,
    setAssignments,
    startExperiment,
    logEvent,
    upsertStimulusRow,
    exportRowsJson,
    exportRowsCsv,
    exportEventsJson,
  } = useExperiment()

  const [step, setStep] = useState<ScreenStep>('consent')
  const [participantInput, setParticipantInput] = useState(participantId)
  const [participantError, setParticipantError] = useState('')
  const [hasCheckedExperimentConsent, setHasCheckedExperimentConsent] = useState(false)
  const [consentAgreed, setConsentAgreed] = useState(false)
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null)
  const [eligibilityCheck, setEligibilityCheck] = useState<EligibilityCheck>(INITIAL_ELIGIBILITY_CHECK)
  const [eligibilityError, setEligibilityError] = useState('')
  const [postExperimentAnswers, setPostExperimentAnswers] = useState<PostExperimentAnswers>(INITIAL_POST_EXPERIMENT)
  const [postExperimentError, setPostExperimentError] = useState('')
  const [isSubmittingPostExperiment, setIsSubmittingPostExperiment] = useState(false)
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null)
  const portfolioFileInputRef = useRef<HTMLInputElement | null>(null)
  const [portfolioFileError, setPortfolioFileError] = useState('')
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0)
  const [cards, setCards] = useState<StimulusCardState[]>([])
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('hold')
  const [activeStimulusId, setActiveStimulusId] = useState<string | null>(null)
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null)
  const [decisionNotice, setDecisionNotice] = useState('')
  const [detailNotice, setDetailNotice] = useState<{ stimulusId: string; message: string } | null>(null)
  const [briefCodeInput, setBriefCodeInput] = useState('')
  const [briefCodeError, setBriefCodeError] = useState('')
  const [briefOverride, setBriefOverride] = useState<BrandBrief | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [visibleGeneratedCount, setVisibleGeneratedCount] = useState(0)
  const [finalSelectedStimulusId, setFinalSelectedStimulusId] = useState<string | null>(null)
  const [finalSelectionTs, setFinalSelectionTs] = useState<string | null>(null)
  const [showLogCenter, setShowLogCenter] = useState(false)
  const [logCenterTab, setLogCenterTab] = useState<'view' | 'export'>('view')
  const [showFinalModal, setShowFinalModal] = useState(false)
  const [finalGuardNotice, setFinalGuardNotice] = useState<{ attemptedStimulusId: string; incompleteIds: string[] } | null>(null)
  const [postSurveyAnswers, setPostSurveyAnswers] = useState<PostSurveyAnswers>(INITIAL_POST_SURVEY)
  const [postSurveyError, setPostSurveyError] = useState('')
  const [compSurveyAnswers, setCompSurveyAnswers] = useState<CompSurveyAnswers>(INITIAL_COMP_SURVEY)
  const [compSurveyError, setCompSurveyError] = useState('')
  const [debriefCheckAnswers, setDebriefCheckAnswers] = useState<DebriefCheckAnswers>(INITIAL_DEBRIEF_CHECK)
  const [debriefCheckError, setDebriefCheckError] = useState('')
  const hasInitializedHistoryRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const lastHistorySignatureRef = useRef('')

  const historySnapshot = useMemo<AppHistoryState>(() => ({
    __aiLogoticsHistory: true,
    step,
    currentConditionIndex,
    participantInput,
    participantError,
    hasCheckedExperimentConsent,
    consentAgreed,
    consentTimestamp,
    eligibilityCheck,
    eligibilityError,
    cards,
    editingCardId,
    rightTab,
    activeStimulusId,
    pendingDecision,
    decisionNotice,
    detailNotice,
    briefCodeInput,
    briefCodeError,
    briefOverride,
    hasGenerated,
    isGenerating,
    visibleGeneratedCount,
    finalSelectedStimulusId,
    finalSelectionTs,
    showLogCenter,
    logCenterTab,
    showFinalModal,
    finalGuardNotice,
  }), [
    step,
    currentConditionIndex,
    participantInput,
    participantError,
    hasCheckedExperimentConsent,
    consentAgreed,
    consentTimestamp,
    eligibilityCheck,
    eligibilityError,
    cards,
    editingCardId,
    rightTab,
    activeStimulusId,
    pendingDecision,
    decisionNotice,
    detailNotice,
    briefCodeInput,
    briefCodeError,
    briefOverride,
    hasGenerated,
    isGenerating,
    visibleGeneratedCount,
    finalSelectedStimulusId,
    finalSelectionTs,
    showLogCenter,
    logCenterTab,
    showFinalModal,
    finalGuardNotice,
  ])

  useEffect(() => {
    const restoreFromHistory = (event: PopStateEvent) => {
      const snapshot = event.state as AppHistoryState | null
      if (!snapshot?.__aiLogoticsHistory) return

      isApplyingHistoryRef.current = true
      lastHistorySignatureRef.current = `${snapshot.step}:${snapshot.currentConditionIndex}`
      setStep(snapshot.step)
      setCurrentConditionIndex(snapshot.currentConditionIndex)
      setParticipantInput(snapshot.participantInput ?? '')
      setParticipantError(snapshot.participantError ?? '')
      setHasCheckedExperimentConsent(snapshot.hasCheckedExperimentConsent ?? false)
      setConsentAgreed(snapshot.consentAgreed ?? false)
      setConsentTimestamp(snapshot.consentTimestamp ?? null)
      setEligibilityCheck(snapshot.eligibilityCheck ?? INITIAL_ELIGIBILITY_CHECK)
      setEligibilityError(snapshot.eligibilityError ?? '')
      setCards(snapshot.cards ?? [])
      setEditingCardId(snapshot.editingCardId ?? null)
      setRightTab(snapshot.rightTab ?? 'hold')
      setActiveStimulusId(snapshot.activeStimulusId ?? null)
      setPendingDecision(snapshot.pendingDecision ?? null)
      setDecisionNotice(snapshot.decisionNotice ?? '')
      setDetailNotice(snapshot.detailNotice ?? null)
      setBriefCodeInput(snapshot.briefCodeInput ?? '')
      setBriefCodeError(snapshot.briefCodeError ?? '')
      setBriefOverride(snapshot.briefOverride ?? null)
      setHasGenerated(snapshot.hasGenerated ?? false)
      setIsGenerating(snapshot.isGenerating ?? false)
      setVisibleGeneratedCount(snapshot.visibleGeneratedCount ?? (snapshot.hasGenerated ? (snapshot.cards?.length ?? 0) : 0))
      setFinalSelectedStimulusId(snapshot.finalSelectedStimulusId ?? null)
      setFinalSelectionTs(snapshot.finalSelectionTs ?? null)
      setShowLogCenter(snapshot.showLogCenter ?? false)
      setLogCenterTab(snapshot.logCenterTab ?? 'view')
      setShowFinalModal(snapshot.showFinalModal ?? false)
      setFinalGuardNotice(snapshot.finalGuardNotice ?? null)
    }

    window.addEventListener('popstate', restoreFromHistory)
    return () => window.removeEventListener('popstate', restoreFromHistory)
  }, [])

  useEffect(() => {
    const signature = `${historySnapshot.step}:${historySnapshot.currentConditionIndex}`

    if (!hasInitializedHistoryRef.current) {
      window.history.replaceState(historySnapshot, '', window.location.href)
      hasInitializedHistoryRef.current = true
      lastHistorySignatureRef.current = signature
      return
    }

    if (isApplyingHistoryRef.current) {
      window.history.replaceState(historySnapshot, '', window.location.href)
      lastHistorySignatureRef.current = signature
      isApplyingHistoryRef.current = false
      return
    }

    if (signature !== lastHistorySignatureRef.current) {
      window.history.pushState(historySnapshot, '', window.location.href)
    } else {
      window.history.replaceState(historySnapshot, '', window.location.href)
    }

    lastHistorySignatureRef.current = signature
  }, [historySnapshot])

  const activeAssignment = assignments[currentConditionIndex] ?? null
  const conditionOrderLabel = useMemo(
    () => assignments.map((item) => item.conditionLabel).join(' > '),
    [assignments]
  )

  const activeBrief = useMemo(() => {
    if (!activeAssignment) return null
    return getSetBrief(activeAssignment.setId)
  }, [activeAssignment])
  const displayedBrief = briefOverride ?? activeBrief

  const allInitialCompleted = useMemo(
    () => cards.length > 0 && cards.every((card) => !!card.initialDecision),
    [cards]
  )
  const visibleCards = useMemo(
    () => (hasGenerated ? cards.slice(0, Math.min(cards.length, visibleGeneratedCount)) : []),
    [cards, hasGenerated, visibleGeneratedCount]
  )

  const currentConditionColor = activeAssignment ? CONDITION_COLOR[activeAssignment.conditionLabel] : '#4d4d4d'
  const currentConditionSurface = activeAssignment ? CONDITION_SURFACE[activeAssignment.conditionLabel] : '#f7f7f7'

  const initializeConditionCards = useCallback((assignment: ConditionAssignment) => {
    const stimuli = getStimulusSet(assignment.setId)

    const nextCards: StimulusCardState[] = stimuli.map((stimulus, idx) => {
      const isAiCondition = assignment.condition === 'ai'
      const aiScores = isAiCondition ? createAiSuggestedScores(stimulus) : null

      return {
        stimulus,
        displayOrder: idx + 1,
        aiScores,
        currentScores: aiScores ? { ...aiScores } : {},
        initialScores: null,
        finalScores: null,
        brandOverallScore: null,
        visualOverallScore: null,
        mainJudgmentCriteria: [],
        initialDecision: null,
        finalDecision: null,
        initialDecisionTs: null,
        revisionTs: null,
      }
    })

    if (assignment.condition === 'ai') {
      nextCards.sort((a, b) => (a.stimulus.aiRank ?? 99) - (b.stimulus.aiRank ?? 99))
      nextCards.forEach((card, i) => { card.displayOrder = i + 1 })
    }

    setCards(nextCards)
    setEditingCardId(null)
    setRightTab('hold')
    setActiveStimulusId(nextCards[0]?.stimulus.id ?? null)
    setPendingDecision(null)
    setDecisionNotice('')
    setDetailNotice(null)
    setBriefCodeError('')
    setHasGenerated(false)
    setIsGenerating(false)
    setVisibleGeneratedCount(0)
    setFinalSelectedStimulusId(null)
    setFinalSelectionTs(null)
  }, [])

  const rebuildRows = useCallback((nextCards: StimulusCardState[], selectedId: string | null, selectedTs: string | null) => {
    if (!activeAssignment || !participantId) return

    const initialHoldRanks = rankMap(
      nextCards
        .filter((card) => card.initialDecision === '보류' && card.initialScores)
        .map((card) => ({ id: card.stimulus.id, score: calcMetrics(card.initialScores as AxisScores).total }))
    )

    const initialExcludeRanks = rankMap(
      nextCards
        .filter((card) => card.initialDecision === '제외' && card.initialScores)
        .map((card) => ({ id: card.stimulus.id, score: calcMetrics(card.initialScores as AxisScores).total }))
    )

    const finalHoldRanks = rankMap(
      nextCards
        .filter((card) => card.finalDecision === '보류' && card.finalScores)
        .map((card) => ({ id: card.stimulus.id, score: calcMetrics(card.finalScores as AxisScores).total }))
    )

    const finalExcludeRanks = rankMap(
      nextCards
        .filter((card) => card.finalDecision === '제외' && card.finalScores)
        .map((card) => ({ id: card.stimulus.id, score: calcMetrics(card.finalScores as AxisScores).total }))
    )

    nextCards.forEach((card) => {
      const row = createEmptyStimulusRow(participantId, conditionOrderLabel, activeAssignment, card)
      const initial = card.initialScores
      const final = card.finalScores ?? card.initialScores

      if (initial) {
        const metric = calcMetrics(initial)
        row.user_score_brand_fit_initial = initial.brand_fit
        row.user_score_target_fit_initial = initial.target_fit
        row.user_score_competitive_diff_initial = initial.comp_diff
        row.user_score_expandability_initial = initial.scalable
        row.user_score_durability_initial = initial.timeless
        row.user_score_naturalness_initial = initial.natural
        row.user_score_harmony_initial = initial.harmony
        row.user_score_elaboration_initial = initial.refinement
        row.brand_5axis_avg_initial = metric.brand
        row.visual_3axis_avg_initial = metric.visual
        row.total_score_initial = metric.total
        row.score_100_initial = metric.score100
        row.timestamp_initial_decision = card.initialDecisionTs
      }

      if (final) {
        const metric = calcMetrics(final)
        row.user_score_brand_fit_final = final.brand_fit
        row.user_score_target_fit_final = final.target_fit
        row.user_score_competitive_diff_final = final.comp_diff
        row.user_score_expandability_final = final.scalable
        row.user_score_durability_final = final.timeless
        row.user_score_naturalness_final = final.natural
        row.user_score_harmony_final = final.harmony
        row.user_score_elaboration_final = final.refinement
        row.brand_overall_fit_score_final = card.brandOverallScore
        row.visual_overall_quality_score_final = card.visualOverallScore
        row.main_judgment_criteria = card.mainJudgmentCriteria.length > 0 ? card.mainJudgmentCriteria.join('|') : null
        row.main_judgment_criteria_count = card.mainJudgmentCriteria.length
        row.brand_5axis_avg_final = metric.brand
        row.visual_3axis_avg_final = metric.visual
        row.total_score_final = metric.total
        row.score_100_final = metric.score100
      }

      row.initial_decision_hold_or_exclude = card.initialDecision
      row.final_decision_hold_or_exclude = card.finalDecision
      row.auto_rank_initial = initialHoldRanks[card.stimulus.id] ?? initialExcludeRanks[card.stimulus.id] ?? null
      row.auto_rank_final = finalHoldRanks[card.stimulus.id] ?? finalExcludeRanks[card.stimulus.id] ?? null

      if (card.initialDecision && card.finalDecision) {
        row.decision_changed = card.initialDecision !== card.finalDecision
        row.change_direction =
          card.initialDecision === card.finalDecision
            ? '유지'
            : card.initialDecision === '보류'
              ? '보류→제외'
              : '제외→보류'
      }

      const diff = diffCount(initial, final)
      row.score_modified = diff.total > 0
      row.modified_items_count = diff.total
      row.brand_score_modified_count = diff.brand
      row.visual_score_modified_count = diff.visual
      row.ai_score_acceptance_rate = aiAcceptanceRate(card.aiScores, final)
      row.timestamp_score_revision = card.revisionTs

      row.final_selected = selectedId === card.stimulus.id
      row.final_selected_rank = row.final_selected ? row.auto_rank_final : null
      row.final_selected_is_ai_recommended = row.final_selected ? row.ai_recommended : null
      row.timestamp_final_selection = row.final_selected ? selectedTs : null

      upsertStimulusRow(row)
    })
  }, [activeAssignment, participantId, conditionOrderLabel, upsertStimulusRow])

  useEffect(() => {
    rebuildRows(cards, finalSelectedStimulusId, finalSelectionTs)
  }, [cards, finalSelectedStimulusId, finalSelectionTs, rebuildRows])

  const startExperimentSession = useCallback((code: string, assigned: ConditionAssignment[]) => {
    setParticipant(code)
    setParticipantInput(code)
    setAssignments(assigned)
    startExperiment(Date.now())
    setParticipantError('')
    setCurrentConditionIndex(0)
    setStep('brief')

    logEvent('experiment_start', {
      detail: '실험 시작',
      payload: {
        participant_code: code,
        latin_square_group: assigned[0]?.latinSquareGroup ?? '',
        condition_order: assigned.map((a) => a.conditionLabel).join(' > '),
        set_order: assigned.map((a) => a.setId).join(' > '),
        consentAgreed,
        consentTimestamp,
        consentVersion: 'v1.0',
      },
    })
  }, [setParticipant, setAssignments, startExperiment, logEvent, consentAgreed, consentTimestamp])

  const resetToConsent = useCallback(() => {
    setEligibilityCheck(INITIAL_ELIGIBILITY_CHECK)
    setEligibilityError('')
    setHasCheckedExperimentConsent(false)
    setConsentAgreed(false)
    setConsentTimestamp(null)
    setParticipantInput('')
    setParticipantError('')
    setStep('consent')
  }, [])

  const confirmEligibility = useCallback(() => {
    if (eligibilityCheck.q1 === null || eligibilityCheck.q2 === null || eligibilityCheck.q3 === null || eligibilityCheck.q4 === null) {
      setEligibilityError('모든 문항에 응답해 주세요.')
      return
    }
    if (eligibilityCheck.q1 === 'no' || eligibilityCheck.q2 === 'no' || eligibilityCheck.q3 === 'no' || eligibilityCheck.q4 === 'no') {
      setEligibilityError('rejection')
      return
    }
    setEligibilityError('')
    const { code, lsIndex, lsGroup } = assignNextParticipant()
    const assigned = createLatinSquareAssignments(lsIndex)
    logEvent('eligibility_passed', {
      detail: '참여 자격 확인 및 라틴스퀘어 배정 완료',
      payload: {
        participant_code: code,
        latin_square_group: lsGroup,
        condition_order: assigned.map((a) => a.conditionLabel).join(' > '),
        set_order: assigned.map((a) => a.setId).join(' > '),
      },
    })
    startExperimentSession(code, assigned)
  }, [eligibilityCheck, logEvent, startExperimentSession])

  const clearPortfolioFile = useCallback(() => {
    setPortfolioFile(null)
    setPortfolioFileError('')
    if (postExperimentError.includes('포트폴리오')) setPostExperimentError('')
    if (portfolioFileInputRef.current) portfolioFileInputRef.current.value = ''
  }, [postExperimentError])

  const submitPostExperiment = useCallback(() => {
    const trimmedEmail = postExperimentAnswers.email.trim()
    const trimmedPortfolioUrl = postExperimentAnswers.portfolioUrl.trim()
    const hasPortfolioUrl = !!trimmedPortfolioUrl
    const hasPortfolioFile = !!portfolioFile

    if (!isValidEmailAddress(trimmedEmail) && trimmedEmail) {
      setPostExperimentError('이메일 주소 형식이 올바르지 않습니다. 예: name@example.com')
      return
    }
    if (!hasPortfolioUrl && !hasPortfolioFile) {
      setPostExperimentError('포트폴리오 URL 또는 포트폴리오 파일 중 하나는 반드시 입력해 주세요.')
      return
    }
    if (hasPortfolioUrl && hasPortfolioFile) {
      setPostExperimentError('포트폴리오 URL 또는 파일 중 하나만 제출해 주세요.')
      return
    }
    if (hasPortfolioUrl && !isValidPortfolioUrl(trimmedPortfolioUrl)) {
      setPostExperimentError('포트폴리오 URL 형식이 올바르지 않습니다. https://로 시작하는 주소를 입력해 주세요.')
      return
    }
    setPostExperimentError('')
    setIsSubmittingPostExperiment(true)
    const gasUrl = process.env.NEXT_PUBLIC_GAS_URL || DEFAULT_GAS_URL
    if (gasUrl) {
      fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'eligibility',
          participantId,
          submittedAt: new Date().toISOString(),
          fullName: postExperimentAnswers.fullName,
          ageGroup: postExperimentAnswers.ageGroup,
          email: postExperimentAnswers.email,
          career: postExperimentAnswers.career,
          logoProjects: postExperimentAnswers.logoProjects,
          field: postExperimentAnswers.field,
          aiUse: postExperimentAnswers.aiUse,
          portfolioUrl: trimmedPortfolioUrl,
          portfolioFileName: portfolioFile?.name ?? '',
          portfolioFileSize: portfolioFile ? portfolioFile.size : '',
        }),
      }).catch(() => {})
    }
    logEvent('post_experiment_info_submitted', {
      detail: '실험 후 개인정보 제출',
      payload: { hasName: !!postExperimentAnswers.fullName, hasEmail: !!trimmedEmail, hasPortfolioUrl, hasPortfolioFile },
    })
    setIsSubmittingPostExperiment(false)
    setStep('completed')
  }, [postExperimentAnswers, portfolioFile, participantId, logEvent])

  const startCondition = useCallback(() => {
    if (!activeAssignment) return

    initializeConditionCards(activeAssignment)
    setBriefCodeInput(activeAssignment.setBriefCode)
    setBriefOverride(getSetBrief(activeAssignment.setId))
    setBriefCodeError('')
    setStep('evaluation')

    logEvent('condition_start', {
      condition: activeAssignment.condition,
      conditionLabel: activeAssignment.conditionLabel,
      setId: activeAssignment.setId,
      detail: `${activeAssignment.conditionLabel} 시작`,
      payload: {
        condition_order: conditionOrderLabel,
        set_id: activeAssignment.setId,
        brief_code: activeAssignment.setBriefCode,
      },
    })
  }, [activeAssignment, initializeConditionCards, logEvent, conditionOrderLabel])

  const switchConditionTab = useCallback((targetIndex: number) => {
    const target = assignments[targetIndex]
    if (!target) return

    const isSameTab = targetIndex === currentConditionIndex
    if (isSameTab && step === 'evaluation') return

    setCurrentConditionIndex(targetIndex)
    initializeConditionCards(target)
    setBriefCodeInput(target.setBriefCode)
    setBriefOverride(getSetBrief(target.setId))
    setBriefCodeError('')
    setStep('evaluation')
    setPendingDecision(null)
    setDecisionNotice('')

    if (!isSameTab) {
      logEvent('condition_tab_switch', {
        condition: target.condition,
        conditionLabel: target.conditionLabel,
        setId: target.setId,
        detail: `조건 탭 전환: ${target.conditionLabel}`,
        payload: { from: currentConditionIndex + 1, to: targetIndex + 1 },
      })
    }

    logEvent('condition_start', {
      condition: target.condition,
      conditionLabel: target.conditionLabel,
      setId: target.setId,
      detail: `${target.conditionLabel} 시작 (탭 선택)`,
      payload: {
        condition_order: conditionOrderLabel,
        set_id: target.setId,
        brief_code: target.setBriefCode,
        from_tab: currentConditionIndex + 1,
        to_tab: targetIndex + 1,
      },
    })
  }, [assignments, currentConditionIndex, step, initializeConditionCards, logEvent, conditionOrderLabel])

  const applyBriefCode = useCallback(() => {
    const code = briefCodeInput.trim().toUpperCase()
    if (!code) {
      setBriefCodeError('브리프 코드를 입력해 주세요.')
      return
    }

    const found = getBriefByCode(code)
    if (!found) {
      setBriefCodeError(`코드 ${code} 를 찾을 수 없습니다.`)
      return
    }

    setBriefOverride(found)
    setBriefCodeError('')
    logEvent('brief_code_applied', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: `브리프 코드 적용: ${code}`,
      payload: { code },
    })
  }, [briefCodeInput, activeAssignment, logEvent])

  const generateLogos = useCallback(async () => {
    if (hasGenerated || isGenerating) return

    const totalCards = cards.length
    setIsGenerating(true)
    setHasGenerated(true)
    setVisibleGeneratedCount(0)
    logEvent('ai_logo_generate_click', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: 'AI 로고 시안 생성 클릭',
    })

    const startedAt = Date.now()
    let revealed = 0
    while (revealed < totalCards) {
      const waitMs = revealed === 0
        ? 800 + Math.floor(Math.random() * 500)
        : 450 + Math.floor(Math.random() * 550)
      await new Promise((resolve) => setTimeout(resolve, waitMs))

      const increment = Math.random() > 0.45 ? 2 : 1
      revealed = Math.min(totalCards, revealed + increment)
      setVisibleGeneratedCount(revealed)
      if (revealed > 0) {
        setActiveStimulusId((prev) => prev ?? cards[0]?.stimulus.id ?? null)
      }
    }

    setIsGenerating(false)
    const totalWaitMs = Date.now() - startedAt

    logEvent('ai_logo_generate_complete', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: 'AI 로고 시안 생성 완료',
      payload: { waitMs: totalWaitMs, revealedCount: totalCards },
    })
  }, [hasGenerated, isGenerating, activeAssignment, cards, logEvent])

  const setScore = useCallback((stimulusId: string, axis: AxisKey, value: number) => {
    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card

      const nextCurrent = { ...card.currentScores, [axis]: value }
      const nowIso = new Date().toISOString()

      if (!card.initialDecision) {
        return {
          ...card,
          currentScores: nextCurrent,
        }
      }

      const nextFinal = toAxisScores(nextCurrent)
      return {
        ...card,
        currentScores: nextCurrent,
        finalScores: nextFinal ?? card.finalScores,
        revisionTs: nowIso,
      }
    }))

    logEvent('score_input', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: '평가 판단 척도 입력',
      payload: { axis, value },
    })

    const target = cards.find((card) => card.stimulus.id === stimulusId)
    if (target) {
      const nextScores: Partial<AxisScores> = { ...target.currentScores, [axis]: value }
      if (toAxisScores(nextScores)) {
        setDecisionNotice('')
      }
    }
  }, [activeAssignment, logEvent, cards])

  const requestInitialDecision = useCallback((stimulusId: string, decision: DecisionType) => {
    const card = cards.find((item) => item.stimulus.id === stimulusId)
    if (!card || card.initialDecision) return

    setActiveStimulusId(stimulusId)
    if (decision === '보류') setRightTab('hold')

    setPendingDecision(null)
    setDecisionNotice('')
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((item) => {
      if (item.stimulus.id !== stimulusId || item.initialDecision) return item
      return {
        ...item,
        initialScores: null,
        finalScores: null,
        initialDecision: decision,
        finalDecision: decision,
        initialDecisionTs: nowIso,
      }
    }))

    logEvent('initial_decision', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `초기 분류: ${decision}`,
      payload: { decision, stage: 'first_classification_only' },
    })
  }, [cards, activeAssignment, logEvent])

  const commitInitialDecision = useCallback((stimulusId: string, decision: DecisionType) => {
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card
      if (card.initialDecision) return card

      return {
        ...card,
        initialScores: null,
        finalScores: null,
        initialDecision: decision,
        finalDecision: decision,
        initialDecisionTs: nowIso,
      }
    }))

    logEvent('initial_decision', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `초기 분류: ${decision}`,
      payload: { decision, stage: 'first_classification_only' },
    })
    setPendingDecision(null)
    setDecisionNotice('')
  }, [activeAssignment, logEvent])

  const cancelInitialDecision = useCallback((stimulusId: string) => {
    const target = cards.find((card) => card.stimulus.id === stimulusId)
    if (!target?.initialDecision) return

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card
      return {
        ...card,
        initialScores: null,
        finalScores: null,
        initialDecision: null,
        finalDecision: null,
        initialDecisionTs: null,
        revisionTs: null,
      }
    }))

    if (finalSelectedStimulusId === stimulusId) {
      setFinalSelectedStimulusId(null)
      setFinalSelectionTs(null)
    }

    setActiveStimulusId(stimulusId)
    setRightTab('hold')
    setPendingDecision(null)
    setDecisionNotice('')
    setDetailNotice(null)

    logEvent('initial_decision_cancel', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `${target.initialDecision} 취소`,
      payload: { previous_decision: target.initialDecision },
    })
  }, [activeAssignment, cards, finalSelectedStimulusId, logEvent])

  const openResultScreen = useCallback(() => {
    if (!allInitialCompleted) return
    setStep('result')
    setEditingCardId(null)
    setPendingDecision(null)
    setDecisionNotice('')
    setShowFinalModal(false)

    logEvent('result_screen_open', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: '보류/제외 결과 화면 이동',
    })
  }, [allInitialCompleted, activeAssignment, logEvent])

  // 자동 결과 화면 전환 비활성화 — 평가 화면에서 계속 머뭄

  const updateFinalDecision = useCallback((stimulusId: string, nextDecision: DecisionType) => {
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card
      if (!card.initialDecision) return card
      if (card.finalDecision === nextDecision) return card

      return {
        ...card,
        finalDecision: nextDecision,
        revisionTs: nowIso,
      }
    }))

    if (finalSelectedStimulusId === stimulusId && nextDecision === '제외') {
      setFinalSelectedStimulusId(null)
      setFinalSelectionTs(null)
      logEvent('final_selection_cleared_by_move', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '최종선택 시안이 제외로 이동되어 최종선택 해제',
      })
    }

    logEvent('decision_move', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `최종 분류 변경: ${nextDecision}`,
      payload: { nextDecision },
    })
  }, [activeAssignment, finalSelectedStimulusId, logEvent])

  const updateFinalScore = useCallback((stimulusId: string, axis: AxisKey, value: number) => {
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card
      if (!card.initialDecision) return card

      const source = card.finalScores ?? card.initialScores
      if (!source) return card

      const nextFinal: AxisScores = {
        ...source,
        [axis]: value,
      }

      const payload: Partial<AxisScores> = {
        ...card.currentScores,
        [axis]: value,
      }

      return {
        ...card,
        currentScores: payload,
        finalScores: nextFinal,
        revisionTs: nowIso,
      }
    }))

    const targetCard = cards.find((item) => item.stimulus.id === stimulusId)
    const before = targetCard?.finalScores?.[axis] ?? targetCard?.initialScores?.[axis] ?? null

    let direction: '유지' | '높임' | '낮춤' | null = null
    if (activeAssignment?.condition === 'ai' && targetCard?.aiScores) {
      const aiVal = targetCard.aiScores[axis]
      direction = value === aiVal ? '유지' : value > aiVal ? '높임' : '낮춤'
    }

    logEvent('score_revision', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: '점수 재수정',
      payload: {
        axis,
        from: before,
        to: value,
        delta: before === null ? null : value - before,
        ai_direction: direction,
      },
    })
  }, [activeAssignment, cards, logEvent])

  const updateDetailOverallScore = useCallback((stimulusId: string, group: 'brand' | 'visual', value: number) => {
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card

      const nextBrandScore = group === 'brand' ? value : card.brandOverallScore
      const nextVisualScore = group === 'visual' ? value : card.visualOverallScore
      const nextSummaryScores = createScoresFromSummary(nextBrandScore, nextVisualScore)
      const nextCurrentScores = applySummaryGroupScore(card.currentScores, group, value)

      return {
        ...card,
        currentScores: nextCurrentScores,
        finalScores: card.initialDecision && nextSummaryScores ? nextSummaryScores : card.finalScores,
        brandOverallScore: group === 'brand' ? value : card.brandOverallScore,
        visualOverallScore: group === 'visual' ? value : card.visualOverallScore,
        revisionTs: card.initialDecision ? nowIso : card.revisionTs,
      }
    }))

    setDetailNotice(null)
    setFinalGuardNotice(null)
    logEvent('detail_overall_score_select', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: group === 'brand' ? '브랜드 종합 적합도 선택' : '시각 종합 완성도 선택',
      payload: { group, value },
    })
  }, [activeAssignment, logEvent])

  const toggleMainJudgmentCriterion = useCallback((stimulusId: string, criterion: string) => {
    const target = cards.find((card) => card.stimulus.id === stimulusId)
    if (!target) return

    const current = target.mainJudgmentCriteria
    const next = current.includes(criterion)
      ? current.filter((item) => item !== criterion)
      : [...current, criterion]

    if (next.length > 2) {
      setDetailNotice({
        stimulusId,
        message: '주된 판단 기준은 최대 2개까지만 선택할 수 있습니다.',
      })
      logEvent('detail_criteria_limit_notice', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '주된 판단 기준 2개 초과 선택 시도',
        payload: { attemptedCriterion: criterion, selectedCriteria: current },
      })
      return
    }

    const nowIso = new Date().toISOString()
    setCards((prev) => prev.map((card) => (
      card.stimulus.id === stimulusId
        ? {
            ...card,
            mainJudgmentCriteria: next,
            revisionTs: nowIso,
          }
        : card
    )))
    setDetailNotice(null)
    setFinalGuardNotice(null)

    logEvent('detail_criteria_toggle', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: '주된 판단 기준 선택 변경',
      payload: { criterion, selectedCriteria: next },
    })
  }, [activeAssignment, cards, logEvent])

  const selectFinal = useCallback((stimulusId: string) => {
    const target = cards.find((card) => card.stimulus.id === stimulusId)
    if (!target || !target.initialDecision) return false

    const incompleteHoldCards = cards.filter((card) => (
      card.initialDecision === '보류' && !isDetailEvaluationComplete(card)
    ))

    if (incompleteHoldCards.length > 0) {
      const firstIncomplete = incompleteHoldCards[0]
      setRightTab('hold')
      setActiveStimulusId(firstIncomplete.stimulus.id)
      setEditingCardId(firstIncomplete.stimulus.id)
      setShowFinalModal(false)
      setFinalGuardNotice({
        attemptedStimulusId: stimulusId,
        incompleteIds: incompleteHoldCards.map((card) => card.stimulus.id),
      })
      setDetailNotice({
        stimulusId: firstIncomplete.stimulus.id,
        message: '후보유지된 모든 시안의 미션 체크를 완료해야 최종선택을 할 수 있습니다.',
      })
      logEvent('final_selection_blocked_hold_mission_incomplete', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '보류 시안 전체 미션 체크 미완료로 최종선택 보류',
        payload: {
          attempted_stimulus_id: stimulusId,
          incomplete_hold_ids: incompleteHoldCards.map((card) => card.stimulus.id),
        },
      })
      return false
    }

    if (!isDetailEvaluationComplete(target)) {
      setEditingCardId(stimulusId)
      setDetailNotice({
        stimulusId,
        message: '브랜드 종합 적합도, 시각 종합 완성도, 주된 판단 기준 1~2개를 먼저 입력해 주세요.',
      })
      logEvent('final_selection_blocked_detail_incomplete', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '상세 평가 미완료로 최종선택 보류',
      })
      return false
    }

    if (target.finalDecision === '제외') {
      updateFinalDecision(stimulusId, '보류')
      logEvent('exclude_to_hold_for_final', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '제외→보류 자동 이동 후 최종선택',
      })
    }

    const nowIso = new Date().toISOString()
    const previousSelectedId = finalSelectedStimulusId
    setFinalSelectedStimulusId(stimulusId)
    setFinalSelectionTs(nowIso)

    logEvent('final_selection', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: previousSelectedId && previousSelectedId !== stimulusId ? '최종선택 변경' : '최종선택 완료',
      payload: {
        ai_recommended: toRecommended(target.stimulus),
        previous_selected_id: previousSelectedId,
        selection_changed: !!(previousSelectedId && previousSelectedId !== stimulusId),
      },
    })

    if (previousSelectedId && previousSelectedId !== stimulusId) {
      const prevCard = cards.find((c) => c.stimulus.id === previousSelectedId)
      logEvent('final_selection_changed', {
        condition: activeAssignment?.condition,
        conditionLabel: activeAssignment?.conditionLabel,
        setId: activeAssignment?.setId,
        stimulusId,
        detail: '최종선택 변경',
        payload: {
          previous_selected_id: previousSelectedId,
          new_selected_id: stimulusId,
          previous_ai_recommended: prevCard ? toRecommended(prevCard.stimulus) : null,
          new_ai_recommended: toRecommended(target.stimulus),
          condition_order: conditionOrderLabel,
        },
      })
    }
    return true
  }, [finalSelectedStimulusId, cards, updateFinalDecision, logEvent, activeAssignment])

  const moveToNextCondition = useCallback(() => {
    if (!activeAssignment || !finalSelectedStimulusId) return

    const incompleteHoldCards = cards.filter((card) => (
      card.initialDecision === '보류' && !isDetailEvaluationComplete(card)
    ))

    if (incompleteHoldCards.length > 0) {
      const firstIncomplete = incompleteHoldCards[0]
      setShowFinalModal(false)
      setRightTab('hold')
      setActiveStimulusId(firstIncomplete.stimulus.id)
      setEditingCardId(firstIncomplete.stimulus.id)
      setFinalGuardNotice({
        attemptedStimulusId: finalSelectedStimulusId,
        incompleteIds: incompleteHoldCards.map((card) => card.stimulus.id),
      })
      setDetailNotice({
        stimulusId: firstIncomplete.stimulus.id,
        message: '후보유지된 모든 시안의 미션 체크를 완료해야 조건을 완료할 수 있습니다.',
      })
      logEvent('condition_complete_blocked_hold_mission_incomplete', {
        condition: activeAssignment.condition,
        conditionLabel: activeAssignment.conditionLabel,
        setId: activeAssignment.setId,
        stimulusId: finalSelectedStimulusId,
        detail: '보류 시안 전체 미션 체크 미완료로 조건 완료 보류',
        payload: {
          incomplete_hold_ids: incompleteHoldCards.map((card) => card.stimulus.id),
        },
      })
      return
    }

    const selectedCard = cards.find((card) => card.stimulus.id === finalSelectedStimulusId)
    if (selectedCard && !isDetailEvaluationComplete(selectedCard)) {
      setEditingCardId(selectedCard.stimulus.id)
      setDetailNotice({
        stimulusId: selectedCard.stimulus.id,
        message: '최종 선택 1개 확정 전에 상세 평가를 완료해 주세요.',
      })
      return
    }

    logEvent('condition_complete', {
      condition: activeAssignment.condition,
      conditionLabel: activeAssignment.conditionLabel,
      setId: activeAssignment.setId,
      stimulusId: finalSelectedStimulusId,
      detail: `${activeAssignment.conditionLabel} 종료`,
    })

    setPostSurveyAnswers(INITIAL_POST_SURVEY)
    setPostSurveyError('')
    setStep('post_survey')
  }, [activeAssignment, finalSelectedStimulusId, cards, currentConditionIndex, assignments.length, logEvent])

  const submitPostSurvey = useCallback(() => {
    if (!activeAssignment) return
    const cond = activeAssignment.condition
    const needsCollab = cond === 'collab'
    const needsAiOnly = cond === 'ai'
    const missingInfoType = postSurveyAnswers.infoType === null
    const missingLikert = [postSurveyAnswers.q3, postSurveyAnswers.q4, postSurveyAnswers.q5].some((v) => v === null)
      || ((needsCollab || needsAiOnly) && [postSurveyAnswers.q6, postSurveyAnswers.q7].some((v) => v === null))
      || (needsAiOnly && postSurveyAnswers.q8 === null)
    const missingFreeText = !postSurveyAnswers.freeText?.trim()
    if (missingInfoType || missingLikert) {
      setPostSurveyError('모든 문항을 응답해 주세요.')
      return
    }
    if (missingFreeText) {
      setPostSurveyError('이번 단계에서 가장 판단하기 어려웠던 점을 입력해 주세요.')
      return
    }
    setPostSurveyError('')
    logEvent('condition_post_survey', {
      condition: activeAssignment.condition,
      conditionLabel: activeAssignment.conditionLabel,
      setId: activeAssignment.setId,
      stimulusId: finalSelectedStimulusId ?? undefined,
      detail: `조건별 사후 설문: ${activeAssignment.conditionLabel}`,
      payload: {
        participant_code: participantId,
        latin_square_group: activeAssignment.latinSquareGroup,
        trial_order: activeAssignment.order,
        condition_type: cond === 'human' ? 'visual_only' : cond === 'collab' ? 'recommendation' : 'score_rank',
        stimulus_set_id: activeAssignment.setId,
        selected_final_logo_id: finalSelectedStimulusId,
        manipulation_check_ai_info_type: postSurveyAnswers.infoType,
        final_choice_appropriateness: postSurveyAnswers.q3,
        perceived_control: postSurveyAnswers.q4,
        perceived_ai_intervention: postSurveyAnswers.q5,
        ai_recommendation_trust: needsCollab ? (postSurveyAnswers.q6 ?? null) : null,
        ai_recommendation_usefulness: needsCollab ? (postSurveyAnswers.q7 ?? null) : null,
        ai_score_rank_trust: needsAiOnly ? (postSurveyAnswers.q6 ?? null) : null,
        ai_score_rank_usefulness: needsAiOnly ? (postSurveyAnswers.q7 ?? null) : null,
        ai_score_rank_criterion_shift: needsAiOnly ? (postSurveyAnswers.q8 ?? null) : null,
        condition_difficulty_comment: postSurveyAnswers.freeText || null,
      },
    })
    const nextIndex = currentConditionIndex + 1
    if (nextIndex < assignments.length) {
      setCurrentConditionIndex(nextIndex)
      setCards([])
      setEditingCardId(null)
      setRightTab('hold')
      setActiveStimulusId(null)
      setPendingDecision(null)
      setDecisionNotice('')
      setDetailNotice(null)
      setHasGenerated(false)
      setIsGenerating(false)
      setVisibleGeneratedCount(0)
      setFinalSelectedStimulusId(null)
      setFinalSelectionTs(null)
      setShowFinalModal(false)
      setStep('instruction')
    } else {
      setCompSurveyAnswers(INITIAL_COMP_SURVEY)
      setCompSurveyError('')
      setStep('comparison_survey')
    }
  }, [
    activeAssignment, postSurveyAnswers, currentConditionIndex, assignments.length,
    finalSelectedStimulusId, participantId, logEvent,
  ])

  const submitCompSurvey = useCallback(() => {
    const required = [
      compSurveyAnswers.easiest, compSurveyAnswers.strongestAgency, compSurveyAnswers.highestConfidence,
      compSurveyAnswers.mostPractical, compSurveyAnswers.preferred, compSurveyAnswers.mostUsefulAi,
      compSurveyAnswers.preferredExploration, compSurveyAnswers.preferredComparison,
      compSurveyAnswers.preferredFinalSelection,
    ]
    if (required.some((v) => v === null)) {
      setCompSurveyError('모든 선택 문항을 응답해 주세요.')
      return
    }
    if (!compSurveyAnswers.freeText?.trim()) {
      setCompSurveyError('자유 응답을 입력해 주세요.')
      return
    }
    setCompSurveyError('')
    logEvent('final_comparison_survey', {
      detail: '전체 조건 비교 설문',
      payload: {
        participantId,
        easiestCondition: compSurveyAnswers.easiest,
        strongestAgencyCondition: compSurveyAnswers.strongestAgency,
        highestConfidenceCondition: compSurveyAnswers.highestConfidence,
        mostPracticalCondition: compSurveyAnswers.mostPractical,
        preferredCondition: compSurveyAnswers.preferred,
        mostUsefulAiCondition: compSurveyAnswers.mostUsefulAi,
        preferredExplorationStageCondition: compSurveyAnswers.preferredExploration,
        preferredComparisonStageCondition: compSurveyAnswers.preferredComparison,
        preferredFinalSelectionStageCondition: compSurveyAnswers.preferredFinalSelection,
        aiHelpOrInterferenceFreeText: compSurveyAnswers.freeText || null,
      },
    })
    setDebriefCheckAnswers(INITIAL_DEBRIEF_CHECK)
    setDebriefCheckError('')
    setStep('debriefing_check')
  }, [compSurveyAnswers, participantId, logEvent])

  const submitDebriefCheck = useCallback(() => {
    if (debriefCheckAnswers.sourceUnderstanding === null) {
      setDebriefCheckError('AI 정보 구성 방식에 대한 이해를 선택해 주세요.')
      return
    }
    if (debriefCheckAnswers.sourceInfluence === null) {
      setDebriefCheckError('판단 영향 정도를 선택해 주세요.')
      return
    }
    setDebriefCheckError('')
    logEvent('debriefing_check', {
      detail: 'AI 정보 인식 확인',
      payload: {
        participantId,
        ai_info_source_understanding: debriefCheckAnswers.sourceUnderstanding,
        ai_info_source_influence: debriefCheckAnswers.sourceInfluence,
        ai_info_source_comment: debriefCheckAnswers.sourceComment || null,
      },
    })
    setStep('debriefing')
  }, [debriefCheckAnswers, participantId, logEvent])

  const activeCard = useMemo(
    () => cards.find((card) => card.stimulus.id === activeStimulusId) ?? null,
    [cards, activeStimulusId]
  )

  const initialHoldCards = useMemo(
    () => cards.filter((card) => card.initialDecision === '보류'),
    [cards]
  )

  const initialExcludeCards = useMemo(
    () => cards.filter((card) => card.initialDecision === '제외'),
    [cards]
  )

  const holdCards = useMemo(() => {
    return cards
      .filter((card) => card.finalDecision === '보류')
      .sort((a, b) => getCardSortScore(b) - getCardSortScore(a))
  }, [cards])

  const excludeCards = useMemo(() => {
    return cards
      .filter((card) => card.finalDecision === '제외')
      .sort((a, b) => getCardSortScore(b) - getCardSortScore(a))
  }, [cards])

  const showConsentScreen = step === 'consent'
  const showParticipationConsent = step === 'participation_consent'
  const showScreeningScreen = step === 'screening'
  const showBrief = step === 'brief' && activeAssignment && activeBrief
  const showInstruction = step === 'instruction' && activeAssignment && activeBrief
  const showEvaluation = step === 'evaluation' && activeAssignment && activeBrief
  const showResult = step === 'result' && activeAssignment && activeBrief
  const showPostSurvey = step === 'post_survey' && activeAssignment
  const showCompSurvey = step === 'comparison_survey'
  const showDebriefCheck = step === 'debriefing_check'
  const showDebriefing = step === 'debriefing'
  const showEligibilityCollection = step === 'eligibility_collection'
  const showAppHeader = !showConsentScreen && !showParticipationConsent && !showScreeningScreen

  const finalSelectedLogos = useMemo(() => {
    return rows
      .filter((row) => row.final_selected)
      .map((row) => {
        const stimulus = getStimulusSet(row.set_id as SetId).find((logo) => logo.id === row.stimulus_id)
        return stimulus ? { row, stimulus } : null
      })
      .filter((item): item is { row: StimulusLogRow; stimulus: Logo } => item !== null)
  }, [rows])

  const handleUiClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const origin = event.target as HTMLElement | null
    if (!origin) return

    const clickable = origin.closest('button, [data-click-log]')
    if (!clickable) return

    const tag = clickable.tagName.toLowerCase()
    const text = (clickable.textContent ?? '').trim().replace(/\s+/g, ' ')
    const label = clickable.getAttribute('data-click-log') ?? (text || tag).slice(0, 80)
    const disabled =
      clickable instanceof HTMLButtonElement
        ? clickable.disabled
        : clickable.getAttribute('aria-disabled') === 'true'
    const stimulusId = clickable.getAttribute('data-stimulus-id') ?? undefined

    logEvent('ui_click', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `클릭: ${label}`,
      payload: {
        label,
        tag,
        disabled,
        screen_step: step,
        right_tab: rightTab,
        active_stimulus_id: activeStimulusId,
      },
    })
  }, [activeAssignment, logEvent, step, rightTab, activeStimulusId])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      {showAppHeader && (
        <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(17,17,17,.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#666666' }}>생성형 AI 기반 브랜드 로고 시안 판단 실험</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#4d4d4d' }}>
            <div>참가자 코드: {participantId || '-'}</div>
            <div>LS 그룹: {assignments[0]?.latinSquareGroup ?? '-'}</div>
            <div>저장된 로그 행: {rows.length}</div>
          </div>
        </header>
      )}

      <main style={{ flex: 1, overflow: 'auto', padding: 16 }} onClickCapture={handleUiClickCapture}>
        {showConsentScreen && (
          <div style={{ minHeight: '100%', display: 'grid', placeItems: 'start center', padding: '46px 0 36px' }}>
            <section style={{ width: 'min(1120px, 92vw)', background: '#ffffff', color: '#111111' }}>
              <div style={{ textAlign: 'center', marginBottom: 52 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 12 }}>
                  생성형 AI 기반 브랜드 로고 시안 판단 실험
                </h1>
              </div>

              <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 34, fontSize: 16, lineHeight: 1.85, color: '#1f2937' }}>
                <section style={{ display: 'grid', gap: 14 }}>
                  <p>
                    본 실험은 생성형 AI 기반 로고 디자인 환경에서 전문 디자이너의 로고 시안 판단 과정을 분석하기 위한 온라인 실험입니다.
                  </p>
                  <p>
                    본 연구는 로고 시안의 미적 우열이나 AI 생성 성능을 평가하는 것이 아닙니다.<br />
                    브랜드 브리프를 바탕으로 전문 디자이너가 어떤 기준과 과정으로 시안을 판단하는지를 살펴보는 데 목적이 있습니다.
                  </p>
                  <p>
                    참가자께서는 실제 실무에서 후보 시안을 검토하듯이, 제시된 브랜드 맥락과 로고 시안을 바탕으로 판단해 주시면 됩니다.<br />
                    본 실험에는 정답이 없으며, 본인의 전문적 판단에 따라 응답해 주시면 됩니다.
                  </p>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>[실험 참여 대상]</h2>
                  <ul style={{ display: 'grid', gap: 6, paddingLeft: 20 }}>
                    <li>만 19세 이상</li>
                    <li>디자인 실무 경력 5년 이상</li>
                    <li>로고 디자인 또는 브랜드 아이덴티티 프로젝트 경험이 있는 전문 디자이너</li>
                  </ul>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>[실험 진행 방식]</h2>
                  <ul style={{ display: 'grid', gap: 6, paddingLeft: 20 }}>
                    <li>실험은 참가자 코드 기반으로 진행됩니다.</li>
                    <li>실험 중에는 성명, 이메일, 포트폴리오를 수집하지 않습니다.</li>
                    <li>수집 자료는 로고 시안의 후보 유지, 제외, 변경, 최종 선택 과정과 간단한 평가 응답입니다.</li>
                    <li>제시되는 AI 판단 정보는 조건 간 비교와 자극 통제를 위해 사전에 구성된 정보일 수 있습니다.</li>
                  </ul>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>[실험 종료 후 자격 확인 및 사례비 지급]</h2>
                  <ul style={{ display: 'grid', gap: 6, paddingLeft: 20 }}>
                    <li>실험 종료 후 사례비 지급과 연구대상자 자격 확인을 위해 성명, 이메일, 포트폴리오 자료를 별도로 요청합니다.</li>
                    <li>포트폴리오는 자격 확인 목적으로만 사용되며, 실험 자료로 분석하지 않고 폐기됩니다.</li>
                    <li>사례비는 선정기준을 충족하고, 포트폴리오를 통해 로고 또는 브랜드 아이덴티티 프로젝트 경험이 확인된 참가자에게 지급됩니다.</li>
                    <li>최종 분석에는 연구대상자 선정기준을 충족하고 자격 확인이 완료된 응답만 포함됩니다.</li>
                  </ul>
                </section>

                <section>
                  <p>
                    디자인 업계와 학계의 연구 발전을 위해 적극적이고 신중한 참여를 부탁드립니다. 감사합니다.
                  </p>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>연구자 정보</h2>
                  <p>연구자: 강은영</p>
                  <p>소속: 홍익대학교 대학원 시각디자인 전공 박사과정</p>
                  <p>이메일: kjully1492@gmail.com</p>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 8 }}>
                  <button
                    onClick={() => {
                      setEligibilityError('')
                      setStep('participation_consent')
                    }}
                    style={{ border: 'none', background: '#000000', color: '#ffffff', borderRadius: 8, padding: '16px 12px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
                  >
                    참여합니다.
                  </button>
                  <button
                    onClick={() => {
                      setEligibilityError('declined')
                    }}
                    style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#1f2937', borderRadius: 8, padding: '16px 12px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  >
                    참여하지 않습니다.
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {showParticipationConsent && (
          <div style={{ minHeight: '100%', display: 'grid', placeItems: 'start center', padding: '42px 0 36px' }}>
            <section style={{ width: 'min(920px, 92vw)', background: '#ffffff', color: '#111111' }}>
              <div style={{ textAlign: 'center', marginBottom: 34 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 12 }}>
                  실험 참여 동의
                </h1>
              </div>

              <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 18, fontSize: 15, lineHeight: 1.75, color: '#1f2937' }}>
                {[
                  '나는 본 연구가 생성형 AI 기반 브랜드 로고 디자인 환경에서 전문 디자이너의 로고 시안 판단 과정을 분석하기 위한 온라인 실험임을 이해했습니다.',
                  '나는 연구 참여가 자발적이며, 참여하지 않거나 중도에 중단하더라도 어떠한 불이익이 없음을 이해했습니다.',
                  '나는 실험 중 수집되는 판단 로그와 설문 응답자료가 참가자 코드 기반으로 처리되며, 성명, 이메일, 포트폴리오 등 식별정보는 연구대상자 자격 확인, 중도 철회 처리, 사례비 지급 연락을 위해 실험자료와 분리하여 별도로 수집·관리됨을 이해했습니다.',
                  '나는 실험에서 로고 시안에 대한 후보 유지, 제외, 변경, 최종 선택 기록과 평가 응답, 설문 응답이 연구 자료로 수집됨을 이해했습니다.',
                  '나는 실험 조건에 따라 AI 관련 정보가 제공되지 않거나, AI 추천 정보 또는 AI 평가 순위와 설명이 제시될 수 있음을 이해했습니다.',
                  '나는 실험에서 제시되는 AI 판단 정보가 조건 간 비교와 자극 통제를 위해 사전에 구성된 정보일 수 있음을 이해했습니다.',
                  '나는 연구대상자 자격 확인과 사례비 지급을 위해 실험 종료 후 성명, 이메일, 연령대, 실무 경력, 프로젝트 경험, 주요 실무 분야, 생성형 이미지 도구 사용 경험, 포트폴리오 자료를 실험자료와 분리하여 제출할 수 있음을 이해했습니다.',
                  '나는 포트폴리오 자료가 연구대상자 자격 확인 목적으로만 사용되며, 실험자료로 분석되지 않고 연구 결과에 인용 또는 공개되지 않으며, 확인 후 폐기됨을 이해했습니다.',
                  '나는 연구 참여 과정에서 일시적인 피로감이나 판단 부담이 있을 수 있으며, 불편할 경우 언제든지 참여를 중단할 수 있음을 이해했습니다.',
                ].map((text, index) => (
                  <div
                    key={text}
                    style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, borderBottom: index === 8 ? 'none' : '1px solid rgba(17,17,17,.08)', paddingBottom: index === 8 ? 0 : 14 }}
                  >
                    <strong style={{ color: '#111111', fontSize: 15 }}>{index + 1}.</strong>
                    <p style={{ margin: 0 }}>{text}</p>
                  </div>
                ))}

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 10,
                    border: `1px solid ${hasCheckedExperimentConsent ? '#111111' : 'rgba(17,17,17,.16)'}`,
                    background: hasCheckedExperimentConsent ? '#f5f5f5' : '#ffffff',
                    borderRadius: 12,
                    padding: '15px 16px',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#111111',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasCheckedExperimentConsent}
                    onChange={(event) => setHasCheckedExperimentConsent(event.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#111111', cursor: 'pointer' }}
                  />
                  위 내용을 모두 확인했으며, 본 연구 참여에 자발적으로 동의합니다.
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 10 }}>
                  <button
                    disabled={!hasCheckedExperimentConsent}
                    onClick={() => {
                      if (!hasCheckedExperimentConsent) return
                      const agreedAt = new Date().toISOString()
                      setConsentAgreed(true)
                      setConsentTimestamp(agreedAt)
                      setEligibilityError('')
                      logEvent('consent_agreed', {
                        detail: '실험 참여 동의',
                        payload: {
                          consentAgreed: true,
                          consentTimestamp: agreedAt,
                          consentVersion: 'v1.0',
                        },
                      })
                      setStep('screening')
                    }}
                    style={{
                      border: 'none',
                      background: hasCheckedExperimentConsent ? '#000000' : '#d4d4d4',
                      color: '#ffffff',
                      borderRadius: 8,
                      padding: '16px 12px',
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: hasCheckedExperimentConsent ? 'pointer' : 'not-allowed',
                      opacity: hasCheckedExperimentConsent ? 1 : 0.72,
                    }}
                  >
                    동의하고 실험을 시작합니다.
                  </button>
                  <button
                    onClick={() => {
                      setConsentAgreed(false)
                      setConsentTimestamp(null)
                      setEligibilityError('consent_declined')
                    }}
                    style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#1f2937', borderRadius: 8, padding: '16px 12px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  >
                    동의하지 않고 종료합니다.
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {showScreeningScreen && (
          <div style={{ minHeight: '100%', display: 'grid', placeItems: 'start center', padding: '42px 0 36px' }}>
            <section style={{ width: 'min(620px, 92vw)', background: '#ffffff', color: '#111111' }}>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 10 }}>
                  실험 참여 자격 확인
                </h1>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65 }}>
                  아래 4가지 항목 모두 해당되는 경우에만 실험에 참여할 수 있습니다.
                </p>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {ELIGIBILITY_QUESTIONS.map(({ key, text }, idx) => {
                  const val = eligibilityCheck[key]
                  return (
                    <div key={key} style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 12, padding: 16, background: '#fafafa' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.55 }}>
                        {idx + 1}. {text}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['yes', 'no'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              setEligibilityCheck((prev) => ({ ...prev, [key]: v }))
                              setEligibilityError('')
                            }}
                            style={{
                              border: `1px solid ${val === v ? (v === 'yes' ? '#111111' : '#dc2626') : 'rgba(17,17,17,.18)'}`,
                              background: val === v ? (v === 'yes' ? '#111111' : '#dc2626') : '#ffffff',
                              color: val === v ? '#ffffff' : '#333333',
                              borderRadius: 8, padding: '8px 28px', fontSize: 14, fontWeight: val === v ? 700 : 400, cursor: 'pointer',
                            }}
                          >{v === 'yes' ? '예' : '아니오'}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {eligibilityError && eligibilityError !== 'rejection' && (
                <div style={{ marginTop: 16, border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                  {eligibilityError}
                </div>
              )}

              <button
                onClick={confirmEligibility}
                style={{ width: '100%', marginTop: 24, border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '15px 12px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
              >
                확인
              </button>

              <button
                onClick={resetToConsent}
                style={{ width: '100%', marginTop: 10, border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#555555', borderRadius: 8, padding: '12px 12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                이전으로
              </button>
            </section>
          </div>
        )}

        {showBrief && (
          <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
            <section style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 16, padding: 22, background: '#ffffff' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: currentConditionColor, marginBottom: 8 }}>
                조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#111111', letterSpacing: '-.03em', marginBottom: 6 }}>
                    브랜드 브리프
                  </div>
                  <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.65 }}>
                    로고 시안을 보기 전, 브랜드의 맥락과 판단 기준이 되는 핵심 정보를 먼저 확인해 주세요.
                  </div>
                </div>
                <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, color: '#111111', background: '#f7f7f7', whiteSpace: 'nowrap' }}>
                  {activeAssignment.setBriefCode}
                </div>
              </div>

              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 14, padding: 18, background: '#f8f8f8', marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 6 }}>브랜드명</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#111111', letterSpacing: '-.02em', marginBottom: 10 }}>
                  {activeBrief.name}
                </div>
                {activeBrief.namingMeaning && (
                  <div style={{ fontSize: 14, color: '#333333', lineHeight: 1.75 }}>
                    {activeBrief.namingMeaning}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 14 }}>
                {[
                  ['업종', activeBrief.category],
                  ['가격대', activeBrief.priceRange],
                  ['타깃', activeBrief.target],
                  ['톤앤매너', activeBrief.toneManner],
                  ['개발 방향', activeBrief.developmentDirection],
                  ['브랜드 개요', activeBrief.overview],
                  ['포지셔닝', activeBrief.positioning],
                  ['경쟁 맥락', activeBrief.competitiveContext ?? activeBrief.competitors],
                ].filter(([, value]) => !!value).map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid rgba(17,17,17,.1)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 7 }}>{label}</div>
                    <div style={{ fontSize: 14, color: '#222222', lineHeight: 1.72 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid rgba(17,17,17,.1)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 9 }}>핵심 가치</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {activeBrief.keywords.map((keyword) => (
                      <span key={keyword} style={{ border: '1px solid rgba(17,17,17,.14)', background: '#f3f4f6', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: '#111111', fontWeight: 800 }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ border: '1px solid rgba(17,17,17,.1)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800, marginBottom: 9 }}>적용 매체</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(activeBrief.applicationMedia ?? activeBrief.environments).map((media) => (
                      <span key={media} style={{ border: '1px solid rgba(17,17,17,.14)', background: '#f7f7f7', borderRadius: 999, padding: '6px 10px', fontSize: 12, color: '#333333', fontWeight: 700 }}>
                        {media}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <button
              onClick={() => {
                setStep('instruction')
                logEvent('brief_review_complete', {
                  condition: activeAssignment.condition,
                  conditionLabel: activeAssignment.conditionLabel,
                  setId: activeAssignment.setId,
                  detail: '브랜드 브리프 확인 완료',
                  payload: {
                    brief_code: activeAssignment.setBriefCode,
                    brand_name: activeBrief.name,
                  },
                })
              }}
              style={{ justifySelf: 'end', border: 'none', background: currentConditionColor, color: '#ffffff', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              조건 안내 확인하기
            </button>
          </div>
        )}

        {showInstruction && (
          <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 16, background: currentConditionSurface }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: currentConditionColor, marginBottom: 8 }}>
                조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#111111', marginBottom: 8 }}>
                Set {activeAssignment.setId} 실험 안내
              </div>
              <div style={{ fontSize: 13, color: '#333333', lineHeight: 1.75, marginBottom: 12 }}>
                본 실험에서는 동일한 브랜드 브리프를 기준으로, AI 판단 정보 제시 범위가 다른 3가지 조건을 순차적으로 수행합니다.<br />
                각 조건에서는 9개의 로고 시안을 검토하며, 조건에 따라 AI 추천 정보 또는 AI 평가 점수·순위 정보가 함께 제시될 수 있습니다.<br />
                해당 AI 정보는 조건 간 비교와 자극 통제를 위해 사전에 구성된 정보일 수 있습니다.<br />
                본 실험에는 정답이 없으며, 실제 실무에서 로고 시안 후보를 검토하듯이 판단해 주세요.
              </div>
              <div style={{ fontSize: 13, color: '#333333', lineHeight: 1.75, marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: '#111111' }}>실험 순서</span><br />
                <span style={{ fontWeight: 600 }}>1단계</span> : 브랜드 브리프와 판단 기준을 참고하여, 더 검토할 가능성이 있는 시안은 <span style={{ fontWeight: 600 }}>&apos;후보 유지&apos;</span>로, 더 이상 검토하지 않을 시안은 <span style={{ fontWeight: 600 }}>&apos;제외&apos;</span>로 분류해 주세요.<br />
                <span style={{ fontWeight: 600 }}>2단계</span> : &apos;후보 유지&apos;한 시안만 상세 평가를 진행해 주시고 비교하시면서 1개의 적합한 로고 시안을 최종 선택합니다.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {assignments.map((assignment, idx) => {
                  const isActive = idx === currentConditionIndex
                  const conditionStyle = INSTRUCTION_CONDITION_STYLE[assignment.conditionLabel]
                  return (
                    <div
                      key={`${assignment.conditionLabel}-${assignment.setId}-${idx}`}
                      style={{
                        border: '1px solid rgba(17,17,17,.14)',
                        background: conditionStyle.surface,
                        borderRadius: 10,
                        padding: 8,
                        minHeight: 142,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          border: `1px solid ${conditionStyle.border}`,
                          background: conditionStyle.button,
                          color: '#ffffff',
                          borderRadius: 8,
                          padding: '8px 8px',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'default',
                          textAlign: 'left',
                        }}
                      >
                        {idx + 1}. {assignment.conditionLabel}
                      </div>
                      <ul style={{ margin: '9px 0 0', paddingLeft: 18, color: conditionStyle.text, lineHeight: 1.65, fontSize: 12 }}>
                        {CONDITION_GUIDES[assignment.condition].map((line) => (
                          <li key={`${assignment.condition}-${line}`}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={startCondition}
              style={{ justifySelf: 'end', border: 'none', background: currentConditionColor, color: '#ffffff', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              조건 시작
            </button>
          </div>
        )}

        {showEvaluation && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(620px, 1fr) 620px', gap: 14, height: 'calc(100vh - 96px)', overflow: 'hidden' }}>
            <aside style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff', overflow: 'auto' }}>
              <div style={{ fontSize: 12, color: currentConditionColor, fontWeight: 800, marginBottom: 8 }}>
                조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
              </div>
              <div style={{ fontSize: 13, color: '#4d4d4d', lineHeight: 1.72, display: 'grid', gap: 9 }}>
                <div><strong>브랜드명:</strong> {displayedBrief?.name}</div>
                <div><strong>업종:</strong> {displayedBrief?.category}</div>
                <div><strong>포지셔닝:</strong> {displayedBrief?.positioning}</div>
                <div><strong>가치 키워드:</strong> {displayedBrief?.keywords.join(', ')}</div>
                <div><strong>타깃 고객:</strong> {displayedBrief?.target}</div>
                <div><strong>경쟁사 시각 특징:</strong> {displayedBrief?.competitors}</div>
                <div><strong>적용 환경:</strong> {displayedBrief?.environments.join(', ')}</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(17,17,17,.16)', margin: '14px 0 10px' }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 8 }}>
                판단 기준 안내
              </div>
              <div style={{ fontSize: 13, color: '#4d4d4d', lineHeight: 1.72, display: 'grid', gap: 8 }}>
                {AXIS_LABELS.map((axis, idx) => (
                  <div key={`brief-axis-${axis.id}`}>
                    <strong>{idx + 1}. {axis.name}</strong> - {axis.desc}
                  </div>
                ))}
              </div>
            </aside>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {assignments.map((assignment, idx) => {
                  const isActive = idx === currentConditionIndex
                  const isCompleted = idx < currentConditionIndex
                  const isFuture = idx > currentConditionIndex
                  const tabColor = CONDITION_COLOR[assignment.conditionLabel]
                  return (
                    <button
                      key={`eval-tab-${assignment.conditionLabel}-${assignment.setId}-${idx}`}
                      onClick={() => { if (isActive) switchConditionTab(idx) }}
                      disabled={isCompleted || isFuture}
                      style={{
                        border: isActive
                          ? `1px solid ${tabColor}`
                          : isCompleted
                            ? '1px solid rgba(17,17,17,.1)'
                            : '1px solid rgba(17,17,17,.1)',
                        background: isActive ? tabColor : isCompleted ? '#e8e8e8' : '#f4f4f4',
                        color: isActive ? '#ffffff' : isCompleted ? '#999999' : '#bbbbbb',
                        borderRadius: 10,
                        padding: '9px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        textAlign: 'center',
                        opacity: isCompleted ? 0.6 : isFuture ? 0.45 : 1,
                      }}
                    >
                      {isCompleted ? `${assignment.conditionLabel} ✓` : assignment.conditionLabel}
                    </button>
                  )
                })}
              </div>
              {!hasGenerated ? (
                <div style={{ flex: 1, minHeight: 520, border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, display: 'grid', placeItems: 'start center', paddingTop: 36, background: '#ffffff' }}>
                  <button
                    onClick={generateLogos}
                    disabled={isGenerating}
                    style={{ border: 'none', background: isGenerating ? '#9ca3af' : currentConditionColor, color: '#ffffff', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 800, cursor: isGenerating ? 'not-allowed' : 'pointer', minWidth: 220 }}
                  >
                    {isGenerating ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className='ai-thinking-orbit' style={{ width: 18, height: 18, borderWidth: 2 }}>
                          <span className='ai-thinking-core' style={{ fontSize: 6 }}>AI</span>
                        </span>
                        AI 로고 시안 생성중...
                      </span>
                    ) : 'AI 로고 시안 생성하기'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, overflow: 'auto', paddingRight: 2, flex: 1, minHeight: 0, alignContent: 'start', alignItems: 'start' }}>
                  {visibleCards.map((card) => {
                    const isActive = activeStimulusId === card.stimulus.id
                    const isDecided = !!card.initialDecision
                    const isCollab = activeAssignment.condition === 'collab'
                    const isAiCond = activeAssignment.condition === 'ai'
                    const isRecommended = toRecommended(card.stimulus)
                    const showBadge = (isCollab || isAiCond) && isRecommended
                    const aiRank = card.stimulus.aiRank ?? null
                    const displayRank = aiRank ?? card.displayOrder
                    const aiVisualText = AI_VISUAL_EVALUATION_TEXT[displayRank] ?? ''

                    const cardBorder = isActive
                      ? `2px solid ${currentConditionColor}`
                      : showBadge && !isAiCond
                        ? '1.5px solid rgba(17,17,17,.6)'
                        : isAiCond
                          ? '1px solid rgba(17,17,17,.18)'
                          : '1px solid rgba(17,17,17,.14)'

                    return (
                      <div
                        key={card.stimulus.id}
                        onClick={() => { setActiveStimulusId(card.stimulus.id) }}
                        data-click-log={`시안 카드 선택:${card.stimulus.id}`}
                        data-stimulus-id={card.stimulus.id}
                        style={{ border: cardBorder, borderRadius: 12, background: '#ffffff', padding: 8, cursor: 'pointer' }}
                      >
                        {/* 평가 제시형: 상단에 AI 순위와 짧은 시각 평가 설명 */}
                        {isAiCond && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, background: '#6b7280', borderRadius: 8, padding: '7px 8px', minHeight: 34 }}>
                            <div style={{ flexShrink: 0, fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '-.03em' }}>
                              {displayRank}위
                            </div>
                            <div style={{ minWidth: 0, flex: 1, fontSize: 10.5, fontWeight: 700, color: '#f9fafb', lineHeight: 1.35, wordBreak: 'keep-all' }}>
                              {aiVisualText}
                            </div>
                          </div>
                        )}

                        {/* 추천 제시형: 상단 ID + 배지 행 */}
                        {!isAiCond && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#333333' }}>
                              시안 ID {card.stimulus.id}
                            </div>
                            {showBadge && (
                              <div style={{ background: '#111111', color: '#ffffff', borderRadius: 999, padding: '3px 9px', fontSize: 11, fontWeight: 800, letterSpacing: '.02em' }}>
                                AI 추천
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.08)', display: 'grid', placeItems: 'center', marginBottom: 8, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />


                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); requestInitialDecision(card.stimulus.id, '보류') }}
                            aria-disabled={isDecided}
                            aria-pressed={card.initialDecision === '보류'}
                            className={`btn-interact btn-hold btn-choice ${card.initialDecision === '보류' ? 'btn-selected' : ''}`}
                            style={{ border: '1px solid rgba(75,85,99,.45)', background: card.initialDecision === '보류' ? '#4b5563' : '#f3f4f6', color: card.initialDecision === '보류' ? '#ffffff' : '#111827', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: isDecided ? 'not-allowed' : 'pointer', opacity: isDecided && card.initialDecision !== '보류' ? .45 : 1 }}
                          >
                            후보유지
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); requestInitialDecision(card.stimulus.id, '제외') }}
                            aria-disabled={isDecided}
                            aria-pressed={card.initialDecision === '제외'}
                            className={`btn-interact btn-exclude btn-choice ${card.initialDecision === '제외' ? 'btn-selected' : ''}`}
                            style={{ border: '1px solid rgba(107,114,128,.45)', background: card.initialDecision === '제외' ? '#6b7280' : '#f3f4f6', color: card.initialDecision === '제외' ? '#ffffff' : '#1f2937', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: isDecided ? 'not-allowed' : 'pointer', opacity: isDecided && card.initialDecision !== '제외' ? .45 : 1 }}
                          >
                            제외
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {isGenerating && visibleGeneratedCount < cards.length && (
                    <div
                      aria-live='polite'
                      style={{ border: '1px dashed rgba(17,17,17,.24)', borderRadius: 12, background: '#fafafa', padding: 8, minHeight: 220, display: 'grid', placeItems: 'center' }}
                    >
                      <div style={{ display: 'grid', placeItems: 'center', gap: 10, color: '#4b5563', textAlign: 'center' }}>
                        <span className='ai-thinking-orbit' style={{ width: 38, height: 38, borderWidth: 2 }}>
                          <span className='ai-thinking-core' style={{ fontSize: 9 }}>AI</span>
                        </span>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#111111' }}>AI 로고 시안 생성중...</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>시안 {Math.min(visibleGeneratedCount + 1, cards.length)} / {cards.length} 준비 중</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </section>

            <aside style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, background: '#ffffff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(17,17,17,.1)' }}>
                {[
                  { id: 'hold' as RightTab, label: `후보유지 (${initialHoldCards.length})` },
                  { id: 'exclude' as RightTab, label: `제외 (${initialExcludeCards.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    style={{
                      border: 'none',
                      borderBottom: `2px solid ${rightTab === tab.id ? currentConditionColor : 'transparent'}`,
                      background: rightTab === tab.id ? 'rgba(17,17,17,.04)' : '#ffffff',
                      color: rightTab === tab.id ? '#111111' : '#666666',
                      padding: '10px 6px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
                {rightTab === 'hold' && (
                  initialHoldCards.length === 0 ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12 }}>
                      후보유지 시안이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ border: '1px solid rgba(17,17,17,.14)', background: '#f9fafb', color: '#111827', borderRadius: 8, padding: '9px 10px', fontSize: 12, fontWeight: 700, lineHeight: 1.55 }}>
                        최종 시안은 1개만 선택할 수 있습니다. 후보유지 시안을 비교한 뒤 가장 적합한 1개를 최종선택해 주세요.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                        {initialHoldCards.map((card) => {
                          const cardDetailNotice = detailNotice?.stimulusId === card.stimulus.id ? detailNotice.message : ''
                          return (
                            <div
                              key={`hold-${card.stimulus.id}`}
                              style={{ border: `1px solid ${finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : 'rgba(17,17,17,.14)'}`, background: '#ffffff', borderRadius: 8, padding: '8px 9px', opacity: finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? 0.4 : 1, pointerEvents: (finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? 'none' : 'auto') as React.CSSProperties['pointerEvents'], transition: 'opacity 0.2s' }}
                            >
                            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.07)', display: 'grid', placeItems: 'center', marginBottom: 7, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111111', marginBottom: 1 }}>
                              {card.stimulus.id}{activeAssignment.condition === 'ai' ? ` · ${card.stimulus.name}` : ''}
                            </div>
                            {activeAssignment.condition === 'ai' && (
                              <div style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>{card.stimulus.meta}</div>
                            )}

                            <div style={{ borderTop: '1px solid rgba(17,17,17,.08)', paddingTop: 8, position: 'relative' }}>
                              {!allInitialCompleted && (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,.88)', borderRadius: 6, display: 'grid', placeItems: 'center', padding: 8 }}>
                                  <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
                                    9개 시안을 모두<br />후보유지 또는 제외로<br />분류한 후 평가할 수 있습니다.
                                  </div>
                                </div>
                              )}
                              <div style={{ display: 'grid', gap: 8, pointerEvents: allInitialCompleted ? 'auto' : 'none' }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#333333', marginBottom: 4 }}>
                                  1. 브랜드 종합 적합도
                                </div>
                                <div style={{ fontSize: 13, color: '#666666', marginBottom: 5 }}>이 로고 시안이 브랜드 브리프에 얼마나 적합한가?</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <button
                                      key={`${card.stimulus.id}-hold-brand-${v}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'brand', v)}
                                      style={{ border: `1px solid ${card.brandOverallScore === v ? currentConditionColor : 'rgba(17,17,17,.18)'}`, background: card.brandOverallScore === v ? currentConditionColor : '#ffffff', color: card.brandOverallScore === v ? '#ffffff' : '#333333', borderRadius: 5, padding: '4px 0', fontSize: 15, fontWeight: card.brandOverallScore === v ? 800 : 500, cursor: 'pointer' }}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#333333', marginBottom: 4 }}>
                                  2. 시각 종합 완성도
                                </div>
                                <div style={{ fontSize: 13, color: '#666666', marginBottom: 5 }}>이 로고 시안이 시각적으로 얼마나 완성도 있는가?</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <button
                                      key={`${card.stimulus.id}-hold-visual-${v}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'visual', v)}
                                      style={{ border: `1px solid ${card.visualOverallScore === v ? currentConditionColor : 'rgba(17,17,17,.18)'}`, background: card.visualOverallScore === v ? currentConditionColor : '#ffffff', color: card.visualOverallScore === v ? '#ffffff' : '#333333', borderRadius: 5, padding: '4px 0', fontSize: 15, fontWeight: card.visualOverallScore === v ? 800 : 500, cursor: 'pointer' }}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#333333', marginBottom: 3 }}>
                                  3. 주된 판단 기준 <span style={{ fontWeight: 400, color: '#888888' }}>(2개 선택)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 3, marginBottom: cardDetailNotice ? 5 : 0 }}>
                                  {MAIN_JUDGMENT_CRITERIA.map((criterion) => {
                                    const selected = card.mainJudgmentCriteria.includes(criterion)
                                    const atMax = card.mainJudgmentCriteria.length >= 2 && !selected
                                    return (
                                      <button
                                        key={`${card.stimulus.id}-hold-criterion-${criterion}`}
                                        onClick={() => toggleMainJudgmentCriterion(card.stimulus.id, criterion)}
                                        style={{ border: `1px solid ${selected ? currentConditionColor : 'rgba(17,17,17,.15)'}`, background: selected ? currentConditionColor : atMax ? '#f5f5f5' : '#ffffff', color: selected ? '#ffffff' : atMax ? '#aaaaaa' : '#333333', borderRadius: 999, padding: '5px 4px', fontSize: 13, fontWeight: selected ? 800 : 500, cursor: 'pointer' }}
                                      >
                                        {criterion}
                                      </button>
                                    )
                                  })}
                                </div>
                                {cardDetailNotice && (
                                  <div style={{ fontSize: 14, color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '5px 7px', lineHeight: 1.5 }}>
                                    {cardDetailNotice}
                                  </div>
                                )}
                              </div>
                              </div>
                            </div>

                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <button
                                onClick={() => cancelInitialDecision(card.stimulus.id)}
                                className='btn-interact btn-hold'
                                style={{ border: '1px solid rgba(75,85,99,.3)', background: '#ffffff', color: '#333333', borderRadius: 7, padding: '6px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                              >
                                후보유지 취소
                              </button>
                              <button
                                onClick={() => {
                                  if (finalSelectedStimulusId === card.stimulus.id) {
                                    setFinalSelectedStimulusId(null)
                                    setFinalSelectionTs(null)
                                    setShowFinalModal(false)
                                  } else {
                                    const target = cards.find((c) => c.stimulus.id === card.stimulus.id)
                                    if (target && isDetailEvaluationComplete(target)) {
                                      const didSelectFinal = selectFinal(card.stimulus.id)
                                      if (didSelectFinal) setShowFinalModal(true)
                                    } else {
                                      selectFinal(card.stimulus.id)
                                    }
                                  }
                                }}
                                className='btn-interact btn-final'
                                style={{ border: `1px solid ${finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : 'rgba(17,17,17,.3)'}`, background: finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : '#f3f4f6', color: finalSelectedStimulusId === card.stimulus.id ? '#ffffff' : '#111827', borderRadius: 7, padding: '6px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                              >
                                {finalSelectedStimulusId === card.stimulus.id ? '최종선택 ✓' : '최종선택'}
                              </button>
                            </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                )}

                {rightTab === 'exclude' && (
                  initialExcludeCards.length === 0 ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12 }}>
                      제외 시안이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                      {initialExcludeCards.map((card) => (
                        <div
                          key={`exclude-${card.stimulus.id}`}
                          style={{ border: '1px solid rgba(17,17,17,.14)', background: '#ffffff', borderRadius: 8, padding: '8px 9px' }}
                        >
                          <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.07)', display: 'grid', placeItems: 'center', marginBottom: 7, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />
                          <button
                            onClick={() => {
                              setActiveStimulusId(card.stimulus.id)
                            }}
                            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#111111' }}>
                              {card.stimulus.id}
                              {activeAssignment.condition === 'ai' ? ` · ${card.stimulus.name}` : ''}
                            </div>
                            {activeAssignment.condition === 'ai' && (
                              <div style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>{card.stimulus.meta}</div>
                            )}
                          </button>
                          <div style={{ marginTop: 7 }}>
                            <button
                              onClick={() => cancelInitialDecision(card.stimulus.id)}
                              className='btn-interact btn-exclude'
                              style={{ width: '100%', border: '1px solid rgba(107,114,128,.3)', background: '#ffffff', color: '#333333', borderRadius: 7, padding: '6px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                            >
                              제외취소
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </aside>
          </div>
        )}

        {showResult && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 12, background: currentConditionSurface }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: currentConditionColor, marginBottom: 4 }}>
                조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
              </div>
              <div style={{ fontSize: 12, color: '#333333' }}>
                후보유지/제외 영역 내부 자동 순위는 브랜드 종합 적합도와 시각 종합 완성도 기준입니다. 상세 평가와 영역 이동 후 순위가 즉시 업데이트됩니다.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'hold', title: `후보유지 영역 (${holdCards.length})`, cards: holdCards, color: '#111827', bg: '#f7f7f7', move: '후보유지→제외' as const },
                { key: 'exclude', title: `제외 영역 (${excludeCards.length})`, cards: excludeCards, color: '#1f2937', bg: '#f5f5f5', move: '제외→후보유지 복원' as const },
              ].map((bucket) => (
                <div key={bucket.key} style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 12, background: bucket.bg }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(17,17,17,.12)', fontSize: 14, fontWeight: 800, color: bucket.color }}>
                    {bucket.title}
                  </div>
                  <div style={{ padding: 10, display: 'grid', gap: 8 }}>
                    {bucket.cards.length === 0 && (
                      <div style={{ fontSize: 12, color: '#666666' }}>해당 시안이 없습니다.</div>
                    )}
                    {bucket.cards.map((card, idx) => {
                      const metrics = getCardDisplayMetrics(card)
                      const editing = editingCardId === card.stimulus.id
                      const moveDecision: DecisionType = bucket.key === 'hold' ? '제외' : '보류'
                      const detailComplete = isDetailEvaluationComplete(card)
                      const cardDetailNotice = detailNotice?.stimulusId === card.stimulus.id ? detailNotice.message : ''
                      const finalButtonLabel = finalSelectedStimulusId === card.stimulus.id
                        ? '최종선택 유지'
                        : finalSelectedStimulusId
                          ? '최종선택 변경'
                          : '최종선택'

                      return (
                        <div key={`${bucket.key}-${card.stimulus.id}`} style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, background: '#ffffff', padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#333333' }}>{idx + 1}위 · {card.stimulus.id}</div>
                            <div style={{ fontSize: 12, color: '#111111', fontWeight: 700 }}>
                              {metrics ? `${metrics.total.toFixed(2)}점 (${metrics.score100.toFixed(1)})` : '상세 평가 전'}
                            </div>
                          </div>
                          {activeAssignment.condition === 'ai' && (
                            <div style={{ fontSize: 12, color: '#4d4d4d', marginBottom: 6 }}>{card.stimulus.name}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontSize: 10, border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '2px 6px', color: '#333333' }}>
                              브랜드 종합 적합도: {card.brandOverallScore ? `${card.brandOverallScore}점` : '미입력'}
                            </span>
                            <span style={{ fontSize: 10, border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '2px 6px', color: '#333333' }}>
                              시각 종합 완성도: {card.visualOverallScore ? `${card.visualOverallScore}점` : '미입력'}
                            </span>
                            <span style={{ fontSize: 10, border: `1px solid ${detailComplete ? 'rgba(17,17,17,.2)' : 'rgba(107,114,128,.28)'}`, borderRadius: 999, padding: '2px 6px', color: detailComplete ? '#111111' : '#6b7280', background: detailComplete ? '#ffffff' : '#f5f5f5' }}>
                              주된 판단 기준: {card.mainJudgmentCriteria.length > 0 ? card.mainJudgmentCriteria.join(', ') : '미선택'}
                            </span>
                          </div>

                          {editing && (
                            <div style={{ display: 'grid', gap: 8, marginBottom: 8, border: '1px solid rgba(17,17,17,.1)', borderRadius: 8, padding: 8 }}>
                              <div style={{ border: '1px solid rgba(17,17,17,.08)', borderRadius: 8, padding: 8, background: '#fafafa', fontSize: 11, color: '#333333', lineHeight: 1.6 }}>
                                아래 8개 항목은 각각 점수를 매기는 항목이 아니라, 방금 입력한 종합 점수의 주된 판단 근거를 선택하는 항목입니다.
                              </div>

                              <div style={{ border: '1px solid rgba(17,17,17,.08)', borderRadius: 8, padding: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 6 }}>브랜드 종합 적합도</div>
                                <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                                  {BRAND_SUMMARY_REFERENCES.map((item, refIdx) => (
                                    <div key={`${card.stimulus.id}-brand-ref-${item.label}`} style={{ fontSize: 10, color: '#4d4d4d', lineHeight: 1.45 }}>
                                      {refIdx + 1}. {item.label}({item.source}) - {item.desc}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#333333', marginBottom: 6 }}>
                                  이 로고 시안이 브랜드 브리프에 얼마나 적합하다고 판단되는가?
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 4 }}>
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                      key={`${card.stimulus.id}-brand-overall-${value}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'brand', value)}
                                      className={`btn-choice ${card.brandOverallScore === value ? 'btn-selected' : ''}`}
                                      style={{ border: `1px solid ${card.brandOverallScore === value ? currentConditionColor : 'rgba(17,17,17,.2)'}`, background: card.brandOverallScore === value ? currentConditionColor : '#ffffff', color: card.brandOverallScore === value ? '#ffffff' : '#333333', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: card.brandOverallScore === value ? 800 : 600, cursor: 'pointer' }}
                                    >
                                      {value}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div style={{ border: '1px solid rgba(17,17,17,.08)', borderRadius: 8, padding: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 6 }}>시각 종합 완성도</div>
                                <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                                  {VISUAL_SUMMARY_REFERENCES.map((item, refIdx) => (
                                    <div key={`${card.stimulus.id}-visual-ref-${item.label}`} style={{ fontSize: 10, color: '#4d4d4d', lineHeight: 1.45 }}>
                                      {refIdx + 6}. {item.label}({item.source}) - {item.desc}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#333333', marginBottom: 6 }}>
                                  이 로고 시안이 시각적으로 얼마나 완성도 있다고 판단되는가?
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 4 }}>
                                  {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                      key={`${card.stimulus.id}-visual-overall-${value}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'visual', value)}
                                      className={`btn-choice ${card.visualOverallScore === value ? 'btn-selected' : ''}`}
                                      style={{ border: `1px solid ${card.visualOverallScore === value ? currentConditionColor : 'rgba(17,17,17,.2)'}`, background: card.visualOverallScore === value ? currentConditionColor : '#ffffff', color: card.visualOverallScore === value ? '#ffffff' : '#333333', borderRadius: 6, padding: '5px 0', fontSize: 11, fontWeight: card.visualOverallScore === value ? 800 : 600, cursor: 'pointer' }}
                                    >
                                      {value}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div style={{ border: '1px solid rgba(17,17,17,.08)', borderRadius: 8, padding: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 4 }}>주된 판단 기준</div>
                                <div style={{ fontSize: 10, color: '#666666', lineHeight: 1.5, marginBottom: 7 }}>
                                  판단에 가장 크게 영향을 준 기준을 최소 1개, 최대 2개 선택해 주세요.
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 5 }}>
                                  {MAIN_JUDGMENT_CRITERIA.map((criterion) => {
                                    const selected = card.mainJudgmentCriteria.includes(criterion)
                                    return (
                                      <button
                                        key={`${card.stimulus.id}-criterion-${criterion}`}
                                        onClick={() => toggleMainJudgmentCriterion(card.stimulus.id, criterion)}
                                        className={`btn-choice ${selected ? 'btn-selected' : ''}`}
                                        style={{ border: `1px solid ${selected ? currentConditionColor : 'rgba(17,17,17,.16)'}`, background: selected ? currentConditionColor : '#ffffff', color: selected ? '#ffffff' : '#333333', borderRadius: 999, padding: '6px 8px', fontSize: 10, fontWeight: selected ? 800 : 600, cursor: 'pointer' }}
                                      >
                                        {criterion}
                                      </button>
                                    )
                                  })}
                                </div>
                                {cardDetailNotice && (
                                  <div style={{ marginTop: 7, fontSize: 10, color: '#4b5563', lineHeight: 1.5 }}>
                                    {cardDetailNotice}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            <button
                              onClick={() => { if (allInitialCompleted) setEditingCardId(editing ? null : card.stimulus.id) }}
                              disabled={!allInitialCompleted && !editing}
                              title={!allInitialCompleted ? '9개 시안 모두 후보유지/제외 분류 후 활성화됩니다.' : undefined}
                              className={`btn-interact ${editing ? 'btn-final btn-selected' : ''}`}
                              style={{ border: `1px solid ${!allInitialCompleted && !editing ? 'rgba(220,38,38,.5)' : 'rgba(17,17,17,.2)'}`, background: editing ? '#111827' : !allInitialCompleted ? '#fff5f5' : '#ffffff', color: editing ? '#ffffff' : !allInitialCompleted ? '#b91c1c' : '#333333', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: allInitialCompleted || editing ? 'pointer' : 'not-allowed', opacity: !allInitialCompleted && !editing ? 0.75 : 1 }}
                            >
                              {editing ? '상세 평가 닫기' : '상세 평가'}
                            </button>
                            <button
                              onClick={() => updateFinalDecision(card.stimulus.id, moveDecision)}
                              className={`btn-interact ${bucket.key === 'hold' ? 'btn-exclude' : 'btn-hold'}`}
                              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#f7f7f7', color: '#333333', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {bucket.move}
                            </button>
                            <button
                              onClick={() => selectFinal(card.stimulus.id)}
                              className={`btn-interact btn-final ${finalSelectedStimulusId === card.stimulus.id ? 'btn-selected' : ''}`}
                              style={{ border: '1px solid rgba(17,17,17,.35)', background: finalSelectedStimulusId === card.stimulus.id ? '#111827' : detailComplete ? '#f3f4f6' : '#ffffff', color: finalSelectedStimulusId === card.stimulus.id ? '#ffffff' : '#111827', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                            >
                              {finalButtonLabel}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#4d4d4d' }}>
                {finalSelectedStimulusId ? `최종선택 완료: ${finalSelectedStimulusId}` : '최종선택을 1개 지정해야 다음 조건으로 이동할 수 있습니다.'}
              </div>
              <button
                onClick={moveToNextCondition}
                disabled={!finalSelectedStimulusId}
                style={{ border: 'none', background: finalSelectedStimulusId ? currentConditionColor : '#d1d5db', color: finalSelectedStimulusId ? '#ffffff' : '#6b7280', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: finalSelectedStimulusId ? 'pointer' : 'not-allowed' }}
              >
                {currentConditionIndex >= assignments.length - 1 ? '최종 선택 1개 확정 및 전체 완료' : '최종 선택 1개 확정 후 다음 조건'}
              </button>
            </div>
          </div>
        )}

        {showPostSurvey && activeAssignment && (() => {
          const cond = activeAssignment.condition
          const needsCollab = cond === 'collab'
          const needsAiOnly = cond === 'ai'
          const likertQuestions = [
            ...POST_SURVEY_COMMON,
            ...(needsCollab ? POST_SURVEY_COLLAB : []),
            ...(needsAiOnly ? POST_SURVEY_AI_ONLY : []),
          ]
          return (
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 0, padding: '24px 0 48px' }}>
              <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 20, background: currentConditionSurface, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: currentConditionColor, marginBottom: 6 }}>
                  조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>조건별 사후 설문</div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>

                {/* 조작 점검 — 단일선택 */}
                <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.55 }}>
                    이번 단계에서 로고 시안과 함께 제공된 AI 관련 정보는 무엇이었다고 기억하십니까?
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {POST_SURVEY_INFO_TYPE_OPTIONS.map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => setPostSurveyAnswers((prev) => ({ ...prev, infoType: value }))}
                        style={{
                          border: `1px solid ${postSurveyAnswers.infoType === value ? '#111111' : 'rgba(17,17,17,.18)'}`,
                          background: postSurveyAnswers.infoType === value ? '#111111' : '#ffffff',
                          color: postSurveyAnswers.infoType === value ? '#ffffff' : '#333333',
                          borderRadius: 8, padding: '9px 14px', fontSize: 13,
                          fontWeight: postSurveyAnswers.infoType === value ? 700 : 400,
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >{label}</button>
                    ))}
                  </div>
                </div>

                {/* Q3–Q8: 리커트 5점 척도 */}
                {likertQuestions.map(({ key, text }) => {
                  const val = postSurveyAnswers[key] as number | null
                  return (
                    <div key={key} style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.55 }}>{text}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => setPostSurveyAnswers((prev) => ({ ...prev, [key]: v }))}
                            style={{
                              flex: 1, border: `1px solid ${val === v ? '#111111' : 'rgba(17,17,17,.18)'}`,
                              background: val === v ? '#111111' : '#ffffff',
                              color: val === v ? '#ffffff' : '#333333',
                              borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: val === v ? 700 : 400, cursor: 'pointer',
                            }}
                          >{v}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>1 전혀 그렇지 않다</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>5 매우 그렇다</span>
                      </div>
                    </div>
                  )
                })}

                <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 4 }}>
                    이번 단계에서 가장 판단하기 어려웠던 점이 있다면 간단히 적어 주세요.
                  </div>
                  <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>필수 입력</div>
                  <textarea
                    value={postSurveyAnswers.freeText}
                    onChange={(e) => setPostSurveyAnswers((prev) => ({ ...prev, freeText: e.target.value }))}
                    placeholder='자유롭게 입력해 주세요.'
                    rows={3}
                    style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {postSurveyError && (
                  <div style={{ border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                    {postSurveyError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={submitPostSurvey}
                    style={{ border: 'none', background: currentConditionColor, color: '#ffffff', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {currentConditionIndex < assignments.length - 1 ? '저장 후 다음 조건' : '저장 후 비교 설문'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {showCompSurvey && (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 0, padding: '24px 0 48px' }}>
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 20, background: '#f7f7f7', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4d4d4d', marginBottom: 6 }}>전체 조건 완료</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>전체 조건 비교 설문</div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {COMP_QUESTIONS.map(({ key, text, options }) => {
                const val = compSurveyAnswers[key]
                return (
                  <div key={key} style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 10 }}>{text}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCompSurveyAnswers((prev) => ({ ...prev, [key]: opt }))}
                          style={{
                            border: `1px solid ${val === opt ? '#111111' : 'rgba(17,17,17,.18)'}`,
                            background: val === opt ? '#111111' : '#ffffff',
                            color: val === opt ? '#ffffff' : '#333333',
                            borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: val === opt ? 700 : 400, cursor: 'pointer',
                          }}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 4 }}>
                  위와 같이 응답한 이유나, 조건 간 차이에 대해 느낀 점이 있다면 자유롭게 작성해 주세요.
                </div>
                <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>필수 입력</div>
                <textarea
                  value={compSurveyAnswers.freeText}
                  onChange={(e) => setCompSurveyAnswers((prev) => ({ ...prev, freeText: e.target.value }))}
                  placeholder='자유롭게 입력해 주세요.'
                  rows={3}
                  style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {compSurveyError && (
                <div style={{ border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                  {compSurveyError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={submitCompSurvey}
                  style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  저장 후 다음 단계
                </button>
              </div>
            </div>
          </div>
        )}

        {showDebriefCheck && (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 0, padding: '24px 0 48px' }}>
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 20, background: '#f7f7f7', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4d4d4d', marginBottom: 6 }}>실험 종료 전 확인</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>AI 정보 인식 확인</div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {/* Q1: 단일선택 */}
              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.6 }}>
                  실험 중 제시된 AI 추천 또는 AI 평가 순위·설명의 구성 방식에 대해 어떻게 이해하셨습니까?
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {DEBRIEF_SOURCE_UNDERSTANDING_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setDebriefCheckAnswers((prev) => ({ ...prev, sourceUnderstanding: value }))}
                      style={{
                        border: `1px solid ${debriefCheckAnswers.sourceUnderstanding === value ? '#111111' : 'rgba(17,17,17,.18)'}`,
                        background: debriefCheckAnswers.sourceUnderstanding === value ? '#111111' : '#ffffff',
                        color: debriefCheckAnswers.sourceUnderstanding === value ? '#ffffff' : '#333333',
                        borderRadius: 8, padding: '9px 14px', fontSize: 13,
                        fontWeight: debriefCheckAnswers.sourceUnderstanding === value ? 700 : 400,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Q2: 5점 리커트 */}
              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.55 }}>
                  위와 같은 이해가 로고 시안 판단에 영향을 주었다고 생각하십니까?
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setDebriefCheckAnswers((prev) => ({ ...prev, sourceInfluence: v }))}
                      style={{
                        flex: 1, border: `1px solid ${debriefCheckAnswers.sourceInfluence === v ? '#111111' : 'rgba(17,17,17,.18)'}`,
                        background: debriefCheckAnswers.sourceInfluence === v ? '#111111' : '#ffffff',
                        color: debriefCheckAnswers.sourceInfluence === v ? '#ffffff' : '#333333',
                        borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: debriefCheckAnswers.sourceInfluence === v ? 700 : 400, cursor: 'pointer',
                      }}
                    >{v}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>1 전혀 그렇지 않다</span>
                  <span style={{ fontSize: 10, color: '#6b7280' }}>5 매우 그렇다</span>
                </div>
              </div>

              {/* Q3: 자유 응답 (선택) */}
              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 4 }}>
                  추가로 설명하고 싶은 내용이 있다면 작성해 주세요.
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>선택 입력</div>
                <textarea
                  value={debriefCheckAnswers.sourceComment}
                  onChange={(e) => setDebriefCheckAnswers((prev) => ({ ...prev, sourceComment: e.target.value }))}
                  placeholder='자유롭게 입력해 주세요.'
                  rows={3}
                  style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {debriefCheckError && (
                <div style={{ border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                  {debriefCheckError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={submitDebriefCheck}
                  style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  확인 후 다음 단계
                </button>
              </div>
            </div>
          </div>
        )}

        {showDebriefing && (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 14, padding: '24px 0 48px' }}>
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 24, background: '#f7f7f7' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4d4d4d', marginBottom: 6 }}>디브리핑</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#111111', marginBottom: 20, letterSpacing: '-.03em' }}>로고 시안 판단 과업이 완료되었습니다.</div>
              <div style={{ display: 'grid', gap: 16, fontSize: 14, lineHeight: 1.85, color: '#1f2937' }}>
                <p>
                  지금까지 진행한 로고 시안 판단 과업은 모두 완료되었습니다. 이후에는 연구대상자 자격 확인, 중도 철회 처리, 사례비 지급 연락을 위한 참가자 정보 입력 단계가 이어집니다.
                </p>
                <p>
                  본 연구는 생성형 AI 기반 브랜드 로고 디자인 환경에서 AI 판단 정보 유형이 전문 디자이너의 로고 시안 판단 과정에 어떤 영향을 미치는지 확인하기 위한 연구입니다.
                </p>
                <p>
                  본 실험에서 제시된 로고 시안은 실험 중 실시간으로 생성된 것이 아니라, 동일한 브랜드 브리프를 기준으로 사전에 제작된 실험 자극입니다. 시안 제작 과정에는 ChatGPT를 활용한 프롬프트 구성과 Midjourney 등 생성형 AI 이미지 도구를 활용한 이미지 생성 과정이 포함될 수 있습니다. 이후 실험에 적합하도록 시안 세트를 정리하여 제시하였습니다.
                </p>
                <p>
                  실험 중 제시된 AI 추천 정보와 AI 평가 순위·설명 역시 실시간 AI가 현장에서 산출한 정보가 아니라, 조건 간 비교와 자극 통제를 위해 사전에 구성된 정보입니다. 이는 참가자마다 서로 다른 AI 결과가 제시되는 것을 방지하고, 동일한 조건에서 판단 과정을 비교하기 위한 절차입니다.
                </p>
                <p>
                  AI 추천 및 평가 순위·설명은 연구자가 사전에 정리한 시각 평가 기준을 바탕으로 구성되었습니다. 기준은 자연성, 조화성, 정교성과 같은 시각적 특성이며, 브랜드 전략 전체를 평가한 최종 판단은 아닙니다.
                </p>
                <p>
                  따라서 AI 정보는 시각적 완성도에 가까운 판단 정보이며, 참가자가 수행한 브랜드 맥락 기반의 전문적 판단과 다를 수 있습니다.
                </p>
                <p>
                  본 연구의 목적은 AI가 더 우수한 로고를 생성했는지를 평가하는 것이 아닙니다. 연구의 목적은 AI 추천, AI 평가 순위, AI 평가 설명과 같은 판단 정보가 전문 디자이너의 후보 유지, 제외, 변경, 최종 선택 판단에 어떤 영향을 미치는지를 분석하는 데 있습니다.
                </p>
                <p>
                  수집된 실험자료는 참가자 코드로 가명처리되며, 성명, 이메일, 포트폴리오 등 개인을 식별할 수 있는 정보는 연구 결과에 포함되지 않습니다. 포트폴리오는 연구대상자 자격 확인 목적으로만 사용되며, 확인 후 폐기됩니다.
                </p>
                <p>
                  본 디브리핑 내용을 확인한 뒤 연구 참여 자료의 사용을 원하지 않는 경우, 연구책임자에게 철회를 요청할 수 있습니다. 철회를 요청하더라도 불이익은 없습니다.
                </p>
                <p>
                  연구 참여 중 궁금한 점이나 중도 철회, 개인정보 처리와 관련한 문의가 있는 경우 연구책임자에게 연락할 수 있습니다.
                </p>
                <p style={{ color: '#4b5563', fontSize: 13 }}>
                  아래 버튼을 누르면 연구대상자 자격 확인 및 사례비 지급 연락을 위한 참가자 정보 입력 단계로 이동합니다.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setPostExperimentAnswers(INITIAL_POST_EXPERIMENT)
                  setPostExperimentError('')
                  setPortfolioFile(null)
                  setPortfolioFileError('')
                  setStep('eligibility_collection')
                }}
                style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                확인 후 참가자 정보 입력으로 이동
              </button>
            </div>
          </div>
        )}

        {showEligibilityCollection && (
          <div style={{ minHeight: '100%', display: 'grid', placeItems: 'start center', padding: '42px 0 48px' }}>
            <section style={{ width: 'min(680px, 92vw)', background: '#ffffff', color: '#111111' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 10 }}>참가자 정보 입력</h1>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65 }}>
                  실험이 모두 완료되었습니다. 연구 대상자로 선정되신 분에게는 사례비 지급 및 분석을 위해 아래 정보를 입력해 주세요.<br />
                  입력하신 정보는 실험 데이터와 분리하여 보관되며, 연구 목적 외에는 사용되지 않습니다.
                </p>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 6 }}>이름 <span style={{ color: '#6b7280', fontWeight: 400 }}>(필수)</span></div>
                  <input
                    value={postExperimentAnswers.fullName}
                    onChange={(e) => setPostExperimentAnswers((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder='이름을 입력해 주세요.'
                    style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 8 }}>연령대 <span style={{ color: '#6b7280', fontWeight: 400 }}>(필수)</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['만 19~29세', '30~39세', '40~49세', '50~59세', '60세 이상'].map((opt) => (
                      <button key={opt}
                        onClick={() => setPostExperimentAnswers((prev) => ({ ...prev, ageGroup: opt }))}
                        style={{ border: `1px solid ${postExperimentAnswers.ageGroup === opt ? '#111111' : 'rgba(17,17,17,.18)'}`, background: postExperimentAnswers.ageGroup === opt ? '#111111' : '#ffffff', color: postExperimentAnswers.ageGroup === opt ? '#ffffff' : '#333333', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: postExperimentAnswers.ageGroup === opt ? 700 : 400, cursor: 'pointer' }}
                      >{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 6 }}>이메일 <span style={{ color: '#6b7280', fontWeight: 400 }}>(필수)</span></div>
                  <input
                    value={postExperimentAnswers.email}
                    onChange={(e) => setPostExperimentAnswers((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder='예: name@example.com'
                    type='email'
                    style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 8 }}>디자인 실무 경력</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['5년 미만', '5년 이상 ~ 10년 미만', '10년 이상 ~ 15년 미만', '15년 이상'].map((opt) => (
                      <button key={opt}
                        onClick={() => setPostExperimentAnswers((prev) => ({ ...prev, career: opt }))}
                        style={{ border: `1px solid ${postExperimentAnswers.career === opt ? '#111111' : 'rgba(17,17,17,.18)'}`, background: postExperimentAnswers.career === opt ? '#111111' : '#ffffff', color: postExperimentAnswers.career === opt ? '#ffffff' : '#333333', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: postExperimentAnswers.career === opt ? 700 : 400, cursor: 'pointer' }}
                      >{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 8 }}>브랜드 로고 / CI 프로젝트 경험</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['1~2건', '3~5건', '6~10건', '11건 이상'].map((opt) => (
                      <button key={opt}
                        onClick={() => setPostExperimentAnswers((prev) => ({ ...prev, logoProjects: opt }))}
                        style={{ border: `1px solid ${postExperimentAnswers.logoProjects === opt ? '#111111' : 'rgba(17,17,17,.18)'}`, background: postExperimentAnswers.logoProjects === opt ? '#111111' : '#ffffff', color: postExperimentAnswers.logoProjects === opt ? '#ffffff' : '#333333', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: postExperimentAnswers.logoProjects === opt ? 700 : 400, cursor: 'pointer' }}
                      >{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 8 }}>주요 실무 분야</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['브랜드 디자인', '시각디자인', '그래픽 디자인', 'BX 디자인', 'UI/UX 디자인', '편집디자인', '기타'].map((opt) => (
                      <button key={opt}
                        onClick={() => setPostExperimentAnswers((prev) => ({ ...prev, field: opt }))}
                        style={{ border: `1px solid ${postExperimentAnswers.field === opt ? '#111111' : 'rgba(17,17,17,.18)'}`, background: postExperimentAnswers.field === opt ? '#111111' : '#ffffff', color: postExperimentAnswers.field === opt ? '#ffffff' : '#333333', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: postExperimentAnswers.field === opt ? 700 : 400, cursor: 'pointer' }}
                      >{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 8 }}>생성형 AI 이미지 도구 사용 경험</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['없음', '1~2회', '가끔 사용', '자주 사용'].map((opt) => (
                      <button key={opt}
                        onClick={() => setPostExperimentAnswers((prev) => ({ ...prev, aiUse: opt }))}
                        style={{ border: `1px solid ${postExperimentAnswers.aiUse === opt ? '#111111' : 'rgba(17,17,17,.18)'}`, background: postExperimentAnswers.aiUse === opt ? '#111111' : '#ffffff', color: postExperimentAnswers.aiUse === opt ? '#ffffff' : '#333333', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: postExperimentAnswers.aiUse === opt ? 700 : 400, cursor: 'pointer' }}
                      >{opt}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#111111', marginBottom: 8 }}>
                    포트폴리오 URL 또는 파일 중 하나만 제출해 주세요. <span style={{ color: '#6b7280', fontWeight: 400 }}>(JPEG 또는 PDF, 10MB 이내)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    <div style={{ border: `1px solid ${postExperimentError.includes('포트폴리오') ? '#dc2626' : 'rgba(17,17,17,.16)'}`, borderRadius: 10, padding: 12, background: '#ffffff' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 8 }}>포트폴리오 URL</div>
                      <input
                        value={postExperimentAnswers.portfolioUrl}
                        onChange={(e) => {
                          setPostExperimentAnswers((prev) => ({ ...prev, portfolioUrl: e.target.value }))
                          if (postExperimentError.includes('포트폴리오')) setPostExperimentError('')
                        }}
                        placeholder='https://'
                        type='url'
                        style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ border: `1px solid ${portfolioFileError || postExperimentError.includes('포트폴리오') ? '#dc2626' : 'rgba(17,17,17,.16)'}`, borderRadius: 10, padding: 12, background: '#ffffff' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#111111', marginBottom: 8 }}>포트폴리오 파일</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', background: '#fafafa' }}>
                        <span style={{ flexShrink: 0, border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#111111' }}>파일 선택</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: portfolioFile ? '#111111' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {portfolioFile ? `${portfolioFile.name} (${(portfolioFile.size / 1024 / 1024).toFixed(1)} MB)` : '선택된 파일 없음'}
                        </span>
                        <input
                          ref={portfolioFileInputRef}
                          type='file'
                          accept='.jpg,.jpeg,.pdf'
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setPortfolioFileError('')
                            if (postExperimentError.includes('포트폴리오')) setPostExperimentError('')
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                setPortfolioFileError('파일 크기가 10MB를 초과합니다.')
                                e.target.value = ''
                                return
                              }
                              const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
                              if (!['jpg', 'jpeg', 'pdf'].includes(ext)) {
                                setPortfolioFileError('JPEG 또는 PDF 파일만 업로드할 수 있습니다.')
                                e.target.value = ''
                                return
                              }
                            }
                            setPortfolioFile(file)
                          }}
                        />
                      </label>
                      {portfolioFile && (
                        <button
                          type='button'
                          onClick={clearPortfolioFile}
                          style={{ marginTop: 8, border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#4b5563', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                        >
                          선택한 파일 삭제
                        </button>
                      )}
                    </div>
                  </div>
                  {portfolioFileError && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#dc2626' }}>{portfolioFileError}</div>
                  )}
                  {!!postExperimentAnswers.portfolioUrl.trim() && !!portfolioFile && (
                    <div style={{ marginTop: 4, fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
                      포트폴리오 URL 또는 파일 중 하나만 제출해 주세요.
                    </div>
                  )}
                </div>

                {postExperimentError && (
                  <div style={{ border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                    {postExperimentError}
                  </div>
                )}

                <button
                  onClick={submitPostExperiment}
                  disabled={isSubmittingPostExperiment || !postExperimentAnswers.fullName.trim() || !postExperimentAnswers.ageGroup || !postExperimentAnswers.email.trim() || (!postExperimentAnswers.portfolioUrl.trim() && !portfolioFile) || (!!postExperimentAnswers.portfolioUrl.trim() && !!portfolioFile)}
                  style={{ marginTop: 4, border: 'none', background: (!postExperimentAnswers.fullName.trim() || !postExperimentAnswers.ageGroup || !postExperimentAnswers.email.trim() || (!postExperimentAnswers.portfolioUrl.trim() && !portfolioFile) || (!!postExperimentAnswers.portfolioUrl.trim() && !!portfolioFile)) ? '#9ca3af' : '#111111', color: '#ffffff', borderRadius: 8, padding: '14px 0', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%' }}
                >
                  {isSubmittingPostExperiment ? '저장 중...' : '제출 후 실험 종료'}
                </button>
              </div>
            </section>
          </div>
        )}

        {step === 'completed' && (
          <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '32px 0 56px' }}>
            <section style={{ width: 'min(1040px, 94vw)', border: '1px solid rgba(17,17,17,.14)', borderRadius: 18, background: '#ffffff', padding: '34px 36px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.03em', color: '#111111', marginBottom: 10 }}>
                실험이 모두 종료되었습니다.
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#333333', marginBottom: 8 }}>
                참여해 주셔서 감사합니다.
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, marginBottom: 28 }}>
                아래는 각 조건에서 최종 선택한 로고 시안입니다.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
                {finalSelectedLogos.map(({ row, stimulus }) => (
                  <div
                    key={`${row.condition_type}-${row.set_id}-${row.stimulus_id}`}
                    style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, background: '#fafafa', padding: 14, textAlign: 'left' }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(17,17,17,.08)', display: 'grid', placeItems: 'center', overflow: 'hidden', marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(stimulus) }} />
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', marginBottom: 4 }}>
                      {row.condition_order} · {row.condition_type}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#111111' }}>
                      최종 선택 시안 {row.stimulus_id}
                    </div>
                  </div>
                ))}
              </div>

              {finalSelectedLogos.length === 0 && (
                <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 18, background: '#f7f7f7', color: '#4b5563', fontSize: 14 }}>
                  최종 선택 로고 정보가 아직 저장되지 않았습니다.
                </div>
              )}
            </section>
          </div>
        )}

        {showLogCenter && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17,17,17,.42)',
              zIndex: 50,
              display: 'grid',
              placeItems: 'center',
              padding: 20,
            }}
            onClick={() => setShowLogCenter(false)}
          >
            <div
              style={{
                width: 'min(1080px, 94vw)',
                maxHeight: '86vh',
                overflow: 'hidden',
                borderRadius: 14,
                border: '1px solid rgba(17,17,17,.16)',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(17,17,17,.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#111111' }}>실험 로그 센터</div>
                  <div style={{ fontSize: 12, color: '#666666' }}>
                    자동 저장은 계속 유지됩니다. 자극물 로그 {rows.length}건 · 행동 로그 {events.length}건
                  </div>
                </div>
                <button
                  onClick={() => setShowLogCenter(false)}
                  style={{ border: '1px solid rgba(17,17,17,.2)', background: '#ffffff', color: '#333333', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  닫기
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(17,17,17,.1)' }}>
                <button
                  onClick={() => setLogCenterTab('view')}
                  style={{
                    border: 'none',
                    borderBottom: `2px solid ${logCenterTab === 'view' ? '#374151' : 'transparent'}`,
                    background: logCenterTab === 'view' ? 'rgba(55,65,81,.08)' : '#ffffff',
                    color: logCenterTab === 'view' ? '#111827' : '#4d4d4d',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '10px 8px',
                    cursor: 'pointer',
                  }}
                >
                  열람
                </button>
                <button
                  onClick={() => setLogCenterTab('export')}
                  style={{
                    border: 'none',
                    borderBottom: `2px solid ${logCenterTab === 'export' ? '#374151' : 'transparent'}`,
                    background: logCenterTab === 'export' ? 'rgba(55,65,81,.08)' : '#ffffff',
                    color: logCenterTab === 'export' ? '#111827' : '#4d4d4d',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '10px 8px',
                    cursor: 'pointer',
                  }}
                >
                  추출
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {logCenterTab === 'view' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '9px 11px', borderBottom: '1px solid rgba(17,17,17,.08)', fontSize: 13, fontWeight: 800, color: '#111111' }}>자극물 로그 미리보기 (최근 120건)</div>
                      <div style={{ maxHeight: 240, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead style={{ background: '#f7f7f7', position: 'sticky', top: 0 }}>
                            <tr>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>조건</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>세트</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>시안</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>초기</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>최종</th>
                              <th style={{ textAlign: 'right', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>최종점수</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.slice(-120).reverse().map((row, idx) => (
                              <tr key={`${row.condition_type}-${row.set_id}-${row.stimulus_id}-${idx}`}>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.condition_type}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.set_id}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.stimulus_id}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.initial_decision_hold_or_exclude ?? '-'}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.final_decision_hold_or_exclude ?? '-'}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)', textAlign: 'right' }}>{row.total_score_final?.toFixed(2) ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '9px 11px', borderBottom: '1px solid rgba(17,17,17,.08)', fontSize: 13, fontWeight: 800, color: '#111111' }}>행동 로그 미리보기 (최근 120건)</div>
                      <div style={{ maxHeight: 240, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead style={{ background: '#f7f7f7', position: 'sticky', top: 0 }}>
                            <tr>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>시간</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>이벤트</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>상세</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>조건</th>
                              <th style={{ textAlign: 'left', padding: 7, borderBottom: '1px solid rgba(17,17,17,.1)' }}>시안</th>
                            </tr>
                          </thead>
                          <tbody>
                            {events.slice(-120).reverse().map((event, idx) => (
                              <tr key={`${event.eventMs}-${event.eventName}-${idx}`}>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{new Date(event.timestamp).toLocaleString('ko-KR')}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{event.eventName}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{event.detail ?? '-'}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{event.conditionLabel ?? '-'}</td>
                                <td style={{ padding: 7, borderTop: '1px solid rgba(17,17,17,.06)' }}>{event.stimulusId ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {logCenterTab === 'export' && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 13, color: '#4d4d4d', lineHeight: 1.7 }}>
                      연구 분석용 파일을 즉시 추출할 수 있습니다. 자동 저장은 별도로 계속 유지됩니다.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        onClick={exportRowsJson}
                        style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#111111', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        자극물 로그 JSON 추출
                      </button>
                      <button
                        onClick={exportRowsCsv}
                        style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#111111', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        자극물 로그 CSV 추출
                      </button>
                      <button
                        onClick={exportEventsJson}
                        style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#111111', borderRadius: 9, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        행동 이벤트 로그 JSON 추출
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {(eligibilityError === 'rejection' || eligibilityError === 'declined' || eligibilityError === 'consent_declined') && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.52)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setEligibilityError('')}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 18, padding: '30px 28px', maxWidth: 520, width: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 12 }}>
              {eligibilityError === 'declined' || eligibilityError === 'consent_declined' ? '실험 참여 종료' : '실험 참여 안내'}
            </div>
            <div style={{ fontSize: 14, color: '#333333', lineHeight: 1.75, marginBottom: 14 }}>
              {eligibilityError === 'consent_declined'
                ? '연구 참여에 동의하지 않아 실험이 종료되었습니다. 귀하의 결정에 따른 불이익은 없습니다.'
                : eligibilityError === 'declined'
                ? '실험 참여를 선택하지 않으셨습니다. 참여해 주셔서 감사합니다.'
                : '참여 자격 조건에 해당하지 않아 실험에 참여하실 수 없습니다. 관심을 가져 주셔서 감사합니다.'}
            </div>
            <div style={{ background: '#f7f7f7', border: '1px solid rgba(17,17,17,.1)', borderRadius: 10, padding: '11px 12px', fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 22 }}>
              문의: {RESEARCHER_EMAIL}
            </div>
            <button
              onClick={() => setEligibilityError('')}
              style={{ width: '100%', border: 'none', background: '#111111', color: '#ffffff', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {finalGuardNotice && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.52)', display: 'grid', placeItems: 'center', zIndex: 9999 }}
          onClick={() => setFinalGuardNotice(null)}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 18, padding: '30px 28px', maxWidth: 480, width: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 10 }}>
              후보유지 시안 미션 체크가 필요합니다.
            </div>
            <div style={{ fontSize: 13, color: '#555555', lineHeight: 1.75, marginBottom: 10 }}>
              최종선택 전에 <strong style={{ color: '#111111' }}>후보유지 탭에 있는 모든 시안</strong>의
              브랜드 종합 적합도, 시각 종합 완성도, 주된 판단 기준을 모두 입력해야 합니다.
            </div>
            <div style={{ background: '#f7f7f7', border: '1px solid rgba(17,17,17,.1)', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#333333', lineHeight: 1.6, marginBottom: 22 }}>
              미완료 시안: <strong>{finalGuardNotice.incompleteIds.join(', ')}</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => setFinalGuardNotice(null)}
                style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#333333', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                계속 검토
              </button>
              <button
                onClick={() => {
                  const firstIncompleteId = finalGuardNotice.incompleteIds[0]
                  setRightTab('hold')
                  setActiveStimulusId(firstIncompleteId)
                  setEditingCardId(firstIncompleteId)
                  setFinalGuardNotice(null)
                }}
                style={{ border: 'none', background: currentConditionColor, color: '#ffffff', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
              >
                미완료 시안 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'grid', placeItems: 'center', zIndex: 9999 }}
          onClick={() => setShowFinalModal(false)}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 18, padding: '32px 28px', maxWidth: 420, width: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111111', marginBottom: 10 }}>최종 시안 선택을 완료하시겠습니까?</div>
            <div style={{ fontSize: 13, color: '#555555', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: '#111111' }}>{finalSelectedStimulusId}</strong> 시안을 최종 시안으로 확정합니다.
            </div>
            <div style={{ border: '1px solid rgba(17,17,17,.12)', background: '#f7f7f7', borderRadius: 10, padding: '9px 10px', fontSize: 13, fontWeight: 700, color: '#111111', lineHeight: 1.55, marginBottom: 10 }}>
              최종 시안은 1개만 선택할 수 있습니다.
            </div>
            <div style={{ fontSize: 12, color: '#888888', marginBottom: 28 }}>
              {currentConditionIndex < assignments.length - 1
                ? '확정 후 다음 조건으로 이동합니다.'
                : '확정 후 모든 조건이 완료됩니다.'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => setShowFinalModal(false)}
                style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#333333', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                계속 검토
              </button>
              <button
                onClick={() => { setShowFinalModal(false); moveToNextCondition() }}
                style={{ border: 'none', background: currentConditionColor, color: '#ffffff', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
              >
                완료하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
