'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

type LogEntry = Record<string, unknown>

const REFRESH_INTERVAL = 6000
const FETCH_LIMIT = 1200
const DISPLAY_STEP = 250

function readString(entry: LogEntry, keys: string[]) {
  for (const key of keys) {
    const value = entry[key]
    if (typeof value === 'string') return value
  }
  return ''
}

function getEntryText(entry: LogEntry) {
  try {
    return JSON.stringify(entry).toLowerCase()
  } catch {
    return ''
  }
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [lastFetch, setLastFetch] = useState<string>('-')
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [visibleCount, setVisibleCount] = useState(DISPLAY_STEP)
  const [isFetching, setIsFetching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const deferredFilterText = useDeferredValue(filterText)

  const fetchLogs = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    try {
      setIsFetching(true)
      const res = await fetch(`/api/log?limit=${FETCH_LIMIT}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!controller.signal.aborted) {
        setLogs(Array.isArray(data) ? data : [])
        setLastFetch(new Date().toLocaleTimeString('ko-KR'))
        setError('')
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(String(err))
    } finally {
      if (!controller.signal.aborted) setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()

    return () => {
      requestRef.current?.abort()
    }
  }, [fetchLogs])

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(fetchLogs, REFRESH_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, fetchLogs])

  useEffect(() => {
    setVisibleCount(DISPLAY_STEP)
  }, [deferredFilterText])

  const filtered = useMemo(() => {
    const keyword = deferredFilterText.trim().toLowerCase()
    if (!keyword) return logs
    return logs.filter((entry) => getEntryText(entry).includes(keyword))
  }, [logs, deferredFilterText])

  const visibleLogs = useMemo(
    () => [...filtered].reverse().slice(0, visibleCount),
    [filtered, visibleCount]
  )

  const participants = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of logs) {
      const participantId = readString(entry, ['participant_id', 'participantId'])
      if (participantId) counts.set(participantId, (counts.get(participantId) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([id, count]) => ({ id, count }))
  }, [logs])

  return (
    <div style={{ height: '100vh', minHeight: 0, background: '#f8f8f8', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, background: '#111827', color: '#ffffff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>AI Logotics · 실시간 로그 모니터</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            최근 {logs.length}건 로드 · 화면 표시 {visibleLogs.length}/{filtered.length}건 · 참가자 {participants.length}명 · 마지막 갱신: {lastFetch}
            {autoRefresh && <span style={{ marginLeft: 8, color: '#34d399' }}>자동갱신 ON ({REFRESH_INTERVAL / 1000}s)</span>}
            {isFetching && <span style={{ marginLeft: 8, color: '#fbbf24' }}>가져오는 중...</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder='검색...'
            style={{ border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#ffffff', borderRadius: 7, padding: '6px 10px', fontSize: 12, width: 180, outline: 'none' }}
          />
          <button
            onClick={() => setAutoRefresh((value) => !value)}
            style={{ border: '1px solid rgba(255,255,255,.25)', background: autoRefresh ? '#059669' : 'rgba(255,255,255,.1)', color: '#ffffff', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            {autoRefresh ? '자동갱신 ON' : '자동갱신 OFF'}
          </button>
          <button
            onClick={fetchLogs}
            style={{ border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: '#ffffff', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            새로고침
          </button>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
            오류: {error}
          </div>
        )}

        <div style={{ background: '#ffffff', border: '1px solid rgba(17,17,17,.1)', borderRadius: 10, padding: '10px 12px', color: '#4b5563', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
          실시간 열람은 성능을 위해 최근 최대 {FETCH_LIMIT}건만 가져오고, 화면에는 {DISPLAY_STEP}건씩 나누어 표시합니다. 전체 연구 데이터 추출은 기존 로그 추출 버튼을 사용하면 됩니다.
        </div>

        {participants.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {participants.map((participant) => (
              <button
                key={participant.id}
                onClick={() => setFilterText(filterText === participant.id ? '' : participant.id)}
                style={{ border: '1px solid rgba(17,17,17,.18)', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, background: filterText === participant.id ? '#111827' : '#ffffff', color: filterText === participant.id ? '#ffffff' : '#333333', cursor: 'pointer' }}
              >
                {participant.id} ({participant.count})
              </button>
            ))}
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                style={{ border: '1px solid #fca5a5', borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
              >
                필터 초기화
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999999', fontSize: 14 }}>
            {logs.length === 0 ? '아직 로그가 없습니다.' : '검색 결과가 없습니다.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 6 }}>
              {visibleLogs.map((entry, idx) => {
                const ts = readString(entry, ['timestamp'])
                const participantId = readString(entry, ['participant_id', 'participantId'])
                const detail = readString(entry, ['detail'])
                const conditionLabel = readString(entry, ['conditionLabel', 'condition_type'])
                const stimulusId = readString(entry, ['stimulus_id', 'stimulusId'])
                const eventType = readString(entry, ['type', 'eventName', 'kind'])

                return (
                  <div
                    key={`${ts}-${idx}`}
                    style={{ background: '#ffffff', border: '1px solid rgba(17,17,17,.1)', borderRadius: 8, padding: '8px 12px', display: 'grid', gridTemplateColumns: '160px 90px 120px 1fr', gap: 10, alignItems: 'start', fontSize: 12 }}
                  >
                    <div style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{ts ? new Date(ts).toLocaleString('ko-KR') : '-'}</div>
                    <div>
                      <span style={{ border: '1px solid rgba(17,17,17,.14)', borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#374151' }}>{participantId || '-'}</span>
                    </div>
                    <div style={{ color: '#4b5563', fontSize: 11 }}>
                      {conditionLabel && <div style={{ fontWeight: 700 }}>{conditionLabel}</div>}
                      {stimulusId && <div style={{ color: '#9ca3af' }}>시안: {stimulusId}</div>}
                      {eventType && <div style={{ color: '#9ca3af' }}>{eventType}</div>}
                    </div>
                    <div style={{ color: '#111111', fontWeight: detail ? 600 : 400, overflowWrap: 'anywhere' }}>
                      {detail || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>상세 없음</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {visibleCount < filtered.length && (
              <div style={{ display: 'grid', placeItems: 'center', padding: '16px 0 8px' }}>
                <button
                  onClick={() => setVisibleCount((value) => value + DISPLAY_STEP)}
                  style={{ border: '1px solid rgba(17,17,17,.18)', background: '#ffffff', color: '#111111', borderRadius: 9, padding: '8px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  로그 {Math.min(DISPLAY_STEP, filtered.length - visibleCount)}건 더 보기
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
