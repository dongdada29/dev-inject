import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        

      
        {/* DEV-INJECT-START */}
        {typeof window !== 'undefined' && (
          <script dangerouslySetInnerHTML={{
            __html: "(function() {\n      const remote = \"https://testagent.xspaceagi.com/sdk/dev-monitor.js\";\n      const separator = remote.includes('?') ? '&' : '?';\n      const script = document.createElement('script');\n      script.src = remote + separator + 't=' + Date.now();\n      script.dataset.id = 'dev-inject-monitor-script';\n      script.defer = true;\n      // 防止重复注入\n      if (!document.querySelector('[data-id=\"dev-inject-monitor-script\"]')) {\n        document.head.appendChild(script);\n      }\n    })();"
          }} />
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
