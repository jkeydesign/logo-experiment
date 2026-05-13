import type {
  AxisScores,
  BrandBrief,
  Condition,
  ConditionAssignment,
  ConditionLabel,
  Logo,
  SetId,
} from '@/types'

export const CONDITION_LABELS: Record<Condition, ConditionLabel> = {
  human: '인간 전략 주도형',
  collab: '협업 전략 주도형',
  ai: 'AI 전략 주도형',
  mixed: '협업 전략 주도형',
}

export const CONDITION_GUIDES: Record<Condition, string[]> = {
  human: [
    'AI 정보 없이 로고 시안만 제시됩니다.',
    '각 시안의 8개 평가 판단 척도를 직접 입력해야 합니다.',
    '각 시안을 반드시 보류 또는 제외로 분류해야 다음 단계로 이동할 수 있습니다.',
  ],
  collab: [
    'AI 추천 시안 2개가 표시됩니다.',
    'AI 평가 점수는 제공되지 않습니다.',
    '추천 정보를 참고하거나 무시할 수 있으며, 각 시안을 보류/제외로 분류해야 합니다.',
  ],
  ai: [
    'AI 추천 시안 2개와 전체 6개 시안의 AI 평가 제안 점수가 제공됩니다.',
    '참가자는 AI 평가 제안을 유지하거나 수정할 수 있습니다.',
    '수정 전후 점수와 수정 방향이 모두 로그로 저장됩니다.',
  ],
  mixed: [
    'AI 추천 시안 2개가 표시됩니다.',
    'AI 평가 점수는 제공되지 않습니다.',
    '추천 정보를 참고하거나 무시할 수 있으며, 각 시안을 보류/제외로 분류해야 합니다.',
  ],
}

export const AXIS_LABELS = [
  { id: 'brand_fit', name: '브랜드 적합성', desc: '포지셔닝과 가치 키워드를 담아내는가?', group: 'brand' },
  { id: 'target_fit', name: '타깃 적합성', desc: '타깃에게 의도한 의미가 전달되는가?', group: 'brand' },
  { id: 'comp_diff', name: '경쟁 차별성', desc: '경쟁사의 시각 특성과 충분히 구분되는가?', group: 'brand' },
  { id: 'scalable', name: '확장 가능성', desc: '다양한 매체와 응용 환경에서 일관되게 작동하는가?', group: 'brand' },
  { id: 'timeless', name: '시간 지속성', desc: '5~10년 후에도 유효한 형태인가?', group: 'brand' },
  { id: 'natural', name: '자연성', desc: '이 형태는 직관적으로 읽히고 친숙하게 느껴지는가?', group: 'visual' },
  { id: 'harmony', name: '조화성', desc: '시각 요소들이 균형 있고 안정적으로 배치되어 있는가?', group: 'visual' },
  { id: 'refinement', name: '정교성', desc: '단순하거나 복잡한 정도, 즉 디자인의 풍부함이 이 브랜드에 적절한 수준인가?', group: 'visual' },
] as const

export const AXES_BRAND = AXIS_LABELS
  .filter((axis) => axis.group === 'brand')
  .map((axis) => ({ id: axis.id, name: axis.name, sub: axis.desc }))

export const AXES_VISUAL = AXIS_LABELS
  .filter((axis) => axis.group === 'visual')
  .map((axis) => ({ id: axis.id, name: axis.name, sub: axis.desc }))

export const ALL_AXES = [...AXES_BRAND, ...AXES_VISUAL]

export const BRAND_AXIS_IDS = ['brand_fit', 'target_fit', 'comp_diff', 'scalable', 'timeless'] as const
export const VISUAL_AXIS_IDS = ['natural', 'harmony', 'refinement'] as const

const BRAND_JUDGE_AXES = [
  '① 브랜드 적합성 ? 포지셔닝과 가치 키워드를 담아내는가?',
  '② 타깃 적합성 ? 타깃에게 의도한 의미가 전달되는가?',
  '③ 경쟁 차별성 ? 경쟁사의 시각 특성과 충분히 구분되는가?',
  '④ 확장 가능성 ? 다양한 매체와 응용 환경에서 일관되게 작동하는가?',
  '⑤ 시간 지속성 ? 5~10년 후에도 유효한 형태인가?',
  '⑥ 자연성 ? 이 형태는 직관적으로 읽히고 친숙하게 느껴지는가?',
  '⑦ 조화성 ? 시각 요소들이 균형 있고 안정적으로 배치되어 있는가?',
  '⑧ 정교성 ? 단순하거나 복잡한 정도, 즉 디자인의 풍부함이 이 브랜드에 적절한 수준인가?',
]

