'use client'

import { useState, useEffect, useCallback } from 'react'

const ADMIN_ID = 'admin'
const ADMIN_PW = 'logo2026'
const LS_COUNTER_KEY = 'logoexp_participant_counter'
const SHEET_ID = '1gJpxKOhFZDRQVoCcxP3W4BZz6CHWpXTgE4mS-3VHZDo'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzUddGpzIdpEcUvv85HwoKyOdxtLajnFuHEkcYGyMDqx-6BaBjPjPInK5nkj0twsymA/exec'
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || DEFAULT_GAS_URL

const AXIS_LABELS: Record<string, string> = {
  brand_fit: '의미 적합성',
  target_fit: '타깃 전달성',
  competitive_diff: '경쟁 차별성',
  expandability: '적용 확장성',
  durability: '정체성 일관성',
  naturalness: '자연성',
  harmony: '조화성',
  elaboration: '정교성',
}

type DashboardData = {
  empty?: boolean
  total_participants: number
  total_rows: number
  ls_distribution: Record<string, number>
  condition_counts: Record<string, number>
  avg_ai_acceptance_rate: number | null
  decision_changed_count: number
  decision_total: number
  decision_changed_rate: number | null
  change_directions: Record<string, number>
  final_selected_ai_count: number
  final_selected_total: number
  final_selected_ai_rate: number | null
  avg_score_initial: number | null
  avg_score_final: number | null
  avg_score_diff: number | null
  axis_modification_counts: Record<string, number>
  fetched_at: string
}

const DEMO_DASHBOARD_DATA: DashboardData = {
  total_participants: 6,
  total_rows: 162,
  ls_distribution: { LS01: 27, LS02: 27, LS03: 27, LS04: 27, LS05: 27, LS06: 27 },
  condition_counts: { '시안 제시형': 54, '추천 제시형': 54, '평가 제시형': 54 },
  avg_ai_acceptance_rate: 0.71,
  decision_changed_count: 31,
  decision_total: 162,
  decision_changed_rate: 19.1,
  change_directions: { '유지': 131, '보류→제외': 17, '제외→보류': 14 },
  final_selected_ai_count: 7,
  final_selected_total: 18,
  final_selected_ai_rate: 38.9,
  avg_score_initial: 3.18,
  avg_score_final: 3.42,
  avg_score_diff: 0.24,
  axis_modification_counts: {
    brand_fit: 18,
    target_fit: 14,
    competitive_diff: 21,
    expandability: 16,
    durability: 12,
    naturalness: 19,
    harmony: 15,
    elaboration: 23,
  },
  fetched_at: new Date().toISOString(),
}

function pct(v: number | null) {
  return v === null ? '-' : `${v}%`
}
function num(v: number | null, digits = 2) {
  return v === null ? '-' : v.toFixed(digits)
}

function BarChart({ data, max, color = '#111111' }: { data: { label: string; value: number }[]; max: number; color?: string }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#4b5563' }}>
            <span>{d.label}</span>
            <span style={{ fontWeight: 700, color: '#111111' }}>{d.value}</span>
          </div>
          <div style={{ background: '#f3f4f6', borderRadius: 4, height: 10, overflow: 'hidden' }}>
            <div style={{ width: max > 0 ? `${(d.value / max) * 100}%` : '0%', background: color, height: '100%', borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid rgba(17,17,17,.1)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#111111', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [inputId, setInputId] = useState('')
  const [inputPw, setInputPw] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'manage' | 'dashboard'>('manage')

  const login = () => {
    if (inputId === ADMIN_ID && inputPw === ADMIN_PW) { setLoggedIn(true); setLoginError('') }
    else setLoginError('아이디 또는 비밀번호가 틀렸습니다.')
  }

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
        <div style={{ width: 360, background: '#ffffff', borderRadius: 16, padding: 36, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.08em', marginBottom: 6 }}>ADMIN</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 28 }}>관리자 로그인</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <input value={inputId} onChange={(e) => setInputId(e.target.value)} placeholder='아이디' autoComplete='off'
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#fafafa' }} />
            <input value={inputPw} onChange={(e) => setInputPw(e.target.value)} placeholder='비밀번호' type='password'
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#fafafa' }} />
            {loginError && <div style={{ fontSize: 13, color: '#dc2626' }}>{loginError}</div>}
            <button onClick={login}
              style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 헤더 */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(17,17,17,.1)', padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.08em' }}>ADMIN</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#111111', marginLeft: 8 }}>실험 관리</span>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['manage', 'dashboard'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ border: 'none', background: 'none', padding: '6px 14px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 400,
                    color: activeTab === tab ? '#111111' : '#9ca3af', borderBottom: activeTab === tab ? '2px solid #111111' : '2px solid transparent', cursor: 'pointer' }}>
                  {tab === 'manage' ? '관리' : '대시보드'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setLoggedIn(false)}
            style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#6b7280', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 48px' }}>
        {activeTab === 'manage' ? <ManageTab /> : <DashboardTab />}
      </div>
    </div>
  )
}

