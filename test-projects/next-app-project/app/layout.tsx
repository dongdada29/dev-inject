import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Next.js App Test - dev-inject',
  description: '测试 dev-inject 框架感知注入功能',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
      {/* dev-inject script */}
      {process.env.NODE_ENV === 'development' && (
        <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js" />
      )}
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
