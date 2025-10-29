import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
      <
      
      {/* dev-inject script */}
      {process.env.NODE_ENV === 'development' && (
        <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js" />
      )}<
      <
      
      {/* dev-inject script */}
      {process.env.NODE_ENV === 'development' && (
        <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js" />
      )}
      {/* dev-inject script */}
      {process.env.NODE_ENV === 'development' && (
        <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js" />
      )}</Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

