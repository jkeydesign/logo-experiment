'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ScaleTrack from './ScaleTrack'
import { ALL_AXES, AXES_BRAND, AXES_VISUAL } from '@/lib/data'
import type { AxisScores, Logo, Q1Action } from '@/types'

interface ESMTarget {
  logo: Logo
  action: Q1Action
  isReopen: boolean
  prevScores?: AxisScores
}

interface Props {
  target: ESMTarget | null
  onComplete: (logoId: string, action: Q1Action, scores: AxisScores) => void
  onInteraction?: (eventName: string, payload?: Record<string, unknown>) => void
}

const ACTION_COLORS: Record<Q1Action, string> = {
  보류: '#4b5563',
  제외: '#6b7280',
  최종선택: '#111827',
  계속보류: '#4b5563',
}

export default function ESMPanel({ target, onComplete, onInteraction }: Props) {
  const [scores, setScores] = useState<Partial<AxisScores>>({})

  useEffect(() => {
    if (!target) {
      setScores({})
      return
    }
    setScores(target.isReopen && target.prevScores ? { ...target.prevScores } : {})
  }, [target])

  useEffect(() => {
    if (!target) return
    onInteraction?.('esm_panel_open', {
      detail: 'ESM 패널 열림',
      logoId: target.logo.id,
      logoName: target.logo.name,
      action: target.action,
      isReopen: target.isReopen,
    })
  }, [target, onInteraction])

  const answered = useMemo(() => {
    return ALL_AXES.reduce((acc, axis) => (
      typeof scores[axis.id as keyof AxisScores] === 'number' ? acc + 1 : acc
    ), 0)
  }, [scores])

  const ready = answered === ALL_AXES.length

  const handleChange = useCallback((axisId: string, value: number) => {
    if (!target) return
    setScores((prev) => ({ ...prev, [axisId]: value }))
    onInteraction?.('esm_axis_score_select', {
      detail: 'ESM 축 점수 선택',
      logoId: target.logo.id,
      logoName: target.logo.name,
      action: target.action,
      axisId,
      value,
    })
  }, [target, onInteraction])

  if (!target) {
    return (
      <div style={{ minHeight: 240, display: 'grid', placeItems: 'center', color: 'var(--text3)', textAlign: 'center' }}>
        좌측 시안을 선택하면 판단 기준을 입력할 수 있습니다.
      </div>
    )
  }

  const { logo, action, prevScores } = target
  const color = ACTION_COLORS[action]

  return (
    <div>
      <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, padding: '10px 12px', background: '#ffffff', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>{logo.id} · {logo.name}</div>
        <div style={{ fontSize: 11, color: '#666666', marginTop: 2 }}>{logo.meta}</div>
      </div>

      <div style={{ display: 'inline-block', border: '1px solid rgba(17,17,17,.2)', borderRadius: 999, padding: '3px 8px', marginBottom: 12, fontSize: 11, color }}>
        현재 판단: {action}
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: '#4d4d4d', marginBottom: 8 }}>브랜드·전략 기준</div>
      {AXES_BRAND.map((axis) => (
        <ScaleTrack
          key={axis.id}
          axisId={axis.id}
          label={axis.name}
          sub={axis.sub}
          prevScore={prevScores?.[axis.id as keyof AxisScores]}
          actionColor={color}
          onChange={handleChange}
        />
      ))}

      <div style={{ borderTop: '1px solid rgba(17,17,17,.12)', margin: '12px 0' }} />

      <div style={{ fontSize: 10, fontWeight: 700, color: '#4d4d4d', marginBottom: 8 }}>시각 형식 기준</div>
      {AXES_VISUAL.map((axis) => (
        <ScaleTrack
          key={axis.id}
          axisId={axis.id}
          label={axis.name}
          sub={axis.sub}
          prevScore={prevScores?.[axis.id as keyof AxisScores]}
          actionColor={color}
          onChange={handleChange}
        />
      ))}

      <button
        disabled={!ready}
        onClick={() => {
          onInteraction?.('esm_submit_click', {
            detail: 'ESM 제출 클릭',
            logoId: logo.id,
            action,
            answeredCount: answered,
          })
          onComplete(logo.id, action, scores as AxisScores)
        }}
        style={{
          width: '100%',
          marginTop: 14,
          border: 'none',
          borderRadius: 10,
          padding: '10px 12px',
          background: ready ? color : '#d1d5db',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 700,
          cursor: ready ? 'pointer' : 'not-allowed',
        }}
      >
        {ready ? '평가 제출' : `남은 항목 ${ALL_AXES.length - answered}개`}
      </button>
    </div>
  )
}
