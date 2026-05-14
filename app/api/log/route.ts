import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LOG_DIR = process.env.VERCEL
  ? path.join('/tmp', 'logs')
  : path.join(process.cwd(), 'logs')

type PersistedLog = Record<string, unknown>

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function safeReadArray(filePath: string): PersistedLog[] {
  if (!fs.existsSync(filePath)) return []
  try {
    const text = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getLogTime(entry: PersistedLog): number {
  if (typeof entry.eventMs === 'number') return entry.eventMs
  if (typeof entry.timestamp === 'string') {
    const parsed = Date.parse(entry.timestamp)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function listLogFilesNewestFirst() {
  return fs
    .readdirSync(LOG_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const filePath = path.join(LOG_DIR, file)
      return {
        file,
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
}

export async function POST(req: NextRequest) {
  try {
    const entry = (await req.json()) as PersistedLog
    ensureLogDir()

    const sessionId =
      (typeof entry.sessionId === 'string' && entry.sessionId) ||
      (typeof entry.session_id === 'string' && entry.session_id) ||
      'unknown_session'

    const filePath = path.join(LOG_DIR, `${sessionId}.json`)
    const existing = safeReadArray(filePath)
    existing.push(entry)
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Log save error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    ensureLogDir()
    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 0
    const files = listLogFilesNewestFirst()

    if (Number.isFinite(limit) && limit > 0) {
      const recent: PersistedLog[] = []
      for (const file of files) {
        recent.push(...safeReadArray(file.filePath))
        if (recent.length >= limit * 2) break
      }

      return NextResponse.json(
        recent
          .sort((a, b) => getLogTime(a) - getLogTime(b))
          .slice(-limit)
      )
    }

    const all = files
      .flatMap((file) => safeReadArray(file.filePath))
      .sort((a, b) => getLogTime(a) - getLogTime(b))

    return NextResponse.json(all)
  } catch {
    return NextResponse.json([])
  }
}
