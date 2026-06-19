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
  human: '시안 제시형',
  collab: '추천 제시형',
  ai: '평가 근거 제시형',
  mixed: '추천 제시형',
}

export const CONDITION_GUIDES: Record<Condition, string[]> = {
  human: [
    '로고 시안 9개만 제시됩니다.',
    'AI 추천·평가 정보는 제공되지 않습니다.',
    '후보유지·제외 후 최종 1개를 선택합니다.',
  ],
  collab: [
    '로고 시안 9개가 제시됩니다.',
    'AI 추천 시안 3개가 표시됩니다.',
    'AI 점수·순위는 제공되지 않습니다.',
    '후보유지·제외 후 최종 1개를 선택합니다.',
  ],
  ai: [
    '로고 시안 9개가 제시됩니다.',
    '전체 시안의 AI 평가 점수가 표시됩니다.',
    '전체 시안의 AI 순위가 제공됩니다.',
    '후보유지·제외 후 최종 1개를 선택합니다.',
  ],
  mixed: [
    '로고 시안 9개가 제시됩니다.',
    'AI 추천 시안 3개가 표시됩니다.',
    'AI 점수·순위는 제공되지 않습니다.',
  ],
}

export const AXIS_LABELS = [
  { id: 'brand_fit', name: '의미 적합성', desc: '포지셔닝과 가치 키워드를 담아내는가?', group: 'brand' },
  { id: 'target_fit', name: '타깃 전달성', desc: '타깃에게 의도한 의미가 전달되는가?', group: 'brand' },
  { id: 'comp_diff', name: '경쟁 차별성', desc: '경쟁사의 시각 특성과 충분히 구분되는가?', group: 'brand' },
  { id: 'scalable', name: '적용 확장성', desc: '다양한 매체와 응용 환경에서 일관되게 작동하는가?', group: 'brand' },
  { id: 'timeless', name: '정체성 일관성', desc: '5~10년 후에도 유효한 형태인가?', group: 'brand' },
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
  '① 의미 적합성 ? 포지셔닝과 가치 키워드를 담아내는가?',
  '② 타깃 전달성 ? 타깃에게 의도한 의미가 전달되는가?',
  '③ 경쟁 차별성 ? 경쟁사의 시각 특성과 충분히 구분되는가?',
  '④ 적용 확장성 ? 다양한 매체와 응용 환경에서 일관되게 작동하는가?',
  '⑤ 정체성 일관성 ? 5~10년 후에도 유효한 형태인가?',
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
    name: '오브네 OVBNE',
    namingMeaning: 'OVBNE는 Objet, Value, Balance, New, Everyday의 의미를 결합한 조어로, 일상 오브제가 지닌 가치와 균형 잡힌 생활 감각, 새롭게 감각화된 일상을 의미한다.',
    category: '리빙 오브제·홈데코 큐레이션 매장 및 온라인 쇼핑몰',
    priceRange: '일반 생활용품 브랜드보다 높지만 고가 디자인 편집숍보다는 접근 가능한 미들 프리미엄 가격대. 제품은 소형 오브제와 문구류는 약 1만~3만 원대, 홈데코 제품은 약 3만~8만 원대 중심으로 구성한다.',
    overview: '일상에서 사용하는 오브제, 문구, 홈데코 제품을 감도 있게 제안하는 신규 라이프스타일 브랜드',
    target: '25~35세 도시 거주자. 자기 취향과 감도 있는 소비를 중시하며, 과시적 고가 브랜드보다 일상 안에서 세련된 선택을 선호하는 소비자',
    positioning: '대중적 소품샵보다 감도 있고, 고가 편집숍보다 접근 가능한 미들 프리미엄 라이프스타일 브랜드. 취향을 가진 도시 생활자의 일상 공간에 자연스럽게 스며드는 오브제 브랜드로 위치시킨다.',
    competitors: '대형 라이프스타일 편집숍, 독립 소품샵, 온라인 감성 셀렉트숍과 경쟁. 이들은 감성 일러스트, 손글씨 서체, 자연 소재 이미지, 따뜻한 중립색을 주로 활용한다.',
    competitiveContext: '대형 라이프스타일 브랜드, 독립 오브제 브랜드, 온라인 감성 셀렉트숍과 경쟁',
    environments: ['제품 라벨', '패키지 스티커', '쇼핑백', '명함', '웹사이트', 'SNS 프로필', '온라인 배너', '제품 태그', '팝업 부스 사인'],
    applicationMedia: ['제품 라벨', '패키지 스티커', '쇼핑백', '명함', '웹사이트', 'SNS 프로필', '온라인 배너', '제품 태그', '팝업 부스 사인'],
    keywords: ['일상성', '균형감', '취향성'],
    toneManner: '세련되지만 차갑지 않고, 정돈되었지만 지나치게 고급스럽거나 권위적이지 않은 분위기',
    developmentDirection: '브랜드의 취향성과 접근성을 함께 전달하고, 다양한 매체에서 식별 가능하게 사용할 수 있어야 함',
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
  A: 'B0002',
  B: 'B0002',
  C: 'B0002',
}