export const BRIEF_LIBRARY: Record<string, BrandBrief> = {
  F0001: {
    code: 'F0001',
    name: 'Funipets',
    category: '반려동물 동반 라이프스타일 가구 브랜드',
    target: '반려동물과 함께 생활하며 가구의 실용성과 감성적 분위기를 함께 고려하는 20~30대 남녀 소비자',
    positioning: '반려동물 브랜드에서 흔한 발바닥·동물 얼굴·캐릭터형 심볼 중심의 귀여운 이미지에서 벗어나, 가구 브랜드로서의 정돈된 생활감과 반려동물 브랜드로서의 부드러운 친근함을 결합한 라이프스타일 가구 브랜드로 위치시킨다.',
    competitors: '반려동물 가구 및 라이프스타일 브랜드는 부드러운 곡선, 동물 실루엣, 따뜻한 색감, 심플한 산세리프 서체를 주로 사용한다. 캐릭터형 심볼, 발바닥, 고양이·강아지 형태를 직접 활용하는 사례가 많다.',
    environments: ['오프라인 매장 간판', '명함', '온라인 홍보 배너', '카드뉴스', 'SNS 프로필', '제품 라벨'],
    keywords: ['공존', '따뜻함', '곡선성', '친근함', '생활감', '대중성'],
    judgeAxes: BRAND_JUDGE_AXES,
  },
  B0002: {
    code: 'B0002',
    name: 'BeauMe',
    category: '헤어 뷰티숍',
    target: '자신에게 어울리는 헤어스타일과 아름다움을 찾고자 하는 20~40대 여성 고객',
    positioning: '헤어 뷰티숍에서 흔한 얼굴 실루엣, 헤어 라인, 골드 계열의 고급 살롱 이미지와 구분되도록, 과시적 고급감보다 자기다움과 편안한 아름다움을 강조하는 여성 뷰티 브랜드로 위치시킨다.',
    competitors: '헤어 뷰티숍 로고는 여성적 곡선, 얼굴 또는 헤어 라인 실루엣, 얇은 세리프·산세리프 서체, 골드·베이지·블랙 계열 색상을 자주 사용한다. 고급 살롱 계열은 여백이 넓고 세련된 워드마크 중심 구성이 많다.',
    environments: ['오프라인 매장 간판', '명함', '온라인 홍보 배너', '카드뉴스', 'SNS 프로필', '예약 페이지', '가격표'],
    keywords: ['자기다움', '아름다움', '우아함', '편안함', '빛남', '여성성'],
    judgeAxes: BRAND_JUDGE_AXES,
  },
  W0003: {
    code: 'W0003',
    name: 'Wailastic Spine Orthopedics / 웰라스틱 척추전문 정형외과',
    category: '척추 전문 정형외과',
    target: '척추·허리 건강 문제를 관리하고 전문적 치료를 기대하는 40~60대 이상 중장년층',
    positioning: '정형외과 로고에서 흔한 십자, 척추 도상, 블루·그린 계열의 차갑고 기능적인 의료 이미지를 넘어, 전문성과 신뢰감을 유지하면서도 회복 이후의 움직임과 생활 활력을 강조하는 척추 전문 병원 브랜드로 위치시킨다.',
    competitors: '정형외과 및 척추 전문 병원 로고는 블루·그린 계열 색상, 십자, 척추 형태, 사람 실루엣, 곧은 산세리프 서체를 주로 사용한다. 의료기관 특성상 직선적 구조, 안정적인 비례, 신뢰감을 주는 색상 대비가 많이 나타난다.',
    environments: ['병원 간판', '명함', '진료 안내문', '온라인 홍보 배너', '카드뉴스', '병원 홈페이지', '예약 시스템', '진료 파일', '사인 시스템'],
    keywords: ['척추 건강', '회복', '탄력성', '신뢰감', '전문성', '인간적 돌봄', '건강한 노화'],
    judgeAxes: BRAND_JUDGE_AXES,
  },
}

export const SET_BRIEF_MAP: Record<SetId, string> = {
  A: 'F0001',
  B: 'B0002',
  C: 'W0003',
}

