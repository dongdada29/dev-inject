# HTML 静态项目测试

这是一个用于测试 dev-inject 在纯 HTML 静态项目中的注入功能的示例项目。

## 启动项目

### 方式 1: 使用 Python
```bash
python3 -m http.server 3002
```

### 方式 2: 使用 serve
```bash
npx serve -s . -p 3002
```

项目将在 http://localhost:3002 运行。

## 测试步骤

1. 启动项目（任选上述方式之一）
2. 使用 dev-inject 注入监控脚本
3. 点击页面上的按钮触发各种错误类型
4. 在浏览器控制台运行 DevMonitor 命令查看监控信息

## DevMonitor 命令

- `DevMonitor.showPanel()` - 显示监控面板
- `DevMonitor.getStats()` - 获取统计信息
- `DevMonitor.clearErrors()` - 清除错误记录
- `window.__DEV_INJECT__` - 检查注入状态

## 功能特性

- 触发同步错误
- 触发异步错误
- 触发引用错误
- 触发类型错误
- 实时统计错误数据
- 清除错误记录

