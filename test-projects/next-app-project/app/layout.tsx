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
          <script dangerouslySetInnerHTML={{
            __html: "(function() {\n      const remote = \"https://testagent.xspaceagi.com/sdk/dev-monitor.js\";\n      const separator = remote.includes('?') ? '&' : '?';\n      const script = document.createElement('script');\n      script.src = remote + separator + 't=' + Date.now();\n      script.dataset.id = 'dev-inject-monitor-script';\n      script.defer = true;\n      // 防止重复注入\n      if (!document.querySelector('[data-id=\"dev-inject-monitor-script\"]')) {\n        document.head.appendChild(script);\n      }\n    })();"
          }} />
        )}
        {/* DEV-INJECT-END */}
    </head>

      <body className={inter.className}>{children}</body>
    </html>
  )
}
