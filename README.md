# dev-inject

🚀 **框架感知的开发环境脚本注入工具**

支持 Vite、Next.js、React 等现代框架的智能脚本注入，提供零侵入式的开发期监控方案。

## 🌟 特性

### 框架感知注入
- 🟢 **Vite**: 自动注入 Vite 插件到 `vite.config.js`
- 🟢 **Next.js App Router**: 注入到 `app/layout.tsx`
- 🟢 **Next.js Pages Router**: 注入到 `pages/_document.tsx`
- 🟢 **Create React App**: 注入到 `public/index.html`
- 🟢 **传统 HTML**: 直接修改 HTML 文件

### 核心功能
- ✅ 支持远程 URL 和绝对路径注入
- ✅ 自动检测项目类型和最佳注入方式
- ✅ 智能去重，避免重复注入
- ✅ 支持卸载功能
- ✅ 预览模式（dry-run）
- ✅ 详细日志输出
- ✅ 零侵入式修改

## 安装

本地开发（推荐）：

```bash
cd dev-inject
npm link
```

或者直接使用 npx：

```bash
npx dev-inject --help
```

## 🚀 快速开始

### 框架感知注入（推荐）

```bash
# Vite 项目
cd your-vite-project
npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# Next.js 项目
cd your-next-project  
npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework

# 查看检测到的项目类型
npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework --verbose
```

### 传统 HTML 注入

```bash
# 注入远程脚本
npx dev-inject install --remote=http://localhost:9000/dev-monitor.js

# 注入本地脚本
npx dev-inject install --remote=/scripts/dev-monitor.js

# 指定特定文件
npx dev-inject install --remote=/scripts/monitor.js --file=./public/index.html
```

### 预览和卸载

```bash
# 预览将要执行的操作
npx dev-inject install --remote=/scripts/monitor.js --framework --dry-run

# 移除框架注入
npx dev-inject uninstall --framework

# 移除传统注入
npx dev-inject uninstall
```

## 📋 支持的脚本格式

### 远程 URL
```bash
--remote=http://localhost:9000/dev-monitor.js
--remote=https://cdn.example.com/monitor.js
```

### 绝对路径
```bash
--remote=/scripts/dev-monitor.js
--remote=/assets/monitor.js
```

## 🎯 配置选项

| 选项 | 描述 | 示例 |
|------|------|------|
| `--remote` | 脚本地址（必需） | `--remote=/scripts/dev-monitor.js` |
| `--framework, -f` | 使用框架感知注入 | `--framework` |
| `--file` | 指定 HTML 文件 | `--file=./public/index.html` |
| `--dry-run` | 预览模式 | `--dry-run` |
| `--verbose` | 详细输出 | `--verbose` |
| `--help` | 显示帮助 | `--help` |
| `--version` | 显示版本 | `--version` |

## 监控脚本功能

`dev-inject/scripts/dev-monitor.js` 提供完整的开发监控功能：

### 错误监控
- 全局 JavaScript 错误捕获
- Promise Rejection 监控  
- 资源加载错误监控
- iframe 通信错误

### 性能监控
- 页面加载时间分析
- 网络请求时间统计
- 长任务检测
- DOM Ready 性能

### 开发工具
- 实时监控面板
- 数据导出功能
- 控制台日志拦截
- iframe 通信支持

### 使用监控面板
```javascript
// 在浏览器控制台执行
DevMonitor.showPanel();    // 显示监控面板
DevMonitor.getData();      // 获取监控数据
DevMonitor.exportData();   // 导出监控数据
DevMonitor.clearData();    // 清除监控数据
```

## 配置选项

| 选项 | 描述 | 示例 |
|------|------|------|
| `--remote` | 脚本地址（必需） | `--remote=/scripts/dev-monitor.js` |
| `--file` | 指定 HTML 文件 | `--file=./public/index.html` |
| `--dry-run` | 预览模式 | `--dry-run` |
| `--verbose` | 详细输出 | `--verbose` |
| `--help` | 显示帮助 | `--help` |
| `--version` | 显示版本 | `--version` |

## 工作原理

1. **查找 HTML 文件**：自动查找项目中的 HTML 文件（优先 index.html）
2. **脚本注入**：在 `</head>` 标签前注入脚本
3. **去重处理**：移除之前注入的相同脚本，避免重复
4. **智能检测**：支持多种项目结构（React、Vite、Next.js 等）

## 开发和测试

```bash
# 进入项目目录
cd dev-inject

# 链接到全局（用于测试）
npm link

# 测试帮助信息
dev-inject --help

# 测试注入功能（预览模式）
dev-inject install --remote=/scripts/dev-monitor.js --dry-run

# 取消链接
npm unlink
```

## 项目结构

```
dev-inject/
├── bin/
│   └── index.js              # CLI 入口文件
├── lib/
│   ├── args.js               # 参数解析
│   ├── inject.js             # 核心注入功能
│   ├── utils.js              # 工具函数
│   └── help.js               # 帮助信息
├── scripts/
│   └── dev-monitor.js        # 监控脚本
├── package.json              # 项目配置
└── README.md                 # 说明文档
```

## 兼容性

- ✅ Node.js >= 14.0.0
- ✅ 所有现代浏览器
- ✅ React、Vue、Angular、Next.js 等
- ✅ Vite、Webpack、Create React App 等构建工具

## 📦 发布配置

本项目已配置 npm publish 时仅包含必要的文件：

**包含的文件：**
- ✅ `bin/` - CLI 可执行文件
- ✅ `lib/` - 核心库文件
- ✅ `scripts/` - 监控脚本
- ✅ `*.md` - 文档文件
- ✅ `LICENSE` - 许可证

**排除的文件：**
- ❌ `test/` - 测试文件
- ❌ `test-projects/` - 测试项目
- ❌ 所有 `*.test.js` 文件
- ❌ 测试和演示 HTML 文件
- ❌ 日志和缓存文件
- ❌ 开发工具配置

完整配置请查看 `package.json` 的 `files` 字段和 `.npmignore` 文件。

## 注意事项

1. **绝对路径**：确保静态文件服务器可以访问该路径
2. **重复注入**：工具会自动处理重复注入问题
3. **权限**：确保有 HTML 文件的写入权限
4. **备份**：建议在操作前备份重要文件

## 许可证

MIT
