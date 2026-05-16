'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

type ScreenStep = 'consent' | 'screening' | 'participant' | 'brief' | 'instruction' | 'evaluation' | 'result' | 'post_survey' | 'comparison_survey' | 'debriefing_check' | 'debriefing' | 'completed'
type RightTab = 'hold' | 'exclude'
type ScreeningAnswers = {
  fullName: string
  gender: string
  currentPractice: string
  career: string
  logoProjects: string
  portfolioFileName: string
  portfolioFileSize: string
  portfolioFileMimeType: string
  field: string
  aiUse: string
  email: string
}

type ScreeningQuestion = {
  id: keyof ScreeningAnswers
  title: string
  type: 'text' | 'radio' | 'file'
  options?: string[]
  placeholder?: string
  helper?: string
}

type PostSurveyYesNoKey = 'q1' | 'q2'
type PostSurveyLikertKey = 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8'
type PostSurveyAnswers = {
  q1: 'yes' | 'no' | null
  q2: 'yes' | 'no' | null
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
  suspected: 'yes' | 'no' | null; suspectedTiming: string | null; suspectedReason: string
}
const INITIAL_POST_SURVEY: PostSurveyAnswers = {
  q1: null, q2: null, q3: null, q4: null,
  q5: null, q6: null, q7: null, q8: null, freeText: '',
}
const INITIAL_COMP_SURVEY: CompSurveyAnswers = {
  easiest: null, strongestAgency: null, highestConfidence: null,
  mostPractical: null, preferred: null, mostUsefulAi: null,
  preferredExploration: null, preferredComparison: null,
  preferredFinalSelection: null, freeText: '',
}
const INITIAL_DEBRIEF_CHECK: DebriefCheckAnswers = {
  suspected: null, suspectedTiming: null, suspectedReason: '',
}
const POST_SURVEY_MANIPULATION: Array<{ key: PostSurveyYesNoKey; text: string }> = [
  { key: 'q1', text: '이 조건에서 AI가 시안에 대한 추천을 제공했다고 인식했습니까?' },
  { key: 'q2', text: '이 조건에서 AI가 시안에 대한 점수 또는 순위를 제공했다고 인식했습니까?' },
]
const POST_SURVEY_COMMON: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q3', text: '이번 조건에서 최종 선택한 시안이 적절하다고 느끼는 정도는 어느 정도입니까?' },
  { key: 'q4', text: '이번 조건에서 판단 과정이 자신에 의해 주도되었다고 느끼는 정도는 어느 정도입니까?' },
  { key: 'q5', text: '이번 조건에서 AI가 판단 과정에 개입했다고 느끼는 정도는 어느 정도입니까?' },
]
const POST_SURVEY_COLLAB: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q6', text: '이번 조건에서 AI 추천 또는 평가 정보가 신뢰할 만하다고 느끼는 정도는 어느 정도입니까?' },
  { key: 'q7', text: '이번 조건에서 AI 추천 또는 평가 정보가 판단에 유용했다고 느끼는 정도는 어느 정도입니까?' },
]
const POST_SURVEY_AI_ONLY: Array<{ key: PostSurveyLikertKey; text: string }> = [
  { key: 'q8', text: 'AI 점수 또는 순위 때문에 자신의 판단 기준이 흔들렸다고 느끼는 정도는 어느 정도입니까?' },
]
const COND_LABELS_ALL: string[] = ['시안 제시형', '추천 제시형', '평가 제시형']
const AI_USEFUL_OPTIONS: string[] = ['추천 제시형', '평가 제시형', '해당 없음']
const COMP_QUESTIONS: Array<{ key: keyof CompSurveyAnswers; text: string; options: string[] }> = [
  { key: 'easiest', text: '가장 판단하기 쉬웠던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'strongestAgency', text: '가장 전문적 판단을 유지하기 쉬웠던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'highestConfidence', text: '최종 선택에 가장 확신을 느낀 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'mostPractical', text: '실제 실무에 가장 가까웠던 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferred', text: '다시 사용한다면 선호하는 조건은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'mostUsefulAi', text: 'AI 정보가 가장 유용하다고 느껴진 조건은 무엇입니까?', options: AI_USEFUL_OPTIONS },
  { key: 'preferredExploration', text: '초기 후보 검토 단계에서 적절한 방식은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferredComparison', text: '후보유지·제외 비교 단계에서 적절한 방식은 무엇입니까?', options: COND_LABELS_ALL },
  { key: 'preferredFinalSelection', text: '최종 선택 단계에서 적절한 방식은 무엇입니까?', options: COND_LABELS_ALL },
]
const DEBRIEF_TIMING_OPTIONS: string[] = ['추천 제시형', '평가 제시형', '최종 선택 단계', '기타']

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
  screeningAnswers: ScreeningAnswers
  screeningError: string
  screeningBlockMessage: string
  missingScreeningFields: Array<keyof ScreeningAnswers>
  showScreeningThanks: boolean
  isSubmittingScreening: boolean
  screeningSubmitMessage: string
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
const SCREENING_RECIPIENT_EMAIL = 'kjully1492@gmail.com'
const SCREENING_API_URL = 'https://script.google.com/macros/s/AKfycbxb_THQiRE2c6c-JItd0R1OxhjuraSirzONWi-pb85rnZbz9IVfKda1NFJxjFLAuUWC/exec'
const MAX_PORTFOLIO_ATTACHMENT_BYTES = 10 * 1024 * 1024

