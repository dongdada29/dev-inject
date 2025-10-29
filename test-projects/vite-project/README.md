# Vite React 测试项目

这是一个用于测试 dev-inject 框架感知注入功能的 Vite + React 项目。

## 安装依赖

```bash
npm install
```

## 启动开发服务器

```bash
npm run dev
```

项目将在 http://localhost:3001 运行。

## 测试步骤

1. 启动项目：`npm run dev`
2. 使用 dev-inject 注入监控脚本
3. 点击页面上的按钮触发各种错误
4. 在浏览器控制台运行 DevMonitor 命令查看监控信息

## DevMonitor 命令

- `DevMonitor.showPanel()` - 显示监控面板
- `DevMonitor.getStats()` - 获取统计信息
- `DevMonitor.clearErrors()` - 清除错误记录
- `window.__DEV_INJECT__` - 检查注入状态

