import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // dev-inject-plugin
{
  name: 'dev-inject-plugin',
  transformIndexHtml(html) {
    if (process.env.NODE_ENV === 'development') {
      return html.replace(
        '</head>',
        `    <!-- dev-inject script -->
    <script src="https://testagent.xspaceagi.com/sdk/dev-monitor.js"></script></head>`
      );
    }
    return html;
  }
}
  ],
  server: {
    port: 3001
  }
})