const INITIAL_SCREENING_ANSWERS: ScreeningAnswers = {
  fullName: '',
  gender: '',
  currentPractice: '',
  career: '',
  logoProjects: '',
  portfolioFileName: '',
  portfolioFileSize: '',
  portfolioFileMimeType: '',
  field: '',
  aiUse: '',
  email: '',
}

const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'fullName',
    title: '1. 당신의 이름은 무엇입니까?',
    type: 'text',
    placeholder: '이름을 입력해 주세요.',
  },
  {
    id: 'gender',
    title: '2. 성별은 무엇인가요?',
    type: 'radio',
    options: ['남성', '여성'],
  },
  {
    id: 'currentPractice',
    title: '3. 현재 디자인 실무에 종사하고 있습니까?',
    type: 'radio',
    options: ['예', '아니요'],
  },
  {
    id: 'career',
    title: '4. 디자인 실무 경력',
    type: 'radio',
    options: ['1년 미만', '1~3년', '3~5년', '5년 이상', '10년 이상'],
  },
  {
    id: 'logoProjects',
    title: '5. 로고 디자인 또는 브랜드 아이덴티티 프로젝트 경험이 있습니까?',
    type: 'radio',
    options: ['없음', '1~2건', '3건 이상', '5건 이상'],
  },
  {
    id: 'portfolioFileName',
    title: '6. 포트폴리오 업로드(브랜드 로고 디자인 프로젝트 이미지, pdf 혹은 jpeg, 10MB 이하)',
    type: 'file',
  },
  {
    id: 'field',
    title: '7. 주요 실무 분야',
    type: 'radio',
    options: ['브랜드 디자인', '시각디자인', '그래픽 디자인', 'BX 디자인', 'UI/UX 디자인', '편집디자인', '기타'],
  },
  {
    id: 'aiUse',
    title: '8. 생성형 AI 이미지 도구 사용 경험',
    type: 'radio',
    options: ['없음', '1~2회', '가끔 사용', '자주 사용'],
  },
  {
    id: 'email',
    title: '9. 이메일을 기입해주세요.',
    type: 'text',
    placeholder: '예: name@example.com',
  },
]

function getScreeningInvalidReason(answers: ScreeningAnswers): string | null {
  if (answers.currentPractice === '아니요') return '3번 문항에서 실험 조건에 맞지 않는 응답이 선택되었습니다.'
  if (answers.career === '1년 미만' || answers.career === '1~3년') return '4번 문항에서 실험 조건에 맞지 않는 응답이 선택되었습니다.'
  if (answers.logoProjects === '없음' || answers.logoProjects === '1~2건') return '5번 문항에서 실험 조건에 맞지 않는 응답이 선택되었습니다.'
  return null
}

