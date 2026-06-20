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
  ],
  collab: [
    '로고 시안 9개가 제시됩니다.',
    'AI 추천 시안 3개가 표시됩니다.',
    'AI 점수·순위는 제공되지 않습니다.',
  ],
  ai: [
    '로고 시안 9개가 제시됩니다.',
    '전체 AI 시안에 평가 문장이 표시됩니다.',
    '전체 AI 시안에 순위가 표시됩니다.',
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
  OVBNE: {
    code: 'OVBNE',
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
  A: 'OVBNE',
  B: 'OVBNE',
  C: 'OVBNE',
}

const STIMULUS_SETS: Record<SetId, Logo[]> = {
  A: [
    { id: 'A12', name: 'OVBNE 시안 A12', meta: '실제 로고 이미지 A12', style: 'sans', color: '#111111', imageSrc: 'stimuli/A12.png', isAiRecommended: true, aiRank: 1, aiExplanation: '병 형태가 간결히 응축되어 조화와 정교성이 안정적이다.' },
    { id: 'A07', name: 'OVBNE 시안 A07', meta: '실제 로고 이미지 A07', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/A07.png', isAiRecommended: true, aiRank: 2, aiExplanation: '아치와 화병이 유기적으로 결합되어 균형감이 잘 살아 있다.' },
    { id: 'A10', name: 'OVBNE 시안 A10', meta: '실제 로고 이미지 A10', style: 'mono', color: '#374151', imageSrc: 'stimuli/A10.png', isAiRecommended: true, aiRank: 3, aiExplanation: '유기적 곡선과 여백 대비가 자연스럽고 형태 완성도가 높다.' },
    { id: 'C11', name: 'OVBNE 시안 C11', meta: '실제 로고 이미지 C11', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/C11.png', isAiRecommended: false, aiRank: 4, aiExplanation: '원형 구조 안의 잔과 잎이 고르게 어우러져 정돈감이 있다.' },
    { id: 'B14', name: 'OVBNE 시안 B14', meta: '실제 로고 이미지 B14', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/B14.png', isAiRecommended: false, aiRank: 5, aiExplanation: '겹친 아치 형태가 부드럽게 연결되어 섬세한 조직감을 만든다.' },
    { id: 'B04', name: 'OVBNE 시안 B04', meta: '실제 로고 이미지 B04', style: 'serif', color: '#111827', imageSrc: 'stimuli/B04.png', isAiRecommended: false, aiRank: 6, aiExplanation: '단순한 유기 형태의 적층이 안정적이나 해석의 여지는 남는다.' },
    { id: 'C01', name: 'OVBNE 시안 C01', meta: '실제 로고 이미지 C01', style: 'script', color: '#333333', imageSrc: 'stimuli/C01.png', isAiRecommended: false, aiRank: 7, aiExplanation: '풍경형 곡선이 친숙하고 원형 구성이 무난한 조화를 이룬다.' },
    { id: 'C13', name: 'OVBNE 시안 C13', meta: '실제 로고 이미지 C13', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/C13.png', isAiRecommended: false, aiRank: 8, aiExplanation: '둥근 요소의 결합이 경쾌하며 형태 리듬이 비교적 간명하다.' },
    { id: 'B07', name: 'OVBNE 시안 B07', meta: '실제 로고 이미지 B07', style: 'serif2', color: '#666666', imageSrc: 'stimuli/B07.png', isAiRecommended: false, aiRank: 9, aiExplanation: '유기적 인상은 있으나 요소 결속이 다소 느슨하게 읽힌다.' },
  ],
  B: [
    { id: 'B02', name: 'OVBNE 시안 B02', meta: '실제 로고 이미지 B02', style: 'sans', color: '#111111', imageSrc: 'stimuli/B02.png', isAiRecommended: true, aiRank: 1, aiExplanation: '원과 잎 형태가 세로 틀 안에서 조화롭게 정리되어 있다.' },
    { id: 'C07', name: 'OVBNE 시안 C07', meta: '실제 로고 이미지 C07', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/C07.png', isAiRecommended: true, aiRank: 2, aiExplanation: '아치와 잎 구조가 균형 있게 맞물려 정교하게 보인다.' },
    { id: 'A01', name: 'OVBNE 시안 A01', meta: '실제 로고 이미지 A01', style: 'mono', color: '#374151', imageSrc: 'stimuli/A01.png', isAiRecommended: true, aiRank: 3, aiExplanation: '아치와 병 실루엣이 단순하게 결합되어 안정감이 있다.' },
    { id: 'A02', name: 'OVBNE 시안 A02', meta: '실제 로고 이미지 A02', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/A02.png', isAiRecommended: false, aiRank: 4, aiExplanation: '유기적 곡선이 부드럽게 흐르며 자연성이 잘 드러난다.' },
    { id: 'C03', name: 'OVBNE 시안 C03', meta: '실제 로고 이미지 C03', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/C03.png', isAiRecommended: false, aiRank: 5, aiExplanation: '반복 선 구조가 치밀하나 자연적 단서는 비교적 절제되어 있다.' },
    { id: 'A13', name: 'OVBNE 시안 A13', meta: '실제 로고 이미지 A13', style: 'serif', color: '#111827', imageSrc: 'stimuli/A13.png', isAiRecommended: false, aiRank: 6, aiExplanation: '물방울형 외곽과 내부 곡선이 유기적으로 연결되어 있다.' },
    { id: 'B16', name: 'OVBNE 시안 B16', meta: '실제 로고 이미지 B16', style: 'script', color: '#333333', imageSrc: 'stimuli/B16.png', isAiRecommended: false, aiRank: 7, aiExplanation: '원과 수평선의 배치가 간결하나 대상성은 다소 약하다.' },
    { id: 'B11', name: 'OVBNE 시안 B11', meta: '실제 로고 이미지 B11', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/B11.png', isAiRecommended: false, aiRank: 8, aiExplanation: '여러 오브제 단서가 보이나 요소 밀도가 다소 높다.' },
    { id: 'C09', name: 'OVBNE 시안 C09', meta: '실제 로고 이미지 C09', style: 'serif2', color: '#666666', imageSrc: 'stimuli/C09.png', isAiRecommended: false, aiRank: 9, aiExplanation: '곡선과 반원의 대비가 단순하나 의미 단서는 제한적이다.' },
  ],
  C: [
    { id: 'A05', name: 'OVBNE 시안 A05', meta: '실제 로고 이미지 A05', style: 'sans', color: '#111111', imageSrc: 'stimuli/A05.png', isAiRecommended: true, aiRank: 1, aiExplanation: '아치와 병 실루엣이 명료하게 결합되어 정교하게 보인다.' },
    { id: 'A16', name: 'OVBNE 시안 A16', meta: '실제 로고 이미지 A16', style: 'symbol', color: '#1f2937', imageSrc: 'stimuli/A16.png', isAiRecommended: true, aiRank: 2, aiExplanation: '병과 곡선 외곽이 유기적으로 맞물려 완성감이 있다.' },
    { id: 'C02', name: 'OVBNE 시안 C02', meta: '실제 로고 이미지 C02', style: 'mono', color: '#374151', imageSrc: 'stimuli/C02.png', isAiRecommended: true, aiRank: 3, aiExplanation: '잎과 원형 요소가 안정적으로 배치되어 자연성이 드러난다.' },
    { id: 'C14', name: 'OVBNE 시안 C14', meta: '실제 로고 이미지 C14', style: 'badge', color: '#4b5563', imageSrc: 'stimuli/C14.png', isAiRecommended: false, aiRank: 4, aiExplanation: '대칭적 잎 구조가 간결하게 정리되어 조화롭게 보인다.' },
    { id: 'B12', name: 'OVBNE 시안 B12', meta: '실제 로고 이미지 B12', style: 'letter', color: '#6b7280', imageSrc: 'stimuli/B12.png', isAiRecommended: false, aiRank: 5, aiExplanation: '유기적 외곽과 내부 곡선이 부드럽게 연결되어 있다.' },
    { id: 'B06', name: 'OVBNE 시안 B06', meta: '실제 로고 이미지 B06', style: 'serif', color: '#111827', imageSrc: 'stimuli/B06.png', isAiRecommended: false, aiRank: 6, aiExplanation: '원형과 반원 구성이 단순하며 균형감 있게 정리되어 있다.' },
    { id: 'B08', name: 'OVBNE 시안 B08', meta: '실제 로고 이미지 B08', style: 'script', color: '#333333', imageSrc: 'stimuli/B08.png', isAiRecommended: false, aiRank: 7, aiExplanation: '원과 곡선, 수평선의 대비가 간명하게 구성되어 있다.' },
    { id: 'C04', name: 'OVBNE 시안 C04', meta: '실제 로고 이미지 C04', style: 'icon', color: '#4d4d4d', imageSrc: 'stimuli/C04.png', isAiRecommended: false, aiRank: 8, aiExplanation: '원과 사각형의 중첩이 정돈되어 있으나 자연 단서는 적다.' },
    { id: 'A08', name: 'OVBNE 시안 A08', meta: '실제 로고 이미지 A08', style: 'serif2', color: '#666666', imageSrc: 'stimuli/A08.png', isAiRecommended: false, aiRank: 9, aiExplanation: '다양한 요소가 보이며 구성 밀도가 비교적 높게 느껴진다.' },
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


