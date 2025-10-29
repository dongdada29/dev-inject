import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // <!-- DEV-INJECT-START -->
    (function() {
      return {
        name: 'dev-inject',
        transformIndexHtml(html) {
          if (process.env.NODE_ENV === 'development') {
            return html.replace(
              '</head>',
              `<script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js?t=1761713676983"></script>\n</head>`
            );
          }
          return html;
        }
      };
    })()
    // <!-- DEV-INJECT-END -->
  ],
  server: {
    port: 3001
  }
})
