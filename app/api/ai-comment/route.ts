import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAIPrompt } from '@/lib/data'
import type { Condition, BrandBrief } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      condition: Condition
      logoName: string
      logoMeta: string
      brief?: BrandBrief
    }
    const { condition, logoName, logoMeta, brief } = body

    // 인간주도형은 AI 코멘트 없음
    if (condition === 'human') {
      return NextResponse.json({ comment: null })
    }

    const prompt = getAIPrompt(condition, logoName, logoMeta, brief)

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const comment = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ comment })

  } catch (err) {
    console.error('AI comment error:', err)
    return NextResponse.json({ comment: '분석 중 오류가 발생했습니다.' }, { status: 200 })
  }
}
