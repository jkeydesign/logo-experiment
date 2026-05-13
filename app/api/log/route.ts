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

export async function GET() {
  try {
    ensureLogDir()
    const files = fs.readdirSync(LOG_DIR).filter((file) => file.endsWith('.json'))
    const all = files.flatMap((file) => safeReadArray(path.join(LOG_DIR, file)))
    return NextResponse.json(all)
  } catch {
    return NextResponse.json([])
  }
}
