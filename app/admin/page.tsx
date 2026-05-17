'use client'

import { useState, useEffect, useCallback } from 'react'

const ADMIN_ID = 'admin'
const ADMIN_PW = 'logo2026'
const LS_COUNTER_KEY = 'logoexp_participant_counter'
const SHEET_ID = '1gJpxKOhFZDRQVoCcxP3W4BZz6CHWpXTgE4mS-3VHZDo'
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL ?? ''

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [inputId, setInputId] = useState('')
  const [inputPw, setInputPw] = useState('')
  const [loginError, setLoginError] = useState('')
  const [counter, setCounter] = useState<number>(0)
  const [gasStatus, setGasStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle')
  const [gasData, setGasData] = useState<{ events: number; stimulus_rows: number; fetched_at: string } | null>(null)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    if (loggedIn) {
      const stored = localStorage.getItem(LS_COUNTER_KEY)
      setCounter(stored ? parseInt(stored, 10) : 0)
    }
  }, [loggedIn])

  const login = () => {
    if (inputId === ADMIN_ID && inputPw === ADMIN_PW) {
      setLoggedIn(true)
      setLoginError('')
    } else {
      setLoginError('아이디 또는 비밀번호가 틀렸습니다.')
    }
  }

  const resetCounter = () => {
    localStorage.removeItem(LS_COUNTER_KEY)
    setCounter(0)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 2500)
  }

  const checkGas = useCallback(async () => {
    if (!GAS_URL) {
      setGasStatus('fail')
      return
    }
    setGasStatus('checking')
    try {
      const res = await fetch(GAS_URL)
      const json = await res.json()
      if (json.fetched_at) {
        setGasStatus('ok')
        setGasData(json)
      } else {
        setGasStatus('fail')
      }
    } catch {
      setGasStatus('fail')
    }
  }, [])

  if (!loggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
        <div style={{ width: 360, background: '#ffffff', borderRadius: 16, padding: 36, boxShadow: '0 2px 16px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.08em', marginBottom: 6 }}>ADMIN</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#111111', marginBottom: 28 }}>관리자 로그인</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder='아이디'
              autoComplete='off'
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#fafafa' }}
            />
            <input
              value={inputPw}
              onChange={(e) => setInputPw(e.target.value)}
              placeholder='비밀번호'
              type='password'
              onKeyDown={(e) => e.key === 'Enter' && login()}
              style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '11px 12px', fontSize: 14, outline: 'none', background: '#fafafa' }}
            />
            {loginError && (
              <div style={{ fontSize: 13, color: '#dc2626' }}>{loginError}</div>
            )}
            <button
              onClick={login}
              style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

  const nextCode = counter === 0 ? 'P001' : `P${String(counter + 1).padStart(3, '0')}`
  const nextLs = counter === 0 ? 'LS01' : `LS0${((counter) % 6) + 1}`

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '32px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'grid', gap: 16 }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '.08em' }}>ADMIN</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111111' }}>실험 관리</div>
          </div>
          <button
            onClick={() => setLoggedIn(false)}
            style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#6b7280', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            로그아웃
          </button>
        </div>

        {/* 참가자 카운터 */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>참가자 카운터</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={resetCounter}
              style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              P001로 초기화
            </button>
            {resetDone && (
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
                ✓ 초기화 완료 — 다음 참가자 P001, LS01
              </div>
            )}
          </div>
        </div>

        {/* GAS 연결 상태 */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>GAS 연결 상태</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={checkGas}
              disabled={gasStatus === 'checking'}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {gasStatus === 'checking' ? '확인 중...' : '연결 확인'}
            </button>
            {gasStatus === 'ok' && gasData && (
              <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
                ✓ 연결됨 — 이벤트 {gasData.events}행 / 자극물 로그 {gasData.stimulus_rows}행
              </div>
            )}
            {gasStatus === 'fail' && (
              <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
                ✗ 연결 실패 — GAS URL을 확인하세요
              </div>
            )}
            {!GAS_URL && (
              <div style={{ fontSize: 13, color: '#f59e0b' }}>GAS URL 미설정</div>
            )}
          </div>
        </div>

        {/* 스프레드시트 */}
        <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 12 }}>데이터</div>
          <a
            href={SHEET_URL}
            target='_blank'
            rel='noreferrer'
            style={{ display: 'inline-block', border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
          >
            구글 스프레드시트 열기 →
          </a>
        </div>

        {/* 참가자별 로그 */}
        <ParticipantExport gasUrl={GAS_URL} />

      </div>
    </div>
  )
}

function ParticipantExport({ gasUrl }: { gasUrl: string }) {
  const [pidInput, setPidInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ pid: string; rows: Record<string, unknown>[]; events: Record<string, unknown>[] } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchData = async () => {
    const pid = pidInput.trim().toUpperCase()
    if (!pid) return
    if (!gasUrl) { setErrorMsg('GAS URL이 설정되지 않았습니다.'); setStatus('error'); return }
    setStatus('loading')
    setResult(null)
    setErrorMsg('')
    try {
      const res = await fetch(`${gasUrl}?pid=${encodeURIComponent(pid)}`)
      const json = await res.json()
      if (json.pid) {
        setResult(json)
        setStatus('done')
      } else {
        setErrorMsg('데이터를 불러오지 못했습니다.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCsv = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const csvCell = (v: unknown) => {
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    }
    const csv = '﻿' + headers.join(',') + '\n' + data.map((r) => headers.map((h) => csvCell(r[h])).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 14, padding: 24, border: '1px solid rgba(17,17,17,.1)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>참가자별 로그 조회</div>
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14 }}>참가자 코드를 입력하면 해당 참가자의 데이터를 스프레드시트에서 조회합니다.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={pidInput}
          onChange={(e) => setPidInput(e.target.value)}
          placeholder='예: P001'
          onKeyDown={(e) => e.key === 'Enter' && fetchData()}
          style={{ width: 120, border: '1px solid rgba(17,17,17,.18)', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', background: '#fafafa', fontWeight: 700 }}
        />
        <button
          onClick={fetchData}
          disabled={status === 'loading'}
          style={{ border: 'none', background: '#111111', color: '#ffffff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
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
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              자극물 JSON
            </button>
            <button onClick={() => downloadCsv(result.rows, `${result.pid}_stimulus_rows.csv`)}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              자극물 CSV
            </button>
            <button onClick={() => downloadJson(result.events, `${result.pid}_events.json`)}
              style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              이벤트 JSON
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