const STIMULUS_SETS: Record<SetId, Logo[]> = {
  A: [
    { id: 'A1', name: 'OVBNE 시안 A', meta: '실제 로고 이미지 A', style: 'sans', color: '#111111', imageSrc: 'stimuli/A1.png', isAiRecommended: true, aiRank: 1 },
    { id: 'A2', name: 'OVBNE 시안 B', meta: '실제 로고 이미지 B', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/A2.png', isAiRecommended: true, aiRank: 2 },
    { id: 'A3', name: 'OVBNE 시안 C', meta: '실제 로고 이미지 C', style: 'mono', color: '#374151', imageSrc: 'stimuli/A3.png', aiRank: 3 },
    { id: 'A4', name: 'OVBNE 시안 D', meta: '실제 로고 이미지 D', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/A4.png', aiRank: 4 },
    { id: 'A5', name: 'OVBNE 시안 E', meta: '실제 로고 이미지 E', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/A5.png', aiRank: 5 },
    { id: 'A6', name: 'OVBNE 시안 F', meta: '실제 로고 이미지 F', style: 'serif', color: '#111827', imageSrc: 'stimuli/A6.png', aiRank: 6 },
    { id: 'A7', name: 'OVBNE 시안 G', meta: '실제 로고 이미지 G', style: 'script', color: '#333333', imageSrc: 'stimuli/A7.png', aiRank: 7 },
    { id: 'A8', name: 'OVBNE 시안 H', meta: '실제 로고 이미지 H', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/A8.png', aiRank: 8 },
    { id: 'A9', name: 'OVBNE 시안 I', meta: '실제 로고 이미지 I', style: 'serif2', color: '#666666', imageSrc: 'stimuli/A9.png', aiRank: 9 },
  ],
  B: [
    { id: 'B1', name: 'OVBNE 시안 A', meta: '실제 로고 이미지 A', style: 'sans', color: '#111111', imageSrc: 'stimuli/B1.png', isAiRecommended: true, aiRank: 1 },
    { id: 'B2', name: 'OVBNE 시안 B', meta: '실제 로고 이미지 B', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/B2.png', isAiRecommended: true, aiRank: 2 },
    { id: 'B3', name: 'OVBNE 시안 C', meta: '실제 로고 이미지 C', style: 'mono', color: '#374151', imageSrc: 'stimuli/B3.png', aiRank: 3 },
    { id: 'B4', name: 'OVBNE 시안 D', meta: '실제 로고 이미지 D', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/B4.png', aiRank: 4 },
    { id: 'B5', name: 'OVBNE 시안 E', meta: '실제 로고 이미지 E', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/B5.png', aiRank: 5 },
    { id: 'B6', name: 'OVBNE 시안 F', meta: '실제 로고 이미지 F', style: 'serif', color: '#111827', imageSrc: 'stimuli/B6.png', aiRank: 6 },
    { id: 'B7', name: 'OVBNE 시안 G', meta: '실제 로고 이미지 G', style: 'script', color: '#333333', imageSrc: 'stimuli/B7.png', aiRank: 7 },
    { id: 'B8', name: 'OVBNE 시안 H', meta: '실제 로고 이미지 H', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/B8.png', aiRank: 8 },
    { id: 'B9', name: 'OVBNE 시안 I', meta: '실제 로고 이미지 I', style: 'serif2', color: '#666666', imageSrc: 'stimuli/B9.png', aiRank: 9 },
  ],
  C: [
    { id: 'C1', name: 'OVBNE 시안 A', meta: '실제 로고 이미지 A', style: 'sans', color: '#111111', imageSrc: 'stimuli/C1.png', isAiRecommended: true, aiRank: 1 },
    { id: 'C2', name: 'OVBNE 시안 B', meta: '실제 로고 이미지 B', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/C2.png', isAiRecommended: true, aiRank: 2 },
    { id: 'C3', name: 'OVBNE 시안 C', meta: '실제 로고 이미지 C', style: 'mono', color: '#374151', imageSrc: 'stimuli/C3.png', aiRank: 3 },
    { id: 'C4', name: 'OVBNE 시안 D', meta: '실제 로고 이미지 D', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/C4.png', aiRank: 4 },
    { id: 'C5', name: 'OVBNE 시안 E', meta: '실제 로고 이미지 E', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/C5.png', aiRank: 5 },
    { id: 'C6', name: 'OVBNE 시안 F', meta: '실제 로고 이미지 F', style: 'serif', color: '#111827', imageSrc: 'stimuli/C6.png', aiRank: 6 },
    { id: 'C7', name: 'OVBNE 시안 G', meta: '실제 로고 이미지 G', style: 'script', color: '#333333', imageSrc: 'stimuli/C7.png', aiRank: 7 },
    { id: 'C8', name: 'OVBNE 시안 H', meta: '실제 로고 이미지 H', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/C8.png', aiRank: 8 },
    { id: 'C9', name: 'OVBNE 시안 I', meta: '실제 로고 이미지 I', style: 'serif2', color: '#666666', imageSrc: 'stimuli/C9.png', aiRank: 9 },
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

// 라틴스퀘어 배정표 (LS01–LS06)
// 각 조건(condition)이 어느 세트(setId)와 페어링되는지 정의
// 세트 순서는 항상 A→B→C (S1→S2→S3), 조건 순서가 그룹별로 달라짐
const LATIN_SQUARE: Array<{ condition: Condition; setId: SetId }[]> = [
  // LS01: 시안제시형/A → 추천제시형/B → 평가제시형/C
  [{ condition: 'human', setId: 'A' }, { condition: 'collab', setId: 'B' }, { condition: 'ai', setId: 'C' }],
  // LS02: 시안제시형/A → 평가제시형/B → 추천제시형/C
  [{ condition: 'human', setId: 'A' }, { condition: 'ai', setId: 'B' }, { condition: 'collab', setId: 'C' }],
  // LS03: 추천제시형/A → 시안제시형/B → 평가제시형/C
  [{ condition: 'collab', setId: 'A' }, { condition: 'human', setId: 'B' }, { condition: 'ai', setId: 'C' }],
  // LS04: 추천제시형/A → 평가제시형/B → 시안제시형/C
  [{ condition: 'collab', setId: 'A' }, { condition: 'ai', setId: 'B' }, { condition: 'human', setId: 'C' }],
  // LS05: 평가제시형/A → 시안제시형/B → 추천제시형/C
  [{ condition: 'ai', setId: 'A' }, { condition: 'human', setId: 'B' }, { condition: 'collab', setId: 'C' }],
  // LS06: 평가제시형/A → 추천제시형/B → 시안제시형/C
  [{ condition: 'ai', setId: 'A' }, { condition: 'collab', setId: 'B' }, { condition: 'human', setId: 'C' }],
]

export const LATIN_SQUARE_GROUP_LABELS = ['LS01', 'LS02', 'LS03', 'LS04', 'LS05', 'LS06'] as const
export type LatinSquareGroup = typeof LATIN_SQUARE_GROUP_LABELS[number]

export function createLatinSquareAssignments(lsIndex: number): ConditionAssignment[] {
  const clampedIdx = ((lsIndex % 6) + 6) % 6
  const group = LATIN_SQUARE[clampedIdx]
  const lsLabel = LATIN_SQUARE_GROUP_LABELS[clampedIdx]

  return group.map(({ condition, setId }, i) => ({
    order: (i + 1) as 1 | 2 | 3,
    condition,
    conditionLabel: CONDITION_LABELS[condition],
    setId,
    setBriefCode: SET_BRIEF_MAP[setId],
    latinSquareGroup: lsLabel,
  }))
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


