# Logo Judgment Experiment — 실험 프로토타입

## Cursor에서 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.local 생성)
cp .env.example .env.local
# ANTHROPIC_API_KEY=sk-ant-... 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

## 프로젝트 구조

```
logo-experiment/
├── app/
│   ├── page.tsx              # 메인 실험 화면 (3패널)
│   ├── api/
│   │   ├── ai-comment/       # AI 추천 코멘트 생성 (Anthropic API)
│   │   └── log/              # 로그 저장 (JSON 파일)
├── components/
│   ├── BriefPanel.tsx        # 좌측: 브랜드 브리프
│   ├── CanvasPanel.tsx       # 중앙: 노드 캔버스
│   ├── LogoNode.tsx          # 개별 로고 카드
│   ├── ESMPanel.tsx          # 우측: ESM 판단 + Shortlist + 로그
│   └── ScaleTrack.tsx        # 5점 척도 컴포넌트
├── lib/
│   ├── data.ts               # 로고 시안 + 브리프 데이터
│   ├── store.ts              # Zustand 전역 상태
│   └── logger.ts             # 로그 수집 유틸
└── types/
    └── index.ts              # TypeScript 타입 정의
```

## AI 개입 조건별 동작

| 조건 | AI 역할 | UI 차이 |
|------|---------|---------|
| 인간주도형 | 시안 제시만 | 추천 배지 없음, AI 코멘트 없음 |
| 혼합주도형 | 2~3개 추천 + 간단 이유 | 추천 배지, 짧은 AI 코멘트 |
| AI주도형 | 정렬 + 상세 이유 + Top Pick | 상단 정렬, 상세 AI 분석 패널 |

## 수집 데이터

- `logs/session_[id].json` — 모든 판단 행동 + ESM 점수
- ESM 발생 시점: Q1 행동 직후 (보류/제외/개선/최종선택)
- Shortlist 재열람 시 2차 ESM 재트리거