function ManageTab() {
  const [counter, setCounter] = useState(0)
  const [gasStatus, setGasStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle')
  const [gasData, setGasData] = useState<{ events: number; stimulus_rows: number } | null>(null)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(LS_COUNTER_KEY)
    setCounter(stored ? parseInt(stored, 10) : 0)
  }, [])

  const resetCounter = () => {
    localStorage.removeItem(LS_COUNTER_KEY)
    setCounter(0); setResetDone(true)
    setTimeout(() => setResetDone(false), 2500)
  }

  const checkGas = useCallback(async () => {
    if (!GAS_URL) { setGasStatus('fail'); return }
    setGasStatus('checking')
    try {
      const res = await fetch(GAS_URL)
      const json = await res.json()
      if (json.fetched_at) { setGasStatus('ok'); setGasData(json) } else setGasStatus('fail')
    } catch { setGasStatus('fail') }
  }, [])

  const nextCode = `P${String(counter + 1).padStart(3, '0')}`
  const nextLs = `LS0${(counter % 6) + 1}`

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 카운터 */}
      <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>참가자 카운터</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>현재까지 완료</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#111111' }}>{counter}<span style={{ fontSize: 16, color: '#9ca3af', marginLeft: 4 }}>명</span></div>
          </div>
          <div style={{ width: 1, height: 48, background: 'rgba(17,17,17,.1)' }} />
          <div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>다음 참가자</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111111' }}>{nextCode} <span style={{ fontSize: 14, color: '#6b7280' }}>{nextLs}</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={resetCounter}
            style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            P001로 초기화
          </button>
          {resetDone && <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>✓ 초기화 완료 — 다음 참가자 P001, LS01</div>}
        </div>
      </div>

      {/* GAS */}
      <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>GAS 연결 상태</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={checkGas} disabled={gasStatus === 'checking'}
            style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {gasStatus === 'checking' ? '확인 중...' : '연결 확인'}
          </button>
          {gasStatus === 'ok' && gasData && <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>✓ 연결됨 — 이벤트 {gasData.events}행 / 자극물 {gasData.stimulus_rows}행</div>}
          {gasStatus === 'fail' && <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>✗ 연결 실패</div>}
          {!GAS_URL && <div style={{ fontSize: 13, color: '#f59e0b' }}>GAS URL 미설정</div>}
        </div>
      </div>

      {/* 스프레드시트 */}
      <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>데이터</div>
        <a href={SHEET_URL} target='_blank' rel='noreferrer'
          style={{ display: 'inline-block', border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          구글 스프레드시트 열기 →
        </a>
      </div>

      {/* 참가자별 조회 */}
      <ParticipantExport />
    </div>
  )
}

