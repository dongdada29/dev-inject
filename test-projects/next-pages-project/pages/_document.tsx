import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* DEV-INJECT-START */}
        {typeof window !== 'undefined' && (
          <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js?t=1761713215359"></script>
        )}
        {/* DEV-INJECT-END */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
