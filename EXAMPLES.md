# 使用示例

## 安装方式

```bash
# 使用默认脚本地址 (/sdk/dev-monitor.js)
npx @xagi/dev-inject install

# 使用自定义地址
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js

# 使用 pnpm dlx
pnpm dlx @xagi/dev-inject install
```

## 1. 本地开发环境监控

将监控脚本复制到你的项目静态资源目录：

```bash
# 复制监控脚本到你的项目中
cp dev-inject/scripts/dev-monitor.js public/scripts/
```

然后注入到 HTML：

```bash
# 注入本地监控脚本
npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js

# 或者指定特定 HTML 文件
npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js --file=./public/index.html
```

## 2. 远程开发服务器监控

如果你的监控脚本运行在开发服务器上：

```bash
# 注入远程脚本
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js

# 或使用 pnpm
pnpm dlx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js
```

## 3. 在 React/Vite/Next.js 项目中使用（框架感知模式）

```bash
# Vite 项目 - 使用框架感知注入（推荐）
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# Next.js App Router 项目
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# Next.js Pages Router 项目
npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js --framework

# Create React App 项目
npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js --framework
```

## 4. 开发完成后清理

```bash
# 移除框架注入
npx @xagi/dev-inject uninstall --framework

# 移除传统注入
npx @xagi/dev-inject uninstall

# 只移除特定文件的注入脚本
pnpm dlx @xagi/dev-inject uninstall --file=./index.html
```

## 5. 预览模式

在实际注入前，可以先预览将要执行的操作：

```bash
npx @xagi/dev-inject install --remote=/scripts/dev-monitor.js --dry-run --verbose
```

## 监控面板使用

在浏览器控制台中：

```javascript
// 显示监控面板
DevMonitor.showPanel()

// 获取监控数据
DevMonitor.getData()

// 导出数据到文件
DevMonitor.exportData()

// 清除监控数据
DevMonitor.clearData()

// 设置日志级别
DevMonitor.setLogLevel('debug')  // debug, info, warn, error
```

## 完整工作流示例

```bash
# 1. 进入项目目录
cd my-project

# 2. 预览注入操作（框架感知模式）
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework --dry-run

# 3. 执行注入（框架感知模式）
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# 4. 启动开发服务器
npm run dev

# 5. 在浏览器中测试功能，打开控制台使用 DevMonitor API

# 6. 开发完成后清理注入
pnpm dlx @xagi/dev-inject uninstall --framework
```

## 快速启动示例

使用远程监控脚本（推荐）：

```bash
# 框架感知注入（自动检测最佳注入方式）
npx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# 或使用 pnpm
pnpm dlx @xagi/dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# 卸载
npx @xagi/dev-inject uninstall --framework
```
