import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Logo Judgment Experiment',
  description: 'AI 협업 개입 수준 실험 프로토타입',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
