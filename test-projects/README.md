# 测试项目集合

这个目录包含了用于测试 dev-inject 在不同框架和项目类型中的注入功能的示例项目。

## 项目列表

### 1. HTML 静态项目 (html-project)
- **类型**: 纯 HTML + JavaScript
- **端口**: 3002
- **启动**: `npm run serve` 或 `python3 -m http.server 3002`
- **特点**: 基础的 HTML 项目，用于测试最简单场景下的脚本注入

### 2. Vite 项目 (vite-project)
- **类型**: Vite + React
- **端口**: 3001
- **启动**: `npm run dev`
- **特点**: 现代化的 Vite 构建工具，单页应用

### 3. Next.js App Router (next-app-project)
- **类型**: Next.js 14 App Router
- **端口**: 3000
- **启动**: `npm run dev`
- **特点**: 最新的 Next.js 应用路由架构，支持 React Server Components

### 4. Next.js Pages Router (next-pages-project)
- **类型**: Next.js Pages Router
- **端口**: 3000
- **启动**: `npm run dev`
- **特点**: 传统的 Next.js Pages 路由架构

## 使用指南

### 快速开始

1. **选择一个测试项目**
   ```bash
   cd test-projects/html-project  # 或选择其他项目
   ```

2. **安装依赖**（如果有 package.json）
   ```bash
   npm install
   ```

3. **启动项目**
   ```bash
   npm run dev
   # 或
   npm run serve
   # 或
   python3 -m http.server 3002
   ```

4. **使用 dev-inject 注入监控脚本**
   ```bash
   # 在项目根目录运行
   node ../bin/index.js install --remote http://localhost:9001/scripts/dev-monitor.js
   ```

5. **测试功能**
   - 打开浏览器访问项目
   - 点击页面上的按钮触发各种错误
   - 在浏览器控制台运行 DevMonitor 命令查看监控信息

### 测试命令

所有测试项目都支持以下 DevMonitor 命令：

```javascript
// 显示监控面板
DevMonitor.showPanel()

// 获取统计信息
DevMonitor.getStats()

// 清除错误记录
DevMonitor.clearErrors()

// 检查注入状态
window.__DEV_INJECT__
```

## 功能特性

每个测试项目都包含以下功能：

- ✅ 触发同步错误
- ✅ 触发异步错误
- ✅ 错误记录和显示
- ✅ 清除错误功能
- ✅ DevMonitor 控制台命令
- ✅ 实时错误统计
- ✅ 美观的 UI 界面

## 项目对比

| 项目类型 | 构建工具 | 路由方式 | 启动速度 | 适用场景 |
|---------|---------|---------|---------|---------|
| HTML | 无 | 静态文件 | 最快 | 传统网站 |
| Vite | Vite | SPA | 快 | 现代 SPA 应用 |
| Next.js App | Next.js | App Router | 中 | 全栈应用（推荐） |
| Next.js Pages | Next.js | Pages Router | 中 | 传统 Next.js 应用 |

## 注意事项

1. **端口冲突**: 确保各个项目使用不同的端口
2. **依赖安装**: 每个项目需要单独安装依赖
3. **测试服务器**: 确保 dev-inject 的监控服务器 (localhost:9001) 正在运行
4. **框架检测**: dev-inject 会自动检测项目类型并应用相应的注入策略

## 问题排查

如果遇到问题：

1. 检查端口是否被占用
2. 确认所有依赖已正确安装
3. 查看浏览器控制台是否有错误
4. 确认监控服务器是否正在运行
5. 检查注入的脚本是否正确加载

## 贡献

欢迎添加更多测试项目或改进现有项目！