function ParticipantExport() {
  const [pidInput, setPidInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ pid: string; rows: Record<string, unknown>[]; events: Record<string, unknown>[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchData = async () => {
    const pid = pidInput.trim().toUpperCase()
    if (!pid) return
    if (!GAS_URL) { setErrorMsg('GAS URL이 설정되지 않았습니다.'); setStatus('error'); return }
    setStatus('loading'); setResult(null); setErrorMsg('')
    try {
      const res = await fetch(`${GAS_URL}?pid=${encodeURIComponent(pid)}`)
      const json = await res.json()
      if (json.pid) { setResult(json); setStatus('done') }
      else { setErrorMsg('데이터를 불러오지 못했습니다.'); setStatus('error') }
    } catch { setErrorMsg('네트워크 오류가 발생했습니다.'); setStatus('error') }
  }

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsv = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const cell = (v: unknown) => { const s = String(v ?? '').replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s }
    const csv = '﻿' + headers.join(',') + '\n' + data.map((r) => headers.map((h) => cell(r[h])).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>참가자별 로그 조회</div>
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14 }}>참가자 코드를 입력하면 해당 참가자의 데이터를 스프레드시트에서 조회합니다.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input value={pidInput} onChange={(e) => setPidInput(e.target.value)} placeholder='예: P001'
          onKeyDown={(e) => e.key === 'Enter' && fetchData()}
          style={{ width: 120, border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', background: '#fafafa', fontWeight: 700 }} />
        <button onClick={fetchData} disabled={status === 'loading'}
          style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {status === 'loading' ? '조회 중...' : '조회'}
        </button>
      </div>
      {status === 'error' && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{errorMsg}</div>}
      {status === 'done' && result && (
        <div>
          <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginBottom: 12 }}>
            ✓ {result.pid} — 자극물 {result.rows.length}행 / 이벤트 {result.events.length}건
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => downloadJson(result.rows, `${result.pid}_stimulus_rows.json`)}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', color: '#111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>자극물 JSON</button>
            <button onClick={() => downloadCsv(result.rows, `${result.pid}_stimulus_rows.csv`)}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', color: '#111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>자극물 CSV</button>
            <button onClick={() => downloadJson(result.events, `${result.pid}_events.json`)}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', color: '#111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>이벤트 JSON</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardTab() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [data, setData] = useState<DashboardData | null>(null)
  const [showDemoData, setShowDemoData] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setShowDemoData(false)
    if (!GAS_URL) { setStatus('error'); return }
    setStatus('loading')
    try {
      const res = await fetch(`${GAS_URL}?action=dashboard`)
      const json = await res.json()
      if (json && json.total_rows > 0 && json.total_participants === 0) {
        setData({ ...DEMO_DASHBOARD_DATA, fetched_at: new Date().toISOString() })
        setShowDemoData(true)
      } else {
        setData(json)
      }
      setStatus('done')
    } catch { setStatus('error') }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const useDemoDashboard = () => {
    setData({ ...DEMO_DASHBOARD_DATA, fetched_at: new Date().toISOString() })
    setShowDemoData(true)
    setStatus('done')
  }

  if (status === 'loading') return <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14 }}>데이터 불러오는 중...</div>
  if (status === 'error') return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 14, color: '#dc2626', marginBottom: 12 }}>데이터를 불러오지 못했습니다. GAS URL을 확인하세요.</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={fetchDashboard} style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>다시 시도</button>
        <button onClick={useDemoDashboard} style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>파일럿 데모 데이터 보기</button>
      </div>
    </div>
  )
  if (!data || data.empty) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14 }}>
      아직 수집된 데이터가 없습니다.
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button onClick={fetchDashboard} style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>새로고침</button>
        <button onClick={useDemoDashboard} style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>파일럿 데모 데이터 보기</button>
      </div>
    </div>
  )

  const isUnusableGasData = !showDemoData && data.total_participants === 0
  const condOrder = ['시안 제시형', '추천 제시형', '평가 제시형']
  const condMax = Math.max(...condOrder.map((c) => data.condition_counts[c] ?? 0), 1)
  const lsKeys = ['LS01', 'LS02', 'LS03', 'LS04', 'LS05', 'LS06']
  const lsMax = Math.max(...lsKeys.map((k) => data.ls_distribution[k] ?? 0), 1)
  const axisKeys = Object.keys(AXIS_LABELS)
  const axisMax = Math.max(...axisKeys.map((k) => data.axis_modification_counts[k] ?? 0), 1)
  const dirKeys = Object.keys(data.change_directions)
  const dirMax = Math.max(...dirKeys.map((k) => data.change_directions[k] ?? 0), 1)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 새로고침 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {showDemoData ? (
          <div style={{ border: '1px solid rgba(17,17,17,.12)', background: '#ffffff', color: '#4b5563', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 700 }}>
            파일럿 데모 데이터 표시 중
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>실제 GAS 데이터 기준</div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={useDemoDashboard}
            style={{ border: '1px solid rgba(17,17,17,.18)', background: showDemoData ? '#111111' : '#ffffff', color: showDemoData ? '#ffffff' : '#111111', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            파일럿 데모
          </button>
        <button onClick={fetchDashboard}
          style={{ border: '1px solid rgba(17,17,17,.18)', background: '#fff', color: '#111', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          실제 데이터 새로고침
        </button>
        </div>
      </div>

      {isUnusableGasData && (
        <div style={{ border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.6 }}>
          GAS에는 행이 있지만 참가자 ID와 조건 정보가 비어 있어 대시보드 집계가 정상 표시되지 않습니다.
          GAS 배포 코드를 최신 구조로 다시 배포하면 실제 데이터가 집계됩니다. 지금은 [파일럿 데모]로 화면 구성을 확인할 수 있습니다.
        </div>
      )}

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label='총 참가자' value={`${data.total_participants}명`} sub={`데이터 ${data.total_rows}행`} />
        <StatCard label='AI 수용률 평균' value={pct(data.avg_ai_acceptance_rate !== null ? data.avg_ai_acceptance_rate * 100 : null)} sub='평가·추천 조건 기준' />
        <StatCard label='판단 변경률' value={pct(data.decision_changed_rate)} sub={`${data.decision_changed_count} / ${data.decision_total}건`} />
        <StatCard label='AI 추천 최종선택률' value={pct(data.final_selected_ai_rate)} sub={`${data.final_selected_ai_count} / ${data.final_selected_total}건`} />
        <StatCard label='평균 점수 변화' value={data.avg_score_diff !== null ? (data.avg_score_diff >= 0 ? `+${num(data.avg_score_diff)}` : `${num(data.avg_score_diff)}`) : '-'} sub='초기→최종 (100점 환산)' />
      </div>

      {/* 조건별 분포 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 16 }}>조건별 데이터 수</div>
          <BarChart
            data={condOrder.map((c) => ({ label: c, value: data.condition_counts[c] ?? 0 }))}
            max={condMax}
          />
        </div>

        {/* LS 분포 */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 16 }}>라틴스퀘어 그룹 분포</div>
          <BarChart
            data={lsKeys.map((k) => ({ label: k, value: data.ls_distribution[k] ?? 0 }))}
            max={lsMax}
            color='#4b5563'
          />
        </div>
      </div>

      {/* 점수 초기 vs 최종 */}
      <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 16 }}>평균 점수 초기 vs 최종</div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
          {[
            { label: '초기 평균', value: data.avg_score_initial, color: '#d1d5db' },
            { label: '최종 평균', value: data.avg_score_final, color: '#111111' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#111111', marginBottom: 4 }}>{item.value !== null ? item.value.toFixed(1) : '-'}</div>
              <div style={{ background: item.color, height: 8, borderRadius: 4, marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: '#6b7280' }}>{item.label}</div>
            </div>
          ))}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: data.avg_score_diff !== null && data.avg_score_diff > 0 ? '#16a34a' : data.avg_score_diff !== null && data.avg_score_diff < 0 ? '#dc2626' : '#111111', marginBottom: 4 }}>
              {data.avg_score_diff !== null ? (data.avg_score_diff >= 0 ? `+${data.avg_score_diff.toFixed(2)}` : data.avg_score_diff.toFixed(2)) : '-'}
            </div>
            <div style={{ background: '#f3f4f6', height: 8, borderRadius: 4, marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: '#6b7280' }}>변화량</div>
          </div>
        </div>
      </div>

      {/* 판단 변경 방향 + 축별 수정 빈도 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 16 }}>판단 변경 방향</div>
          {dirKeys.length > 0
            ? <BarChart data={dirKeys.map((k) => ({ label: k, value: data.change_directions[k] }))} max={dirMax} color='#374151' />
            : <div style={{ fontSize: 13, color: '#9ca3af' }}>데이터 없음</div>}
        </div>

        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 16 }}>평가 축별 점수 수정 빈도</div>
          <BarChart
            data={axisKeys.map((k) => ({ label: AXIS_LABELS[k], value: data.axis_modification_counts[k] ?? 0 }))}
            max={axisMax}
            color='#6b7280'
          />
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>마지막 업데이트: {new Date(data.fetched_at).toLocaleString('ko-KR')}</div>
    </div>
  )
}