const STIMULUS_SETS: Record<SetId, Logo[]> = {
  A: [
    { id: 'A1', name: 'Funipets 워드마크 A', meta: '라운드 산세리프 · 생활형 균형', style: 'sans', color: '#111111', isAiRecommended: true, aiRank: 1 },
    { id: 'A2', name: 'Funipets 심볼+텍스트 B', meta: '유기 곡선 · 따뜻한 가구 감성', style: 'symbol', color: '#1f2937', isAiRecommended: true, aiRank: 2 },
    { id: 'A3', name: 'Funipets 모노그램 C', meta: 'F/P 이니셜 · 심플 구조', style: 'mono', color: '#374151', aiRank: 3 },
    { id: 'A4', name: 'Funipets 배지형 D', meta: '가구 라벨형 · 친근 톤', style: 'badge', color: '#4b5563', aiRank: 4 },
    { id: 'A5', name: 'Funipets 레터마크 E', meta: '소프트 볼드 · 대중적 인상', style: 'letter', color: '#6b7280', aiRank: 5 },
    { id: 'A6', name: 'Funipets 세리프 F', meta: '정돈감 · 생활 프리미엄', style: 'serif', color: '#111827', aiRank: 6 },
    { id: 'A7', name: 'Funipets 라인심볼 G', meta: '곡선 라인 · 공존 이미지', style: 'script', color: '#333333', aiRank: 7 },
    { id: 'A8', name: 'Funipets 아이콘형 H', meta: '생활 소품형 · 친근한 기호', style: 'icon', color: '#4d4d4d', aiRank: 8 },
    { id: 'A9', name: 'Funipets 세리프 조합 I', meta: '차분한 프리미엄 · 균형형', style: 'serif2', color: '#666666', aiRank: 9 },
  ],
  B: [
    { id: 'B1', name: 'BeauMe 워드마크 A', meta: '슬림 세리프 · 우아한 균형', style: 'serif', color: '#111111', isAiRecommended: true, aiRank: 1 },
    { id: 'B2', name: 'BeauMe 미니멀 B', meta: '미세 자간 · 차분한 여성성', style: 'sans', color: '#1f2937', isAiRecommended: true, aiRank: 2 },
    { id: 'B3', name: 'BeauMe 모노그램 C', meta: 'B/M 조합 · 자기다움 강조', style: 'mono', color: '#374151', aiRank: 3 },
    { id: 'B4', name: 'BeauMe 심볼형 D', meta: '부드러운 라인 · 편안한 뉘앙스', style: 'symbol', color: '#4b5563', aiRank: 4 },
    { id: 'B5', name: 'BeauMe 배지형 E', meta: '예약/가격표 적용형', style: 'badge', color: '#6b7280', aiRank: 5 },
    { id: 'B6', name: 'BeauMe 레터마크 F', meta: '간결 볼드 · 가독 중심', style: 'letter', color: '#111827', aiRank: 6 },
    { id: 'B7', name: 'BeauMe 스크립트 G', meta: '흐름감 · 편안한 아름다움', style: 'script', color: '#333333', aiRank: 7 },
    { id: 'B8', name: 'BeauMe 아이콘형 H', meta: '빛남 기호 · SNS 적용형', style: 'icon', color: '#4d4d4d', aiRank: 8 },
    { id: 'B9', name: 'BeauMe 세리프 조합 I', meta: '여백 중심 · 우아한 구조', style: 'serif2', color: '#666666', aiRank: 9 },
  ],
  C: [
    { id: 'C1', name: 'Wailastic 워드마크 A', meta: '신뢰형 산세리프 · 의료 가독성', style: 'sans', color: '#111111', isAiRecommended: true, aiRank: 1 },
    { id: 'C2', name: 'Wailastic 라인심볼 B', meta: '회복 흐름 · 탄력 곡선 암시', style: 'symbol', color: '#1f2937', isAiRecommended: true, aiRank: 2 },
    { id: 'C3', name: 'Wailastic 모노그램 C', meta: 'W/S 구조 · 전문성 강조', style: 'mono', color: '#374151', aiRank: 3 },
    { id: 'C4', name: 'Wailastic 배지형 D', meta: '간판/문서 응용 안정형', style: 'badge', color: '#4b5563', aiRank: 4 },
    { id: 'C5', name: 'Wailastic 레터마크 E', meta: '강조 이니셜 · 명확한 존재감', style: 'letter', color: '#6b7280', aiRank: 5 },
    { id: 'C6', name: 'Wailastic 세리프 F', meta: '인간적 돌봄 · 부드러운 인상', style: 'serif', color: '#111827', aiRank: 6 },
    { id: 'C7', name: 'Wailastic 움직임 라인 G', meta: '회복 곡선 · 생활 활력', style: 'script', color: '#333333', aiRank: 7 },
    { id: 'C8', name: 'Wailastic 아이콘형 H', meta: '전문 기호 · 안내 시스템형', style: 'icon', color: '#4d4d4d', aiRank: 8 },
    { id: 'C9', name: 'Wailastic 세리프 조합 I', meta: '신뢰감 · 인간적 안정감', style: 'serif2', color: '#666666', aiRank: 9 },
  ],
}

