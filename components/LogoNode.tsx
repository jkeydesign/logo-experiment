'use client'

import { useEffect, useState } from 'react'
import { useExperiment } from '@/lib/store'
import type { Condition, Logo, Q1Action } from '@/types'

interface Props {
  logo: Logo
  condition: Condition
  status: 'idle' | 'shortlisted' | 'excluded' | 'final'
  avgScore?: number
  isHero?: boolean
  isShortlisted?: boolean
  selectedAction?: Q1Action | null
  showAiRecommendBadge?: boolean
  aiRankOrder?: number
  aiStars?: number
  aiPreviewComment?: string
  actionsDisabled?: boolean
  onAction: (logo: Logo, action: Q1Action) => void
}

const SYMBOL_SVG: Record<string, (color: string) => string> = {
  serif: c => `<circle cx="14" cy="22" r="10" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="22" r="4" fill="${c}" opacity=".22"/>`,
  sans: c => `<rect x="5" y="13" width="18" height="18" rx="5" fill="none" stroke="${c}" stroke-width="1.8"/><rect x="9" y="17" width="10" height="10" rx="3" fill="${c}" opacity=".18"/>`,
  mono: c => `<polygon points="14,9 25,20 14,31 3,20" fill="none" stroke="${c}" stroke-width="1.8"/><circle cx="14" cy="20" r="3" fill="${c}" opacity=".35"/>`,
  icon: c => `<circle cx="14" cy="20" r="4.2" fill="${c}" opacity=".8"/><circle cx="7.3" cy="14.2" r="2.8" fill="${c}" opacity=".35"/><circle cx="20.7" cy="14.2" r="2.8" fill="${c}" opacity=".35"/><circle cx="10.2" cy="11.2" r="2.3" fill="${c}" opacity=".35"/><circle cx="17.8" cy="11.2" r="2.3" fill="${c}" opacity=".35"/>`,
  badge: c => `<path d="M14 8 L23 13 L23 24 L14 30 L5 24 L5 13 Z" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M14 12 L19 15 L19 22 L14 25 L9 22 L9 15 Z" fill="${c}" opacity=".2"/>`,
  letter: c => `<rect x="5" y="11" width="18" height="18" rx="3" fill="none" stroke="${c}" stroke-width="1.8"/><path d="M9 25 L19 15" stroke="${c}" stroke-width="1.4" opacity=".75"/>`,
  symbol: c => `<path d="M4 20 C7 13, 11 13, 14 20 C17 27, 21 27, 24 20" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
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
  const color = logo.color
  const wordmark = escapeSvgText(getWordmarkFromName(logo.name))

  return `<svg width="120" height="70" viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="112" height="58" rx="10" fill="rgba(255,255,255,.82)" />
    <g>${symbolFn(color)}</g>
    <text x="66" y="26" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="${color}" opacity=".65" letter-spacing="1.1">SYMBOL + WORDMARK</text>
    <text x="66" y="41" text-anchor="middle" dominant-baseline="middle" font-size="12" font-family="Arial, sans-serif" font-weight="700" letter-spacing=".7" fill="${color}">${wordmark}</text>
  </svg>`
}

const ACTIONS: Array<{ action: Q1Action; label: string; color: string }> = [
  { action: '보류', label: '보류', color: '#4b5563' },
  { action: '제외', label: '제외', color: '#6b7280' },
  { action: '최종선택', label: '최종선택', color: '#111827' },
]

export default function LogoNode({
  logo,
  status,
  avgScore,
  isHero = false,
  isShortlisted = false,
  selectedAction = null,
  showAiRecommendBadge = false,
  aiRankOrder,
  aiStars,
  aiPreviewComment,
  actionsDisabled = false,
  onAction,
}: Props) {
  const startTimer = useExperiment((state) => state.startTimer)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (hovered) startTimer(logo.id)
  }, [hovered, logo.id, startTimer])

  const aiStarCount = Math.max(0, Math.min(5, aiStars ?? 0))
  const aiStarText = `${'★'.repeat(aiStarCount)}${'☆'.repeat(5 - aiStarCount)}`
  const logoSvg = renderLogoSvg(logo)

  const borderColor = status === 'final'
    ? '#111827'
    : status === 'shortlisted'
      ? '#4b5563'
      : status === 'excluded'
        ? '#9ca3af'
        : 'rgba(17,17,17,.12)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#ffffff',
        borderRadius: 14,
        border: `1px solid ${borderColor}`,
        padding: 14,
        position: 'relative',
        transition: 'all .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(17,17,17,.12)' : 'none',
        opacity: status === 'excluded' ? .7 : 1,
      }}
    >
      {isShortlisted && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 999, border: '1px solid rgba(17,17,17,.2)', display: 'grid', placeItems: 'center', fontSize: 12, color: '#6b7280' }}>
          ♥
        </div>
      )}

      {showAiRecommendBadge && (
        <div style={{ position: 'absolute', top: 8, left: 8, borderRadius: 999, border: '1px solid rgba(17,17,17,.2)', background: '#f7f7f7', color: '#4d4d4d', fontSize: 10, padding: '2px 7px', fontWeight: 700 }}>
          AI 추천
        </div>
      )}

      {typeof aiRankOrder === 'number' && (
        <div style={{ position: 'absolute', top: 8, left: showAiRecommendBadge ? 74 : 8, borderRadius: 999, border: '1px solid rgba(17,17,17,.2)', background: '#f7f7f7', color: '#333333', fontSize: 10, padding: '2px 7px', fontWeight: 700 }}>
          {aiStarText} · {aiRankOrder}위
        </div>
      )}

      <div
        style={{
          height: isHero ? 128 : 72,
          background: '#f7f7f7',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          overflow: 'hidden',
        }}
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />

      <div style={{ border: '1px solid rgba(17,17,17,.12)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, background: '#ffffff' }}>
        <div style={{ fontSize: isHero ? 14 : 12, fontWeight: 700, color: '#111111', marginBottom: 3 }}>{logo.name}</div>
        <div style={{ fontSize: isHero ? 11 : 10, color: '#666666', marginBottom: aiPreviewComment ? 6 : 0 }}>{logo.meta}</div>
        {aiPreviewComment && (
          <div style={{ fontSize: 10, color: '#666666', lineHeight: 1.5 }}>{aiPreviewComment}</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
        {ACTIONS.map((item) => {
          const isSelected = selectedAction === item.action
          return (
            <button
              key={item.action}
              onClick={() => onAction(logo, item.action)}
              disabled={actionsDisabled}
              style={{
                padding: isHero ? '8px 4px' : '6px 4px',
                borderRadius: 7,
                border: `1px solid ${isSelected ? item.color : '#d1d5db'}`,
                background: isSelected ? item.color : '#ffffff',
                color: isSelected ? '#ffffff' : '#4d4d4d',
                fontSize: isHero ? 12 : 11,
                fontWeight: 700,
                cursor: actionsDisabled ? 'not-allowed' : 'pointer',
                opacity: actionsDisabled ? .45 : 1,
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {typeof avgScore === 'number' && (
        <div style={{ height: 3, borderRadius: 3, background: '#f3f4f6', marginTop: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(avgScore / 5) * 100}%`, borderRadius: 3, background: '#4b5563' }} />
        </div>
      )}
    </div>
  )
}
