'use client'
import { useState } from 'react'

interface Props {
  axisId: string
  label: string
  sub: string
  prevScore?: number
  actionColor: string
  onChange: (axisId: string, val: number) => void
}

export default function ScaleTrack({ axisId, label, sub, prevScore, actionColor, onChange }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  const pick = (val: number) => {
    setSelected(val)
    onChange(axisId, val)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>{sub}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: selected ? 'var(--text)' : 'var(--text3)' }}>
          {selected ? `${selected}/5` : '-'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((score) => {
          const isPrev = prevScore === score
          const isSelected = selected === score

          return (
            <button
              key={score}
              onClick={() => pick(score)}
              style={{
                flex: 1,
                height: 26,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: isSelected ? 700 : 500,
                transition: 'all .15s',
                background: isSelected ? actionColor : isPrev ? 'rgba(75,85,99,.1)' : 'var(--surface2)',
                color: isSelected ? '#fff' : isPrev ? '#111827' : 'var(--text3)',
                outline: isPrev && !isSelected ? '1px solid rgba(75,85,99,.4)' : 'none',
                boxShadow: isSelected && prevScore && prevScore !== score ? '0 0 0 2px #6b7280' : 'none',
              }}
            >
              {isPrev && !isSelected ? '기존' : score}
            </button>
          )
        })}
      </div>
    </div>
  )
}
