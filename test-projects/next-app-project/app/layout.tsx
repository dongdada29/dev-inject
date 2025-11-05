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
    <html lang="en">
  <head>
      {/* DEV-INJECT-START */}
        {process.env.NODE_ENV === 'development' && (
          <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js?t=1762332187173"></script>
        )}
        {/* DEV-INJECT-END */}
    </head>

      <body className={inter.className}>{children}</body>
    </html>
  )
}
