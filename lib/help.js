import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export function showHelp() {
  console.log(`
@xagi/dev-inject - 开发环境脚本注入工具

用法:
  npx @xagi/dev-inject <命令> [选项]

  或使用 pnpm:
  pnpm dlx @xagi/dev-inject <命令> [选项]

命令:
  install                     注入脚本到 HTML 文件
  uninstall                   从 HTML 文件中移除注入的脚本

选项:
  --remote <url|path>         脚本地址（可选，默认值: /sdk/dev-monitor.js）
                              - 远程URL: http://localhost:9000/monitor.js
                              - 绝对路径: /scripts/monitor.js

  --file <path>               指定要处理的 HTML 文件（可选）
                              - 如果不指定，会自动查找项目中的 HTML 文件

  --dry-run                   预览模式，显示将要执行的操作但不实际修改文件

  --verbose                   显示详细输出信息

  --framework, -f             使用框架感知注入模式
                              - 自动检测 Vite、Next.js 等框架
                              - 使用最佳注入方式，无需手动修改 HTML

  --help, -h                  显示帮助信息
  --version, -v               显示版本信息

示例:
  # 静默安装（推荐，自动确认，无需交互）
  npx -y @xagi/dev-inject install --framework

  # 使用默认脚本地址 (/sdk/dev-monitor.js)
  npx @xagi/dev-inject install

  # 使用默认地址 + 框架感知注入
  npx @xagi/dev-inject install --framework

  # 传统 HTML 注入
  npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js

  # 框架感知注入（推荐）
  npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

  # Vite 项目自动注入
  npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js -f --verbose

  # Next.js App Router 注入
  npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

  # Next.js Pages Router 注入
  npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js -f

  # 指定特定 HTML 文件（传统模式）
  npx @xagi/dev-inject install --remote=/scripts/monitor.js --file=./public/index.html

  # 使用 pnpm dlx
  pnpm dlx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

  # 预览将要执行的操作
  npx @xagi/dev-inject install --remote=/scripts/monitor.js --framework --dry-run

  # 移除框架注入
  npx @xagi/dev-inject uninstall --framework

  # 移除传统注入
  npx @xagi/dev-inject uninstall

支持的脚本格式:
  - 远程 HTTP/HTTPS URL
  - 以 / 开头的绝对路径（相对于网站根目录）

框架支持:
  🟢 Vite: 自动注入 Vite 插件到 vite.config.js
  🟢 Next.js App Router: 注入到 app/layout.tsx
  🟢 Next.js Pages Router: 注入到 pages/_document.tsx
  🟢 Create React App: 注入到 public/index.html
  🟢 传统 HTML: 直接修改 HTML 文件

框架注入优势:
  ✅ 自动检测项目类型
  ✅ 使用最佳注入方式
  ✅ 仅在开发环境生效
  ✅ 零侵入性修改
  ✅ 支持热重载

注意:
  - 使用 --framework 会自动选择最佳注入方式
  - 框架注入后需要重启开发服务器
  - 传统模式脚本会被注入到 HTML 文件的 </head> 标签之前
  - 重复执行 install 会自动替换之前的注入
  - 使用 uninstall 可以完全移除所有注入的脚本
`);
}

export function showVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    console.log(`@xagi/dev-inject v${packageJson.version}`);
  } catch (error) {
    console.log('@xagi/dev-inject v1.0.0');
  }
}
