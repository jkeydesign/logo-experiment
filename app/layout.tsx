import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Logotics | 브랜드 로고 시안 판단 실험',
  description: '생성형 AI 기반 브랜드 로고 시안 판단 실험',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