export function getBriefByCode(code: string): BrandBrief | null {
  return BRIEF_LIBRARY[code.trim().toUpperCase()] ?? null
}

export function getSetBrief(setId: SetId): BrandBrief {
  const briefCode = SET_BRIEF_MAP[setId]
  return BRIEF_LIBRARY[briefCode]
}

export function getStimulusSet(setId: SetId): Logo[] {
  return STIMULUS_SETS[setId].map((logo) => ({ ...logo }))
}

const CONDITION_ORDERS: Condition[][] = [
  ['human', 'collab', 'ai'],
  ['human', 'ai', 'collab'],
  ['collab', 'human', 'ai'],
  ['collab', 'ai', 'human'],
  ['ai', 'human', 'collab'],
  ['ai', 'collab', 'human'],
]

const SET_ORDERS: SetId[][] = [
  ['A', 'B', 'C'],
  ['A', 'C', 'B'],
  ['B', 'A', 'C'],
  ['B', 'C', 'A'],
  ['C', 'A', 'B'],
  ['C', 'B', 'A'],
]

function hashId(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(31, h) + input.charCodeAt(i)
  }
  return Math.abs(h)
}

export function createCounterBalancedAssignments(participantId: string): ConditionAssignment[] {
  const idx = hashId(participantId || 'P000') % CONDITION_ORDERS.length
  const conditionOrder = CONDITION_ORDERS[idx]
  const setOrder = SET_ORDERS[idx]

  return conditionOrder.map((condition, i) => {
    const setId = setOrder[i]
    return {
      order: (i + 1) as 1 | 2 | 3,
      condition,
      conditionLabel: CONDITION_LABELS[condition],
      setId,
      setBriefCode: SET_BRIEF_MAP[setId],
    }
  })
}

function clamp1to5(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)))
}

export function createAiSuggestedScores(logo: Logo): AxisScores {
  const rank = logo.aiRank ?? 6
  const rankBias = Math.max(0, 3 - Math.floor((rank - 1) / 2))

  const base = [
    2.8 + rankBias * 0.6,
    2.7 + rankBias * 0.55,
    2.6 + rankBias * 0.5,
    2.5 + rankBias * 0.5,
    2.4 + rankBias * 0.45,
    2.7 + rankBias * 0.55,
    2.6 + rankBias * 0.5,
    2.5 + rankBias * 0.5,
  ]

  return {
    brand_fit: clamp1to5(base[0]),
    target_fit: clamp1to5(base[1]),
    comp_diff: clamp1to5(base[2]),
    scalable: clamp1to5(base[3]),
    timeless: clamp1to5(base[4]),
    natural: clamp1to5(base[5]),
    harmony: clamp1to5(base[6]),
    refinement: clamp1to5(base[7]),
  }
}

export function getAIPrompt(condition: Condition, logoName: string, logoMeta: string, brief?: BrandBrief): string {
  const resolvedBrief = brief ?? BRIEF_LIBRARY.F0001
  const intro = `브랜드: ${resolvedBrief.name} (${resolvedBrief.category})\n포지셔닝: ${resolvedBrief.positioning}\n가치 키워드: ${resolvedBrief.keywords.join(', ')}\n타깃: ${resolvedBrief.target}\n경쟁사 시각 특징: ${resolvedBrief.competitors}\n응용 환경: ${resolvedBrief.environments.join(', ')}\n평가 대상 시안: ${logoName} (${logoMeta})`

  if (condition === 'collab' || condition === 'mixed') {
    return `당신은 브랜드 전략 보조 도우미입니다.\n${intro}\n\n2문장으로 추천 근거만 간결하게 작성하세요.`
  }

  if (condition === 'ai') {
    return `당신은 브랜드 로고 평가 보조 AI입니다.\n${intro}\n\n8개 평가 판단 척도를 1~5점으로 제안하고 각 축당 1문장 근거를 작성하세요.`
  }

  return ''
}

