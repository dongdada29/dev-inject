# 使用示例

## 1. 本地开发环境监控

将监控脚本复制到你的项目静态资源目录：

```bash
# 复制监控脚本到你的项目中
cp dev-inject/scripts/dev-monitor.js public/scripts/
```

然后注入到 HTML：

```bash
# 注入本地监控脚本
npx dev-inject install --remote=/scripts/dev-monitor.js

# 或者指定特定 HTML 文件
npx dev-inject install --remote=/scripts/dev-monitor.js --file=./public/index.html
```

## 2. 远程开发服务器监控

如果你的监控脚本运行在开发服务器上：

```bash
# 注入远程脚本
npx dev-inject install --remote=http://localhost:9000/dev-monitor.js
```

## 3. 在 React/Vite 项目中使用

```bash
# 在 Vite 项目中
npx dev-inject install --remote=/scripts/dev-monitor.js --file=./index.html

# 在 Create React App 项目中
npx dev-inject install --remote=/scripts/dev-monitor.js --file=./public/index.html
```

## 4. 开发完成后清理

```bash
# 移除所有注入的脚本
npx dev-inject uninstall

# 只移除特定文件的注入脚本
npx dev-inject uninstall --file=./index.html
```

## 5. 预览模式

在实际注入前，可以先预览将要执行的操作：

```bash
npx dev-inject install --remote=/scripts/dev-monitor.js --dry-run --verbose
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
# 1. 复制监控脚本到项目中
cp dev-inject/scripts/dev-monitor.js my-project/public/scripts/

# 2. 进入项目目录
cd my-project

# 3. 预览注入操作
npx dev-inject install --remote=/scripts/dev-monitor.js --dry-run

# 4. 执行注入
npx dev-inject install --remote=/scripts/dev-monitor.js

# 5. 启动开发服务器
npm run dev

# 6. 在浏览器中测试功能，打开控制台使用 DevMonitor API

# 7. 开发完成后清理注入
npx dev-inject uninstall
```