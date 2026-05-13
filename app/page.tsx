'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AXIS_LABELS,
  BRAND_AXIS_IDS,
  CONDITION_GUIDES,
  VISUAL_AXIS_IDS,
  createAiSuggestedScores,
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
  StimulusLogRow,
} from '@/types'

type ScreenStep = 'participant' | 'instruction' | 'evaluation' | 'result' | 'completed'
type RightTab = 'evaluate' | 'hold' | 'exclude'

interface StimulusCardState {
  stimulus: Logo
  displayOrder: number
  aiScores: AxisScores | null
  currentScores: Partial<AxisScores>
  initialScores: AxisScores | null
  finalScores: AxisScores | null
  initialDecision: DecisionType | null
  finalDecision: DecisionType | null
  initialDecisionTs: string | null
  revisionTs: string | null
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

const MANUAL_CONDITION_ASSIGNMENTS: ConditionAssignment[] = [
  {
    order: 1,
    condition: 'human',
    conditionLabel: '인간 전략 주도형',
    setId: 'A',
    setBriefCode: 'F0001',
  },
  {
    order: 2,
    condition: 'collab',
    conditionLabel: '협업 전략 주도형',
    setId: 'B',
    setBriefCode: 'B0002',
  },
  {
    order: 3,
    condition: 'ai',
    conditionLabel: 'AI 전략 주도형',
    setId: 'C',
    setBriefCode: 'W0003',
  },
]

const CONDITION_SURFACE: Record<ConditionLabel, string> = {
  '인간 전략 주도형': '#f8f8f8',
  '협업 전략 주도형': '#f2f2f2',
  'AI 전략 주도형': '#ececec',
}

const CONDITION_COLOR: Record<ConditionLabel, string> = {
  '인간 전략 주도형': '#111111',
  '협업 전략 주도형': '#4b5563',
  'AI 전략 주도형': '#6b7280',
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
  const symbolFn = SYMBOL_SVG[logo.style] ?? SYMBOL_SVG.serif
  const wordmark = escapeSvgText(getWordmarkFromName(logo.name))
  const color = logo.color
  return `<svg width="132" height="78" viewBox="0 0 132 78" xmlns="http://www.w3.org/2000/svg">
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
  return (logo.aiRank ?? 99) <= 2
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

  const [step, setStep] = useState<ScreenStep>('participant')
  const [participantInput, setParticipantInput] = useState(participantId)
  const [participantError, setParticipantError] = useState('')
  const [currentConditionIndex, setCurrentConditionIndex] = useState(0)
  const [cards, setCards] = useState<StimulusCardState[]>([])
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('evaluate')
  const [activeStimulusId, setActiveStimulusId] = useState<string | null>(null)
  const [pendingDecision, setPendingDecision] = useState<DecisionType | null>(null)
  const [decisionNotice, setDecisionNotice] = useState('')
  const [briefCodeInput, setBriefCodeInput] = useState('')
  const [briefCodeError, setBriefCodeError] = useState('')
  const [briefOverride, setBriefOverride] = useState<BrandBrief | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [finalSelectedStimulusId, setFinalSelectedStimulusId] = useState<string | null>(null)
  const [finalSelectionTs, setFinalSelectionTs] = useState<string | null>(null)
  const [showLogCenter, setShowLogCenter] = useState(false)
  const [logCenterTab, setLogCenterTab] = useState<'view' | 'export'>('view')

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
    () => cards.length > 0 && cards.every((card) => !!card.initialDecision && !!card.initialScores),
    [cards]
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
        initialDecision: null,
        finalDecision: null,
        initialDecisionTs: null,
        revisionTs: null,
      }
    })

    setCards(nextCards)
    setEditingCardId(null)
    setRightTab('evaluate')
    setActiveStimulusId(nextCards[0]?.stimulus.id ?? null)
    setPendingDecision(null)
    setDecisionNotice('')
    setBriefCodeError('')
    setHasGenerated(false)
    setIsGenerating(false)
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

  const startParticipantSession = useCallback(() => {
    const id = participantInput.trim()
    if (!id) {
      setParticipantError('참가자 ID를 입력해 주세요.')
      return
    }

    const assigned = MANUAL_CONDITION_ASSIGNMENTS.map((item) => ({ ...item }))
    setParticipant(id)
    setAssignments(assigned)
    startExperiment(Date.now())
    setParticipantError('')
    setCurrentConditionIndex(0)
    setStep('instruction')

    logEvent('experiment_start', {
      detail: '실험 시작',
      payload: {
        participant_id: id,
        condition_order: assigned.map((item) => item.conditionLabel).join(' > '),
        set_order: assigned.map((item) => item.setId).join(' > '),
      },
    })
  }, [participantInput, setParticipant, setAssignments, startExperiment, logEvent])

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

    setIsGenerating(true)
    logEvent('ai_logo_generate_click', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: 'AI 로고 시안 생성 클릭',
    })

    const waitMs = 2000 + Math.floor(Math.random() * 1000)
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    setHasGenerated(true)
    setIsGenerating(false)
    setActiveStimulusId((prev) => prev ?? cards[0]?.stimulus.id ?? null)

    logEvent('ai_logo_generate_complete', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: 'AI 로고 시안 생성 완료',
      payload: { waitMs },
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
    setRightTab('evaluate')

    const complete = toAxisScores(card.currentScores)
    if (!complete) {
      setPendingDecision(decision)
      setDecisionNotice(`[${decision}] 전에 8개 평가 판단 척도를 먼저 입력해 주세요.`)
      return
    }

    setPendingDecision(null)
    setDecisionNotice('')
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((item) => {
      if (item.stimulus.id !== stimulusId || item.initialDecision) return item
      return {
        ...item,
        initialScores: complete,
        finalScores: complete,
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
      payload: { decision },
    })
  }, [cards, activeAssignment, logEvent])

  const commitInitialDecision = useCallback((stimulusId: string, decision: DecisionType) => {
    const nowIso = new Date().toISOString()

    setCards((prev) => prev.map((card) => {
      if (card.stimulus.id !== stimulusId) return card
      if (card.initialDecision) return card

      const complete = toAxisScores(card.currentScores)
      if (!complete) return card

      return {
        ...card,
        initialScores: complete,
        finalScores: complete,
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
      payload: { decision },
    })
    setPendingDecision(null)
    setDecisionNotice('')
  }, [activeAssignment, logEvent])

  const openResultScreen = useCallback(() => {
    if (!allInitialCompleted) return
    setStep('result')
    setEditingCardId(null)
    setPendingDecision(null)
    setDecisionNotice('')

    logEvent('result_screen_open', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      detail: '보류/제외 결과 화면 이동',
    })
  }, [allInitialCompleted, activeAssignment, logEvent])

  useEffect(() => {
    if (step !== 'evaluation') return
    if (!allInitialCompleted) return
    openResultScreen()
  }, [step, allInitialCompleted, openResultScreen])

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

    logEvent('decision_move', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: `최종 분류 변경: ${nextDecision}`,
      payload: { nextDecision },
    })
  }, [activeAssignment, logEvent])

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

  const selectFinal = useCallback((stimulusId: string) => {
    if (finalSelectedStimulusId) return

    const target = cards.find((card) => card.stimulus.id === stimulusId)
    if (!target || !target.initialDecision) return

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
    setFinalSelectedStimulusId(stimulusId)
    setFinalSelectionTs(nowIso)

    logEvent('final_selection', {
      condition: activeAssignment?.condition,
      conditionLabel: activeAssignment?.conditionLabel,
      setId: activeAssignment?.setId,
      stimulusId,
      detail: '최종선택 완료',
      payload: {
        ai_recommended: toRecommended(target.stimulus),
      },
    })
  }, [finalSelectedStimulusId, cards, updateFinalDecision, logEvent, activeAssignment])

  const moveToNextCondition = useCallback(() => {
    if (!activeAssignment || !finalSelectedStimulusId) return

    logEvent('condition_complete', {
      condition: activeAssignment.condition,
      conditionLabel: activeAssignment.conditionLabel,
      setId: activeAssignment.setId,
      stimulusId: finalSelectedStimulusId,
      detail: `${activeAssignment.conditionLabel} 종료`,
    })

    if (currentConditionIndex >= assignments.length - 1) {
      setStep('completed')
      return
    }

    setCurrentConditionIndex((prev) => prev + 1)
    setStep('instruction')
    setCards([])
    setEditingCardId(null)
    setRightTab('evaluate')
    setActiveStimulusId(null)
    setPendingDecision(null)
    setDecisionNotice('')
    setHasGenerated(false)
    setIsGenerating(false)
    setFinalSelectedStimulusId(null)
    setFinalSelectionTs(null)
  }, [activeAssignment, finalSelectedStimulusId, currentConditionIndex, assignments.length, logEvent])

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
      .filter((card) => card.finalDecision === '보류' && card.finalScores)
      .sort((a, b) => calcMetrics(b.finalScores as AxisScores).total - calcMetrics(a.finalScores as AxisScores).total)
  }, [cards])

  const excludeCards = useMemo(() => {
    return cards
      .filter((card) => card.finalDecision === '제외' && card.finalScores)
      .sort((a, b) => calcMetrics(b.finalScores as AxisScores).total - calcMetrics(a.finalScores as AxisScores).total)
  }, [cards])

  const showParticipantScreen = step === 'participant'
  const showInstruction = step === 'instruction' && activeAssignment && activeBrief
  const showEvaluation = step === 'evaluation' && activeAssignment && activeBrief
  const showResult = step === 'result' && activeAssignment && activeBrief

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
      <header style={{ padding: '12px 16px', borderBottom: '1px solid rgba(17,17,17,.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, color: '#111111' }}>AI Logotics</div>
          <div style={{ fontSize: 12, color: '#666666' }}>생성형 AI 기반 브랜드 로고디자인 평가 실험</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#4d4d4d' }}>
          <div>참가자 ID: {participantId || '-'}</div>
          <div>저장된 로그 행: {rows.length}</div>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto', padding: 16 }} onClickCapture={handleUiClickCapture}>
        {showParticipantScreen && (
          <div style={{ maxWidth: 520, margin: '32px auto', border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 18, background: '#ffffff' }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: '#111111' }}>참가자 ID 입력</div>
            <div style={{ fontSize: 13, color: '#666666', lineHeight: 1.6, marginBottom: 12 }}>
              참가자 ID를 입력하면 실험 탭이 열립니다. 주도형은 탭에서 수동으로 선택할 수 있습니다.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                placeholder='예: P-001'
                style={{ flex: 1, border: '1px solid rgba(17,17,17,.2)', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}
              />
              <button
                onClick={startParticipantSession}
                style={{ border: 'none', background: '#111827', color: '#ffffff', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                시작
              </button>
            </div>
            {participantError && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#4b5563' }}>{participantError}</div>
            )}
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
              <div style={{ fontSize: 13, color: '#333333', marginBottom: 8 }}>
                배정 코드: {activeAssignment.setBriefCode}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
                {assignments.map((assignment, idx) => {
                  const isActive = idx === currentConditionIndex
                  const tabColor = CONDITION_COLOR[assignment.conditionLabel]
                  return (
                    <button
                      key={`${assignment.conditionLabel}-${assignment.setId}-${idx}`}
                      onClick={() => switchConditionTab(idx)}
                      style={{
                        border: `1px solid ${isActive ? tabColor : 'rgba(17,17,17,.14)'}`,
                        background: isActive ? tabColor : '#ffffff',
                        color: isActive ? '#ffffff' : '#333333',
                        borderRadius: 9,
                        padding: '8px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {idx + 1}. {assignment.conditionLabel}
                    </button>
                  )
                })}
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#333333', lineHeight: 1.8, fontSize: 14 }}>
                {CONDITION_GUIDES[activeAssignment.condition].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
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
          <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr) 360px', gap: 14, minHeight: 0 }}>
            <aside style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 12, background: '#ffffff', overflow: 'auto' }}>
              <div style={{ fontSize: 12, color: currentConditionColor, fontWeight: 800, marginBottom: 8 }}>
                조건 {activeAssignment.order}/3 · {activeAssignment.conditionLabel}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111111', marginBottom: 8 }}>브랜드 브리프 (Set {activeAssignment.setId})</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginBottom: 8 }}>
                <input
                  value={briefCodeInput}
                  onChange={(e) => setBriefCodeInput(e.target.value)}
                  placeholder='예: F0001'
                  style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '7px 8px', fontSize: 11 }}
                />
                <button
                  onClick={applyBriefCode}
                  style={{ border: '1px solid rgba(17,17,17,.22)', background: '#ffffff', color: '#333333', borderRadius: 8, padding: '6px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  입력
                </button>
                {briefCodeError && (
                  <div style={{ fontSize: 10, color: '#4b5563' }}>{briefCodeError}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#4d4d4d', lineHeight: 1.65, display: 'grid', gap: 8 }}>
                <div><strong>브랜드명:</strong> {displayedBrief?.name}</div>
                <div><strong>업종:</strong> {displayedBrief?.category}</div>
                <div><strong>포지셔닝:</strong> {displayedBrief?.positioning}</div>
                <div><strong>가치 키워드:</strong> {displayedBrief?.keywords.join(', ')}</div>
                <div><strong>타깃 고객:</strong> {displayedBrief?.target}</div>
                <div><strong>경쟁사 시각 특징:</strong> {displayedBrief?.competitors}</div>
                <div><strong>적용 환경:</strong> {displayedBrief?.environments.join(', ')}</div>
              </div>
            </aside>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {assignments.map((assignment, idx) => {
                  const isActive = idx === currentConditionIndex
                  const tabColor = CONDITION_COLOR[assignment.conditionLabel]
                  return (
                    <button
                      key={`eval-tab-${assignment.conditionLabel}-${assignment.setId}-${idx}`}
                      onClick={() => switchConditionTab(idx)}
                      style={{
                        border: `1px solid ${isActive ? tabColor : 'rgba(17,17,17,.14)'}`,
                        background: isActive ? tabColor : '#ffffff',
                        color: isActive ? '#ffffff' : '#333333',
                        borderRadius: 10,
                        padding: '9px 8px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {assignment.conditionLabel}
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
                        AI Logotics 생성 중...
                      </span>
                    ) : 'AI 로고 시안 생성'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, overflow: 'auto', paddingRight: 2 }}>
                  {cards.map((card) => {
                    const isActive = activeStimulusId === card.stimulus.id
                    const isDecided = !!card.initialDecision
                    const completeScores = toAxisScores(card.currentScores)

                    return (
                      <div
                        key={card.stimulus.id}
                        onClick={() => {
                          setActiveStimulusId(card.stimulus.id)
                          setRightTab('evaluate')
                        }}
                        data-click-log={`시안 카드 선택:${card.stimulus.id}`}
                        data-stimulus-id={card.stimulus.id}
                        style={{ border: `1px solid ${isActive ? currentConditionColor : 'rgba(17,17,17,.14)'}`, borderRadius: 12, background: '#ffffff', padding: 10, cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#333333' }}>
                            시안 ID {card.stimulus.id}
                          </div>
                          {toRecommended(card.stimulus) && activeAssignment.condition !== 'human' && (
                            <div style={{ border: '1px solid rgba(107,114,128,.45)', background: 'rgba(107,114,128,.12)', color: '#374151', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                              AI 추천
                            </div>
                          )}
                        </div>

                        <div style={{ height: 76, borderRadius: 10, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.08)', display: 'grid', placeItems: 'center', marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />

                        {activeAssignment.condition !== 'human' && (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 2 }}>{card.stimulus.name}</div>
                            <div style={{ fontSize: 11, color: '#666666', marginBottom: 6 }}>{card.stimulus.meta}</div>
                          </>
                        )}
                        <div style={{ fontSize: 11, color: '#4d4d4d', marginBottom: 8 }}>
                          {isDecided ? `초기 분류: ${card.initialDecision}` : `점수 입력: ${completeScores ? '완료' : '미완료'}`}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <button
                            onClick={() => requestInitialDecision(card.stimulus.id, '보류')}
                            aria-disabled={isDecided}
                            className={`btn-interact btn-hold ${card.initialDecision === '보류' ? 'btn-selected' : ''}`}
                            style={{ border: '1px solid rgba(75,85,99,.45)', background: card.initialDecision === '보류' ? '#4b5563' : '#f3f4f6', color: card.initialDecision === '보류' ? '#ffffff' : '#111827', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: isDecided ? 'not-allowed' : 'pointer', opacity: isDecided && card.initialDecision !== '보류' ? .45 : 1 }}
                          >
                            보류
                          </button>
                          <button
                            onClick={() => requestInitialDecision(card.stimulus.id, '제외')}
                            aria-disabled={isDecided}
                            className={`btn-interact btn-exclude ${card.initialDecision === '제외' ? 'btn-selected' : ''}`}
                            style={{ border: '1px solid rgba(107,114,128,.45)', background: card.initialDecision === '제외' ? '#6b7280' : '#f3f4f6', color: card.initialDecision === '제외' ? '#ffffff' : '#1f2937', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: isDecided ? 'not-allowed' : 'pointer', opacity: isDecided && card.initialDecision !== '제외' ? .45 : 1 }}
                          >
                            제외
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      setLogCenterTab('view')
                      setShowLogCenter(true)
                    }}
                    style={{ border: '1px solid rgba(17,17,17,.2)', background: '#ffffff', color: '#111111', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    로그 열람
                  </button>
                  <button
                    onClick={() => {
                      setLogCenterTab('export')
                      setShowLogCenter(true)
                    }}
                    style={{ border: '1px solid rgba(17,17,17,.2)', background: '#ffffff', color: '#111111', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    로그 추출
                  </button>
                </div>
              </div>
            </section>

            <aside style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, background: '#ffffff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid rgba(17,17,17,.1)' }}>
                {[
                  { id: 'evaluate' as RightTab, label: '평가 판단 척도' },
                  { id: 'hold' as RightTab, label: `보류 (${initialHoldCards.length})` },
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
                {rightTab === 'evaluate' && (
                  !hasGenerated ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12, lineHeight: 1.7 }}>
                      중앙의 [AI 로고 시안 생성] 버튼을 눌러주세요.
                    </div>
                  ) : !activeCard ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12, lineHeight: 1.7 }}>
                      좌측 카드에서 시안을 선택해 주세요.
                    </div>
                  ) : (
                    <div>
                      <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 9, padding: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#111111', marginBottom: activeAssignment.condition === 'human' ? 0 : 2 }}>
                          {activeCard.stimulus.id}
                          {activeAssignment.condition !== 'human' ? ` · ${activeCard.stimulus.name}` : ''}
                        </div>
                        {activeAssignment.condition !== 'human' && (
                          <div style={{ fontSize: 11, color: '#666666' }}>{activeCard.stimulus.meta}</div>
                        )}
                      </div>

                      {pendingDecision && (
                        <div style={{ border: '1px solid rgba(107,114,128,.45)', background: 'rgba(107,114,128,.12)', color: '#374151', borderRadius: 8, padding: '8px 9px', fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                          [{pendingDecision}] 확정을 위해 8개 항목 점수를 모두 입력해 주세요.
                        </div>
                      )}

                      <div style={{ display: 'grid', gap: 8 }}>
                        {AXIS_LABELS.map((axis, idx) => {
                          const selected = activeCard.currentScores[axis.id]
                          const aiValue = activeCard.aiScores?.[axis.id]

                          return (
                            <div key={`${activeCard.stimulus.id}-${axis.id}`} style={{ border: '1px solid rgba(17,17,17,.08)', borderRadius: 8, padding: 7 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#333333' }}>{idx + 1}. {axis.name}</div>
                                <div style={{ fontSize: 10, color: '#666666' }}>{selected ? `${selected}점` : '미입력'}</div>
                              </div>
                              <div style={{ fontSize: 10, color: '#666666', marginBottom: 4 }}>{axis.desc}</div>
                              {typeof aiValue === 'number' && (
                                <div style={{ fontSize: 10, color: '#1f2937', marginBottom: 4 }}>AI 평가 제안: {aiValue}점</div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 4 }}>
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={`${activeCard.stimulus.id}-${axis.id}-${value}`}
                                    onClick={() => setScore(activeCard.stimulus.id, axis.id, value)}
                                    disabled={!!activeCard.initialDecision}
                                    style={{
                                      border: `1px solid ${selected === value ? currentConditionColor : 'rgba(17,17,17,.14)'}`,
                                      background: selected === value ? currentConditionColor : '#ffffff',
                                      color: selected === value ? '#ffffff' : '#333333',
                                      borderRadius: 6,
                                      padding: '4px 0',
                                      fontSize: 11,
                                      cursor: activeCard.initialDecision ? 'not-allowed' : 'pointer',
                                      opacity: activeCard.initialDecision ? .55 : 1,
                                    }}
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 10 }}>
                        <button
                          onClick={() => commitInitialDecision(activeCard.stimulus.id, '보류')}
                          disabled={!toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision}
                          className='btn-interact btn-hold'
                          style={{ border: '1px solid rgba(75,85,99,.45)', background: '#f3f4f6', color: '#111827', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: !toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision ? 'not-allowed' : 'pointer', opacity: !toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision ? .45 : 1 }}
                        >
                          보류 확정
                        </button>
                        <button
                          onClick={() => commitInitialDecision(activeCard.stimulus.id, '제외')}
                          disabled={!toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision}
                          className='btn-interact btn-exclude'
                          style={{ border: '1px solid rgba(107,114,128,.45)', background: '#f3f4f6', color: '#1f2937', borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: !toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision ? 'not-allowed' : 'pointer', opacity: !toAxisScores(activeCard.currentScores) || !!activeCard.initialDecision ? .45 : 1 }}
                        >
                          제외 확정
                        </button>
                      </div>
                    </div>
                  )
                )}

                {rightTab === 'hold' && (
                  initialHoldCards.length === 0 ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12 }}>
                      보류 시안이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 7 }}>
                      {initialHoldCards.map((card) => (
                        <button
                          key={`hold-${card.stimulus.id}`}
                          onClick={() => {
                            setActiveStimulusId(card.stimulus.id)
                            setRightTab('evaluate')
                          }}
                          style={{ textAlign: 'left', border: '1px solid rgba(17,17,17,.14)', background: '#ffffff', borderRadius: 8, padding: '8px 9px', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111111' }}>
                            {card.stimulus.id}
                            {activeAssignment.condition !== 'human' ? ` · ${card.stimulus.name}` : ''}
                          </div>
                          {activeAssignment.condition !== 'human' && (
                            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{card.stimulus.meta}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                )}

                {rightTab === 'exclude' && (
                  initialExcludeCards.length === 0 ? (
                    <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#666666', textAlign: 'center', fontSize: 12 }}>
                      제외 시안이 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 7 }}>
                      {initialExcludeCards.map((card) => (
                        <button
                          key={`exclude-${card.stimulus.id}`}
                          onClick={() => {
                            setActiveStimulusId(card.stimulus.id)
                            setRightTab('evaluate')
                          }}
                          style={{ textAlign: 'left', border: '1px solid rgba(17,17,17,.14)', background: '#ffffff', borderRadius: 8, padding: '8px 9px', cursor: 'pointer' }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111111' }}>
                            {card.stimulus.id}
                            {activeAssignment.condition !== 'human' ? ` · ${card.stimulus.name}` : ''}
                          </div>
                          {activeAssignment.condition !== 'human' && (
                            <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{card.stimulus.meta}</div>
                          )}
                        </button>
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
                보류/제외 영역 내부 자동 순위는 전체 8축 평균 점수 기준입니다. 점수 수정과 영역 이동 후 순위가 즉시 업데이트됩니다.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'hold', title: `보류 영역 (${holdCards.length})`, cards: holdCards, color: '#111827', bg: '#f7f7f7', move: '제외 이동' as const },
                { key: 'exclude', title: `제외 영역 (${excludeCards.length})`, cards: excludeCards, color: '#1f2937', bg: '#f5f5f5', move: '보류 이동' as const },
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
                      const metrics = calcMetrics(card.finalScores as AxisScores)
                      const editing = editingCardId === card.stimulus.id
                      const moveDecision: DecisionType = bucket.key === 'hold' ? '제외' : '보류'

                      return (
                        <div key={`${bucket.key}-${card.stimulus.id}`} style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, background: '#ffffff', padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#333333' }}>{idx + 1}위 · {card.stimulus.id}</div>
                            <div style={{ fontSize: 12, color: '#111111', fontWeight: 700 }}>{metrics.total.toFixed(2)}점 ({metrics.score100.toFixed(1)})</div>
                          </div>
                          {activeAssignment.condition !== 'human' && (
                            <div style={{ fontSize: 12, color: '#4d4d4d', marginBottom: 6 }}>{card.stimulus.name}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {AXIS_KEYS.map((axis) => (
                              <span key={`${card.stimulus.id}-tag-${axis}`} style={{ fontSize: 10, border: '1px solid rgba(17,17,17,.12)', borderRadius: 999, padding: '2px 6px', color: '#333333' }}>
                                {axis}: {(card.finalScores as AxisScores)[axis]}
                              </span>
                            ))}
                          </div>

                          {editing && (
                            <div style={{ display: 'grid', gap: 6, marginBottom: 8, border: '1px solid rgba(17,17,17,.1)', borderRadius: 8, padding: 8 }}>
                              {AXIS_LABELS.map((axis) => (
                                <div key={`${card.stimulus.id}-edit-${axis.id}`}>
                                  <div style={{ fontSize: 11, color: '#333333', marginBottom: 4 }}>{axis.name}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 4 }}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                      <button
                                        key={`${card.stimulus.id}-${axis.id}-edit-${value}`}
                                        onClick={() => updateFinalScore(card.stimulus.id, axis.id, value)}
                                        style={{ border: '1px solid rgba(17,17,17,.2)', background: (card.finalScores as AxisScores)[axis.id] === value ? currentConditionColor : '#ffffff', color: (card.finalScores as AxisScores)[axis.id] === value ? '#ffffff' : '#333333', borderRadius: 6, padding: '4px 0', fontSize: 11, cursor: 'pointer' }}
                                      >
                                        {value}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                            <button
                              onClick={() => setEditingCardId(editing ? null : card.stimulus.id)}
                              style={{ border: '1px solid rgba(17,17,17,.2)', background: '#ffffff', color: '#333333', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              점수 수정
                            </button>
                            <button
                              onClick={() => updateFinalDecision(card.stimulus.id, moveDecision)}
                              disabled={!!finalSelectedStimulusId}
                              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#f7f7f7', color: '#333333', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: finalSelectedStimulusId ? 'not-allowed' : 'pointer', opacity: finalSelectedStimulusId ? .45 : 1 }}
                            >
                              {bucket.move}
                            </button>
                            <button
                              onClick={() => selectFinal(card.stimulus.id)}
                              disabled={!!finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id}
                              style={{ border: '1px solid rgba(17,17,17,.35)', background: finalSelectedStimulusId === card.stimulus.id ? '#111827' : '#f3f4f6', color: finalSelectedStimulusId === card.stimulus.id ? '#ffffff' : '#111827', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 800, cursor: finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? 'not-allowed' : 'pointer', opacity: finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? .45 : 1 }}
                            >
                              최종선택
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
                {currentConditionIndex >= assignments.length - 1 ? '전체 조건 완료' : '다음 조건으로 이동'}
              </button>
            </div>
          </div>
        )}

        {step === 'completed' && (
          <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gap: 12 }}>
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 16, background: '#ffffff' }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: '#111111' }}>3개 조건 실험 완료</div>
              <div style={{ fontSize: 13, color: '#4d4d4d', lineHeight: 1.7 }}>
                전체 로그가 자동 저장되었고, 아래 버튼으로 연구 분석용 데이터를 추출할 수 있습니다.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
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

            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, background: '#ffffff', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(17,17,17,.12)', fontSize: 13, fontWeight: 800, color: '#111111' }}>저장된 자극물 로그 미리보기</div>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#f7f7f7', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>조건</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>세트</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>시안ID</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>초기결정</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>최종결정</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>최종점수</th>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid rgba(17,17,17,.1)' }}>최종선택</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.condition_type}-${row.stimulus_id}-${row.set_id}`}>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.condition_type}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.set_id}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.stimulus_id}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.initial_decision_hold_or_exclude ?? '-'}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)' }}>{row.final_decision_hold_or_exclude ?? '-'}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)', textAlign: 'right' }}>{row.total_score_final?.toFixed(2) ?? '-'}</td>
                        <td style={{ padding: 8, borderTop: '1px solid rgba(17,17,17,.06)', textAlign: 'center' }}>{row.final_selected ? 'Y' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
    </div>
  )
}