function getMissingScreeningFields(answers: ScreeningAnswers): Array<keyof ScreeningAnswers> {
  return SCREENING_QUESTIONS
    .filter((question) => !String(answers[question.id] ?? '').trim())
    .map((question) => question.id)
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function formatPortfolioSize(sizeText: string): string {
  const size = Number(sizeText)
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function createScreeningEmailHref(answers: ScreeningAnswers): string {
  const subject = `[AI Logotics] 실험 참여자 신청 문항 - ${answers.fullName || '이름 미입력'}`
  const body = [
    'AI Logotics 실험 참여자 신청 문항',
    '',
    `1. 실험 신청자: ${answers.fullName || '-'}`,
    `2. 성별: ${answers.gender || '-'}`,
    `3. 현재 디자인 실무 종사 여부: ${answers.currentPractice || '-'}`,
    `4. 디자인 실무 경력: ${answers.career || '-'}`,
    `5. 로고/브랜드 아이덴티티 프로젝트 경험: ${answers.logoProjects || '-'}`,
    `6. 포트폴리오 파일명: ${answers.portfolioFileName || '-'}`,
    `   포트폴리오 파일 크기: ${formatPortfolioSize(answers.portfolioFileSize)}`,
    `7. 주요 실무 분야: ${answers.field || '-'}`,
    `8. 생성형 AI 이미지 도구 사용 경험: ${answers.aiUse || '-'}`,
    `9. 이메일: ${answers.email || '-'}`,
    '',
    '참고: 포트폴리오 원본 파일은 메일 첨부로 함께 전송됩니다.',
  ].join('\n')

  return `mailto:${SCREENING_RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('포트폴리오 파일을 읽지 못했습니다.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.readAsDataURL(file)
  })
}

async function buildScreeningApplicationPayload(answers: ScreeningAnswers, portfolioFile: File) {
  const portfolioFileBase64 = await readFileAsBase64(portfolioFile)

  return {
    ...answers,
    portfolioFileSizeReadable: formatPortfolioSize(answers.portfolioFileSize),
    portfolioFileMimeType: portfolioFile.type,
    portfolioFileBase64,
    submittedAt: new Date().toISOString(),
  }
}

async function sendScreeningApplication(answers: ScreeningAnswers, portfolioFile: File) {
  await fetch(SCREENING_API_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(await buildScreeningApplicationPayload(answers, portfolioFile)),
  })
}

function createAutoParticipantId(answers: ScreeningAnswers): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const emailSeed = answers.email.trim().split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
  return `P-${stamp}${emailSeed ? `-${emailSeed}` : ''}`
}

const MANUAL_CONDITION_ASSIGNMENTS: ConditionAssignment[] = [
  {
    order: 1,
    condition: 'human',
    conditionLabel: '시안 제시형',
    setId: 'A',
    setBriefCode: 'B0002',
  },
  {
    order: 2,
    condition: 'collab',
    conditionLabel: '추천 제시형',
    setId: 'B',
    setBriefCode: 'B0002',
  },
  {
    order: 3,
    condition: 'ai',
    conditionLabel: '평가 제시형',
    setId: 'C',
    setBriefCode: 'B0002',
  },
]

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
  const [screeningAnswers, setScreeningAnswers] = useState<ScreeningAnswers>(INITIAL_SCREENING_ANSWERS)
  const [screeningError, setScreeningError] = useState('')
  const [screeningBlockMessage, setScreeningBlockMessage] = useState('')
  const [missingScreeningFields, setMissingScreeningFields] = useState<Array<keyof ScreeningAnswers>>([])
  const [showScreeningThanks, setShowScreeningThanks] = useState(false)
  const [isSubmittingScreening, setIsSubmittingScreening] = useState(false)
  const [screeningSubmitMessage, setScreeningSubmitMessage] = useState('')
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
  const screeningPortfolioFileRef = useRef<File | null>(null)
  const hasInitializedHistoryRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const lastHistorySignatureRef = useRef('')

  const historySnapshot = useMemo<AppHistoryState>(() => ({
    __aiLogoticsHistory: true,
    step,
    currentConditionIndex,
    participantInput,
    participantError,
    screeningAnswers,
    screeningError,
    screeningBlockMessage,
    missingScreeningFields,
    showScreeningThanks,
    isSubmittingScreening,
    screeningSubmitMessage,
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
    screeningAnswers,
    screeningError,
    screeningBlockMessage,
    missingScreeningFields,
    showScreeningThanks,
    isSubmittingScreening,
    screeningSubmitMessage,
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
      setScreeningAnswers(snapshot.screeningAnswers ?? INITIAL_SCREENING_ANSWERS)
      setScreeningError(snapshot.screeningError ?? '')
      setScreeningBlockMessage(snapshot.screeningBlockMessage ?? '')
      setMissingScreeningFields(snapshot.missingScreeningFields ?? [])
      setShowScreeningThanks(snapshot.showScreeningThanks ?? false)
      setIsSubmittingScreening(snapshot.isSubmittingScreening ?? false)
      setScreeningSubmitMessage(snapshot.screeningSubmitMessage ?? '')
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

  const startExperimentSession = useCallback((participantIdForSession: string, source: 'screening_auto' | 'manual') => {
    const id = participantIdForSession.trim()
    if (!id) {
      setParticipantError('참가자 ID를 입력해 주세요.')
      return
    }

    const assigned = MANUAL_CONDITION_ASSIGNMENTS.map((item) => ({ ...item }))
    setParticipant(id)
    setParticipantInput(id)
    setAssignments(assigned)
    startExperiment(Date.now())
    setParticipantError('')
    setCurrentConditionIndex(0)
    setStep('brief')

    logEvent('experiment_start', {
      detail: '실험 시작',
      payload: {
        participant_id: id,
        participant_id_source: source,
        condition_order: assigned.map((item) => item.conditionLabel).join(' > '),
        set_order: assigned.map((item) => item.setId).join(' > '),
      },
    })
  }, [setParticipant, setAssignments, startExperiment, logEvent])

  const updateScreeningAnswer = useCallback((id: keyof ScreeningAnswers, value: string) => {
    setScreeningAnswers((prev) => ({ ...prev, [id]: value }))
    setMissingScreeningFields((prev) => prev.filter((field) => field !== id))
    setScreeningError('')
    setScreeningSubmitMessage('')
  }, [])

  const updateScreeningPortfolio = useCallback((file: File | null) => {
    if (file) {
      const isAllowedType = file.type === 'application/pdf' || file.type === 'image/jpeg'
      if (!isAllowedType) {
        screeningPortfolioFileRef.current = null
        setScreeningAnswers((prev) => ({
          ...prev,
          portfolioFileName: '',
          portfolioFileSize: '',
          portfolioFileMimeType: '',
        }))
        setMissingScreeningFields(['portfolioFileName'])
        setScreeningError('포트폴리오는 PDF 또는 JPEG 파일만 업로드해 주세요.')
        return
      }

      if (file.size > MAX_PORTFOLIO_ATTACHMENT_BYTES) {
        screeningPortfolioFileRef.current = null
        setScreeningAnswers((prev) => ({
          ...prev,
          portfolioFileName: '',
          portfolioFileSize: '',
          portfolioFileMimeType: '',
        }))
        setMissingScreeningFields(['portfolioFileName'])
        setScreeningError('포트폴리오 파일은 이메일 첨부 전송 안정성을 위해 10MB 이하로 업로드해 주세요.')
        return
      }
    }

    screeningPortfolioFileRef.current = file
    setScreeningAnswers((prev) => ({
      ...prev,
      portfolioFileName: file?.name ?? '',
      portfolioFileSize: file ? String(file.size) : '',
      portfolioFileMimeType: file?.type ?? '',
    }))
    if (file) {
      setMissingScreeningFields((prev) => prev.filter((field) => field !== 'portfolioFileName'))
    }
    setScreeningError('')
    setScreeningSubmitMessage('')
  }, [])

  const resetToConsent = useCallback(() => {
    setScreeningAnswers(INITIAL_SCREENING_ANSWERS)
    setScreeningError('')
    setMissingScreeningFields([])
    setShowScreeningThanks(false)
    setIsSubmittingScreening(false)
    setScreeningSubmitMessage('')
    screeningPortfolioFileRef.current = null
    setParticipantInput('')
    setParticipantError('')
    setStep('consent')
  }, [])

  const confirmScreening = useCallback(() => {
    const missingFields = getMissingScreeningFields(screeningAnswers)
    if (missingFields.length > 0) {
      setMissingScreeningFields(missingFields)
      setScreeningError('기입하지 않은 문항을 확인해 주세요. 빨간색으로 표시된 항목은 필수입니다.')
      return
    }

    if (!isValidEmailAddress(screeningAnswers.email)) {
      setMissingScreeningFields(['email'])
      setScreeningError('이메일 주소가 올바르지 않습니다. 예: name@example.com 형식으로 다시 확인해 주세요.')
      return
    }

    if (!screeningPortfolioFileRef.current) {
      setMissingScreeningFields(['portfolioFileName'])
      setScreeningError('포트폴리오 첨부를 위해 파일을 다시 선택해 주세요.')
      return
    }

    const invalidReason = getScreeningInvalidReason(screeningAnswers)
    if (invalidReason) {
      setMissingScreeningFields([])
      setScreeningBlockMessage(
        `${invalidReason} 본 실험의 참여 조건에 해당하지 않아 다음 단계로 이동할 수 없습니다. 연락처와 메일로 문의 바랍니다.`
      )
      logEvent('screening_blocked', {
        detail: '실험 조건 불일치로 참여 차단',
        payload: {
          answers: screeningAnswers,
          reason: invalidReason,
        },
      })
      setShowScreeningThanks(false)
      return
    }

    setScreeningError('')
    setMissingScreeningFields([])
    setScreeningSubmitMessage('')
    setShowScreeningThanks(true)
  }, [screeningAnswers, logEvent])

  const submitScreeningApplication = useCallback(async () => {
    if (isSubmittingScreening) return

    setScreeningError('')
    setScreeningSubmitMessage('')
    setIsSubmittingScreening(true)
    try {
      const portfolioFile = screeningPortfolioFileRef.current
      if (!portfolioFile) {
        throw new Error('포트폴리오 파일이 선택되지 않았습니다.')
      }

      await sendScreeningApplication(screeningAnswers, portfolioFile)

      logEvent('screening_passed', {
        detail: '실험참여자 기본 문항 신청 완료 및 이메일 전송 요청',
        payload: {
          answers: screeningAnswers,
          delivery: 'google_apps_script',
          endpoint: SCREENING_API_URL,
        },
      })
      setShowScreeningThanks(false)
      startExperimentSession(createAutoParticipantId(screeningAnswers), 'screening_auto')
    } catch (error) {
      setScreeningSubmitMessage('신청 내용을 이메일 시스템으로 보내지 못했습니다. 네트워크 연결을 확인한 뒤 다시 눌러 주세요.')
      logEvent('screening_submit_failed', {
        detail: '실험참여자 기본 문항 이메일 전송 실패',
        payload: {
          error: String(error),
          answers: screeningAnswers,
        },
      })
    } finally {
      setIsSubmittingScreening(false)
    }
  }, [isSubmittingScreening, screeningAnswers, logEvent, startExperimentSession])

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
    setRightTab(decision === '보류' ? 'hold' : 'exclude')

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
      },
    })
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
    const needsCollab = cond === 'collab' || cond === 'ai'
    const needsAiOnly = cond === 'ai'
    const missingYesNo = postSurveyAnswers.q1 === null || postSurveyAnswers.q2 === null
    const missingLikert = [postSurveyAnswers.q3, postSurveyAnswers.q4, postSurveyAnswers.q5].some((v) => v === null)
      || (needsCollab && [postSurveyAnswers.q6, postSurveyAnswers.q7].some((v) => v === null))
      || (needsAiOnly && postSurveyAnswers.q8 === null)
    if (missingYesNo || missingLikert) {
      setPostSurveyError('모든 문항을 응답해 주세요.')
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
        participantId,
        conditionType: activeAssignment.conditionLabel,
        setId: activeAssignment.setId,
        selectedFinalLogoId: finalSelectedStimulusId,
        manipulationCheckRecommendation: postSurveyAnswers.q1,
        manipulationCheckScoreRank: postSurveyAnswers.q2,
        confidenceScore: postSurveyAnswers.q3,
        agencyScore: postSurveyAnswers.q4,
        perceivedAiInterventionScore: postSurveyAnswers.q5,
        aiTrustScore: postSurveyAnswers.q6 ?? null,
        aiUsefulnessScore: postSurveyAnswers.q7 ?? null,
        aiScoreBiasScore: postSurveyAnswers.q8 ?? null,
        freeText: postSurveyAnswers.freeText || null,
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
    if (debriefCheckAnswers.suspected === null) {
      setDebriefCheckError('응답을 선택해 주세요.')
      return
    }
    if (debriefCheckAnswers.suspected === 'yes' && debriefCheckAnswers.suspectedTiming === null) {
      setDebriefCheckError('의심한 시점을 선택해 주세요.')
      return
    }
    setDebriefCheckError('')
    logEvent('debriefing_check', {
      detail: '의심 여부 확인',
      payload: {
        participantId,
        suspectedWoZ: debriefCheckAnswers.suspected === 'yes',
        suspectedTiming: debriefCheckAnswers.suspectedTiming,
        suspectedReason: debriefCheckAnswers.suspectedReason || null,
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
  const showScreeningScreen = step === 'screening'
  const showBrief = step === 'brief' && activeAssignment && activeBrief
  const showInstruction = step === 'instruction' && activeAssignment && activeBrief
  const showEvaluation = step === 'evaluation' && activeAssignment && activeBrief
  const showResult = step === 'result' && activeAssignment && activeBrief
  const showPostSurvey = step === 'post_survey' && activeAssignment
  const showCompSurvey = step === 'comparison_survey'
  const showDebriefCheck = step === 'debriefing_check'
  const showDebriefing = step === 'debriefing'
  const showAppHeader = !showConsentScreen && !showScreeningScreen
  const screeningEmailIsCompleteAndValid = isValidEmailAddress(screeningAnswers.email)
  const screeningAllRequiredComplete = getMissingScreeningFields(screeningAnswers).length === 0 && screeningEmailIsCompleteAndValid

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
            <div>참가자 ID: {participantId || '-'}</div>
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
                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>실험 목적</h2>
                  <p>
                    본 실험은 생성형 AI 기반 로고 디자인 환경에서 전문 디자이너가 로고 시안을 판단하는 과정을
                    분석하기 위한 연구입니다. AI 판단 정보가 제시되는 범위에 따라 참가자가 시안을 어떻게 후보유지,
                    제외, 변경, 최종 선택하는지를 확인하고자 합니다.
                  </p>
                  <p style={{ marginTop: 14 }}>
                    본 실험은 로고 시안의 단순한 미적 우열을 평가하는 것이 아니라, 브랜드 브리프를 바탕으로 전문
                    디자이너가 어떤 기준과 과정으로 시안을 판단하는지를 살펴보는 데 목적이 있습니다. 참가자께서는
                    실제 실무에서 후보 시안을 검토하듯이, 제시된 브랜드 맥락과 로고 시안을 바탕으로 판단해 주시면
                    됩니다.
                  </p>
                  <p style={{ marginTop: 14 }}>
                    수집되는 자료는 시안 판단 과정과 간단한 평가 응답이며, 연구 목적 이외의 용도로 사용되지 않습니다.
                    모든 자료는 익명화하여 분석됩니다. 또한 제출해 주신 포트폴리오는 참가자 자격 요건 확인을 위한
                    참고 자료로만 사용되며, 실험 자료로 수집·분석되지 않습니다. 자격 확인이 완료된 후 포트폴리오
                    자료는 별도로 보관하지 않고 폐기됩니다.
                  </p>
                  <p style={{ marginTop: 14 }}>
                    본 실험에는 정답이 없으므로, 본인의 전문적 판단에 따라 자연스럽게 응답해 주시면 됩니다.
                  </p>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>연구자 정보</h2>
                  <p>연구자: 강은영</p>
                  <p>소속: 홍익대학교 대학원 시각디자인 전공 박사과정</p>
                  <p>이메일: kjully1492@gmail.com</p>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>실험 내용</h2>
                  <ol style={{ display: 'grid', gap: 4, paddingLeft: 20 }}>
                    <li>브랜드 브리프 확인</li>
                    <li>AI 로고 시안 확인</li>
                    <li>시안 후보유지 / 제외</li>
                    <li>후보유지 시안 상세 평가</li>
                    <li>최종 시안 선택</li>
                    <li>사후 설문 응답</li>
                  </ol>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>예상 소요 시간</h2>
                  <p>약 20~30분</p>
                </section>

                <section>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 10 }}>윤리 및 개인정보 안내</h2>
                  <ul style={{ display: 'grid', gap: 4, paddingLeft: 20 }}>
                    <li>응답 데이터는 연구 목적으로만 사용됩니다.</li>
                    <li>개인 식별 정보는 익명화 처리됩니다.</li>
                    <li>실험 중 언제든 참여를 중단할 수 있습니다.</li>
                    <li>일부 실험 정보는 조건 간 비교를 위해 사전에 구성된 자극일 수 있습니다.</li>
                    <li>실험 종료 후 디브리핑(실험 과정 보고)가 제공됩니다.</li>
                  </ul>
                </section>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingTop: 8 }}>
                  <button
                    onClick={() => {
                      setScreeningError('')
                      setStep('screening')
                    }}
                    style={{ border: 'none', background: '#000000', color: '#ffffff', borderRadius: 8, padding: '16px 12px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
                  >
                    참여합니다.
                  </button>
                  <button
                    onClick={() => {
                      setScreeningBlockMessage('참여하지 않습니다. 실험 참여가 종료됩니다.')
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

        {showScreeningScreen && (
          <div style={{ minHeight: '100%', display: 'grid', placeItems: 'start center', padding: '42px 0 36px' }}>
            <section style={{ width: 'min(760px, 92vw)', background: '#ffffff', color: '#111111' }}>
              <div style={{ textAlign: 'center', marginBottom: 36 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 10 }}>
                  실험 참여자 신청 문항
                </h1>
              </div>

              <div style={{ display: 'grid', gap: 30 }}>
                {SCREENING_QUESTIONS.map((question) => {
                  const isMissing = missingScreeningFields.includes(question.id)

                  return (
                    <section
                      key={question.id}
                      style={{
                        display: 'grid',
                        gap: 12,
                        border: `1px solid ${isMissing ? '#dc2626' : 'transparent'}`,
                        background: isMissing ? '#fff5f5' : '#ffffff',
                        borderRadius: 10,
                        padding: isMissing ? 12 : 0,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isMissing ? '#b91c1c' : '#111111' }}>{question.title}</div>
                        {isMissing && <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626' }}>필수 입력</div>}
                      </div>

                      {question.type === 'text' && (
                        <input
                          value={screeningAnswers[question.id]}
                          onChange={(event) => updateScreeningAnswer(question.id, event.target.value)}
                          placeholder={question.placeholder}
                          style={{
                            width: '100%',
                            border: `1px solid ${isMissing ? '#dc2626' : 'rgba(17,17,17,.18)'}`,
                            borderRadius: 8,
                            padding: '12px 13px',
                            fontSize: 14,
                            outline: 'none',
                            background: '#ffffff',
                          }}
                        />
                      )}

                      {question.type === 'file' && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <input
                            type='file'
                            accept='.pdf,.jpg,.jpeg,application/pdf,image/jpeg'
                            onChange={(event) => updateScreeningPortfolio(event.target.files?.[0] ?? null)}
                            style={{
                              width: '100%',
                              border: `1px solid ${isMissing ? '#dc2626' : 'rgba(17,17,17,.18)'}`,
                              borderRadius: 8,
                              padding: '11px 12px',
                              fontSize: 14,
                              background: '#ffffff',
                            }}
                          />
                          {screeningAnswers.portfolioFileName && (
                            <div style={{ fontSize: 12, color: '#374151' }}>
                              선택된 파일: {screeningAnswers.portfolioFileName}
                            </div>
                          )}
                          {question.helper && (
                            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{question.helper}</div>
                          )}
                        </div>
                      )}

                      {question.type === 'radio' && (
                        <div style={{ display: 'grid', gap: 11 }}>
                          {(question.options ?? []).map((option) => {
                            const selected = screeningAnswers[question.id] === option
                            return (
                              <label
                                key={`${question.id}-${option}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#111827', cursor: 'pointer' }}
                              >
                                <input
                                  type='radio'
                                  name={question.id}
                                  value={option}
                                  checked={selected}
                                  onChange={() => updateScreeningAnswer(question.id, option)}
                                  style={{ width: 17, height: 17, accentColor: isMissing ? '#dc2626' : '#111111' }}
                                />
                                {option}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>

              {screeningError && (
                <div style={{ marginTop: 20, border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 8, padding: '10px 12px', color: '#b91c1c', fontSize: 13, fontWeight: 800 }}>
                  {screeningError}
                </div>
              )}

              <button
                onClick={confirmScreening}
                disabled={isSubmittingScreening}
                style={{
                  width: '100%',
                  marginTop: 30,
                  border: 'none',
                  background: isSubmittingScreening ? '#6b7280' : screeningAllRequiredComplete ? '#111111' : '#9ca3af',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '15px 12px',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: isSubmittingScreening ? 'wait' : 'pointer',
                }}
              >
                {isSubmittingScreening ? '신청 내용 전송 중...' : '확인'}
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
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111111', marginBottom: 8 }}>브랜드 브리프</div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, overflow: 'auto', paddingRight: 2, flex: 1, minHeight: 0, alignContent: 'start', alignItems: 'start' }}>
                  {cards.map((card) => {
                    const isActive = activeStimulusId === card.stimulus.id
                    const isDecided = !!card.initialDecision

                    return (
                      <div
                        key={card.stimulus.id}
                        onClick={() => {
                          setActiveStimulusId(card.stimulus.id)
                        }}
                        data-click-log={`시안 카드 선택:${card.stimulus.id}`}
                        data-stimulus-id={card.stimulus.id}
                        style={{ border: `1px solid ${isActive ? currentConditionColor : 'rgba(17,17,17,.14)'}`, borderRadius: 12, background: '#ffffff', padding: 8, cursor: 'pointer' }}
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

                        <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 10, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.08)', display: 'grid', placeItems: 'center', marginBottom: 8, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />

                        {activeAssignment.condition === 'ai' && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 2 }}>
                              {card.stimulus.aiRank != null ? `${card.stimulus.aiRank}위` : '-'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#555555' }}>
                              AI 시각 평가 {card.stimulus.aiRank != null ? `${100 - Math.floor((card.stimulus.aiRank - 1) * 3.75)}점` : '-'}
                            </div>
                          </div>
                        )}

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
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => window.open('/log-viewer', '_blank', 'width=1200,height=800')}
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                      {initialHoldCards.map((card) => {
                        const cardDetailNotice = detailNotice?.stimulusId === card.stimulus.id ? detailNotice.message : ''
                        return (
                          <div
                            key={`hold-${card.stimulus.id}`}
                            style={{ border: `1px solid ${finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : 'rgba(17,17,17,.14)'}`, background: '#ffffff', borderRadius: 8, padding: '8px 9px', opacity: finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? 0.4 : 1, pointerEvents: (finalSelectedStimulusId && finalSelectedStimulusId !== card.stimulus.id ? 'none' : 'auto') as React.CSSProperties['pointerEvents'], transition: 'opacity 0.2s' }}
                          >
                            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, background: '#f7f7f7', border: '1px solid rgba(17,17,17,.07)', display: 'grid', placeItems: 'center', marginBottom: 7, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: renderLogoSvg(card.stimulus) }} />
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 1 }}>
                              {card.stimulus.id}{activeAssignment.condition === 'ai' ? ` · ${card.stimulus.name}` : ''}
                            </div>
                            {activeAssignment.condition === 'ai' && (
                              <div style={{ fontSize: 12, color: '#666666', marginBottom: 8 }}>{card.stimulus.meta}</div>
                            )}

                            <div style={{ borderTop: '1px solid rgba(17,17,17,.08)', paddingTop: 8, display: 'grid', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#333333', marginBottom: 4 }}>
                                  1. 브랜드 종합 적합도
                                </div>
                                <div style={{ fontSize: 11, color: '#666666', marginBottom: 5 }}>이 로고 시안이 브랜드 브리프에 얼마나 적합한가?</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <button
                                      key={`${card.stimulus.id}-hold-brand-${v}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'brand', v)}
                                      style={{ border: `1px solid ${card.brandOverallScore === v ? currentConditionColor : 'rgba(17,17,17,.18)'}`, background: card.brandOverallScore === v ? currentConditionColor : '#ffffff', color: card.brandOverallScore === v ? '#ffffff' : '#333333', borderRadius: 5, padding: '4px 0', fontSize: 13, fontWeight: card.brandOverallScore === v ? 800 : 500, cursor: 'pointer' }}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#333333', marginBottom: 4 }}>
                                  2. 시각 종합 완성도
                                </div>
                                <div style={{ fontSize: 11, color: '#666666', marginBottom: 5 }}>이 로고 시안이 시각적으로 얼마나 완성도 있는가?</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                                  {[1, 2, 3, 4, 5].map((v) => (
                                    <button
                                      key={`${card.stimulus.id}-hold-visual-${v}`}
                                      onClick={() => updateDetailOverallScore(card.stimulus.id, 'visual', v)}
                                      style={{ border: `1px solid ${card.visualOverallScore === v ? currentConditionColor : 'rgba(17,17,17,.18)'}`, background: card.visualOverallScore === v ? currentConditionColor : '#ffffff', color: card.visualOverallScore === v ? '#ffffff' : '#333333', borderRadius: 5, padding: '4px 0', fontSize: 13, fontWeight: card.visualOverallScore === v ? 800 : 500, cursor: 'pointer' }}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#333333', marginBottom: 3 }}>
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
                                        style={{ border: `1px solid ${selected ? currentConditionColor : 'rgba(17,17,17,.15)'}`, background: selected ? currentConditionColor : atMax ? '#f5f5f5' : '#ffffff', color: selected ? '#ffffff' : atMax ? '#aaaaaa' : '#333333', borderRadius: 999, padding: '5px 4px', fontSize: 11, fontWeight: selected ? 800 : 500, cursor: 'pointer' }}
                                      >
                                        {criterion}
                                      </button>
                                    )
                                  })}
                                </div>
                                {cardDetailNotice && (
                                  <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '5px 7px', lineHeight: 1.5 }}>
                                    {cardDetailNotice}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <button
                                onClick={() => cancelInitialDecision(card.stimulus.id)}
                                className='btn-interact btn-hold'
                                style={{ border: '1px solid rgba(75,85,99,.3)', background: '#ffffff', color: '#333333', borderRadius: 7, padding: '6px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
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
                                style={{ border: `1px solid ${finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : 'rgba(17,17,17,.3)'}`, background: finalSelectedStimulusId === card.stimulus.id ? currentConditionColor : '#f3f4f6', color: finalSelectedStimulusId === card.stimulus.id ? '#ffffff' : '#111827', borderRadius: 7, padding: '6px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                              >
                                {finalSelectedStimulusId === card.stimulus.id ? '최종선택 ✓' : '최종선택'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
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
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#111111' }}>
                              {card.stimulus.id}
                              {activeAssignment.condition === 'ai' ? ` · ${card.stimulus.name}` : ''}
                            </div>
                            {activeAssignment.condition === 'ai' && (
                              <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{card.stimulus.meta}</div>
                            )}
                          </button>
                          <div style={{ marginTop: 7 }}>
                            <button
                              onClick={() => cancelInitialDecision(card.stimulus.id)}
                              className='btn-interact btn-exclude'
                              style={{ width: '100%', border: '1px solid rgba(107,114,128,.3)', background: '#ffffff', color: '#333333', borderRadius: 7, padding: '6px 0', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
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
          const needsCollab = cond === 'collab' || cond === 'ai'
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

                {/* Q1·Q2: 조작 점검 — 예/아니오 */}
                {POST_SURVEY_MANIPULATION.map(({ key, text }) => {
                  const val = postSurveyAnswers[key]
                  return (
                    <div key={key} style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.55 }}>{text}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['yes', 'no'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setPostSurveyAnswers((prev) => ({ ...prev, [key]: v }))}
                            style={{
                              border: `1px solid ${val === v ? '#111111' : 'rgba(17,17,17,.18)'}`,
                              background: val === v ? '#111111' : '#ffffff',
                              color: val === v ? '#ffffff' : '#333333',
                              borderRadius: 8, padding: '8px 28px', fontSize: 13, fontWeight: val === v ? 700 : 400, cursor: 'pointer',
                            }}
                          >{v === 'yes' ? '예' : '아니오'}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}

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
                    이번 조건에서 가장 판단하기 어려웠던 점이 있다면 간단히 적어 주세요.
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>선택 입력</div>
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
                  AI 추천 또는 평가 정보가 판단에 도움이 되었거나 방해가 되었다고 느낀 이유를 간단히 적어 주세요.
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>선택 입력</div>
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
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>의심 여부 확인</div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.6 }}>
                  실험 중 제시된 AI 추천 또는 AI 평가 정보가 실제 AI가 실시간으로 산출한 정보가 아닐 수 있다고 의심한 적이 있습니까?
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['yes', 'no'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setDebriefCheckAnswers((prev) => ({ ...prev, suspected: v, suspectedTiming: v === 'no' ? null : prev.suspectedTiming }))}
                      style={{
                        border: `1px solid ${debriefCheckAnswers.suspected === v ? '#111111' : 'rgba(17,17,17,.18)'}`,
                        background: debriefCheckAnswers.suspected === v ? '#111111' : '#ffffff',
                        color: debriefCheckAnswers.suspected === v ? '#ffffff' : '#333333',
                        borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: debriefCheckAnswers.suspected === v ? 700 : 400, cursor: 'pointer',
                      }}
                    >{v === 'yes' ? '예' : '아니오'}</button>
                  ))}
                </div>
              </div>

              {debriefCheckAnswers.suspected === 'yes' && (
                <>
                  <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 10 }}>어느 시점에서 그렇게 느꼈습니까?</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DEBRIEF_TIMING_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setDebriefCheckAnswers((prev) => ({ ...prev, suspectedTiming: opt }))}
                          style={{
                            border: `1px solid ${debriefCheckAnswers.suspectedTiming === opt ? '#111111' : 'rgba(17,17,17,.18)'}`,
                            background: debriefCheckAnswers.suspectedTiming === opt ? '#111111' : '#ffffff',
                            color: debriefCheckAnswers.suspectedTiming === opt ? '#ffffff' : '#333333',
                            borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: debriefCheckAnswers.suspectedTiming === opt ? 700 : 400, cursor: 'pointer',
                          }}
                        >{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 12, padding: 14, background: '#ffffff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111111', marginBottom: 4 }}>그렇게 느낀 이유를 간단히 적어 주세요.</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>선택 입력</div>
                    <textarea
                      value={debriefCheckAnswers.suspectedReason}
                      onChange={(e) => setDebriefCheckAnswers((prev) => ({ ...prev, suspectedReason: e.target.value }))}
                      placeholder='자유롭게 입력해 주세요.'
                      rows={3}
                      style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </>
              )}

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
            <div style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 14, padding: 20, background: '#f7f7f7' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4d4d4d', marginBottom: 6 }}>디브리핑</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111111', marginBottom: 18 }}>연구 참여에 감사드립니다.</div>
              <div style={{ display: 'grid', gap: 14, fontSize: 14, lineHeight: 1.8, color: '#1f2937' }}>
                <p>
                  본 실험은 AI 로고 생성 도구의 성능을 평가하는 연구가 아니라, AI 판단 정보 제시 범위에 따라 전문 디자이너의 로고 시안 판단 과정이 어떻게 달라지는지를 확인하기 위한 연구입니다.
                </p>
                <p>
                  실험에서 제시된 AI 추천 정보와 AI 평가 정보는 조건 간 비교와 자극 통제를 위해 사전에 구성된 정보일 수 있습니다. 이는 모든 참가자에게 동일한 조건을 제공하고, 실험 결과의 비교 가능성을 확보하기 위한 절차입니다.
                </p>
                <p>
                  수집된 자료는 참가자 코드로 가명처리되어 분석되며, 이름, 이메일, 포트폴리오 등 개인 식별 정보는 실험 분석에 사용되지 않습니다.
                </p>
                <p>
                  연구 참여에 감사드립니다. 연구 참여 후에도 자료 철회나 문의가 필요한 경우 연구자에게 연락하실 수 있습니다.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('completed')}
                style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                실험 종료
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

      {showScreeningThanks && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.52)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => {
            if (!isSubmittingScreening) setShowScreeningThanks(false)
          }}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 18, padding: '30px 28px', maxWidth: 500, width: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.28)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 12 }}>
              신청 내용 확인
            </div>
            <div style={{ fontSize: 15, color: '#333333', lineHeight: 1.75, marginBottom: 22 }}>
              아래 신청 내용이 맞으면 확인을 눌러 주세요.<br />
              확인을 누르면 이메일로 자동 전송됩니다.
            </div>
            {screeningSubmitMessage && (
              <div style={{ border: '1px solid #dc2626', background: '#fff5f5', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#b91c1c', lineHeight: 1.55, marginBottom: 14, fontWeight: 800 }}>
                {screeningSubmitMessage}
              </div>
            )}
            <div style={{ background: '#f7f7f7', border: '1px solid rgba(17,17,17,.1)', borderRadius: 10, padding: '11px 12px', fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 22 }}>
              실험 신청자: {screeningAnswers.fullName || '-'}<br />
              이메일: {screeningAnswers.email || '-'}<br />
              포트폴리오: {screeningAnswers.portfolioFileName || '-'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => {
                  setShowScreeningThanks(false)
                  setScreeningSubmitMessage('')
                }}
                disabled={isSubmittingScreening}
                style={{ width: '100%', border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 800, cursor: isSubmittingScreening ? 'not-allowed' : 'pointer' }}
              >
                수정하기
              </button>
              <button
                onClick={submitScreeningApplication}
                disabled={isSubmittingScreening}
                style={{ width: '100%', border: 'none', background: isSubmittingScreening ? '#6b7280' : '#111111', color: '#ffffff', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 800, cursor: isSubmittingScreening ? 'wait' : 'pointer' }}
              >
                {isSubmittingScreening ? '전송 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {screeningBlockMessage && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.52)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => {
            setScreeningBlockMessage('')
          }}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 18, padding: '30px 28px', maxWidth: 520, width: '90vw', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,.28)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 12 }}>
              실험 참여 안내
            </div>
            <div style={{ fontSize: 14, color: '#333333', lineHeight: 1.75, marginBottom: 14 }}>
              {screeningBlockMessage}
            </div>
            <div style={{ background: '#f7f7f7', border: '1px solid rgba(17,17,17,.1)', borderRadius: 10, padding: '11px 12px', fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 22 }}>
              연구 관련 문의는 연구자 연락처와 이메일로 문의 바랍니다.<br />
              이메일: {SCREENING_RECIPIENT_EMAIL}
            </div>
            <button
              onClick={() => {
                setScreeningBlockMessage('')
              }}
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
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111111', marginBottom: 10 }}>실험을 완료하시겠습니까?</div>
            <div style={{ fontSize: 13, color: '#555555', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: '#111111' }}>{finalSelectedStimulusId}</strong> 시안을 최종 시안으로 확정합니다.
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

