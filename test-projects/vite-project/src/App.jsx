import React, { useState } from 'react'
import './App.css'

function App() {
  const [errors, setErrors] = useState([]);

  const triggerError = () => {
    try {
      throw new Error('测试错误 - Vite 项目');
    } catch (error) {
      setErrors(prev => [...prev, error.message]);
    }
  };

  const triggerAsyncError = () => {
    Promise.reject(new Error('异步错误测试 - Vite'));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>🟣 Vite Test Project</h1>
          <p>测试 dev-inject 框架感知注入功能</p>
        </header>

        <div className="section">
          <h2>🚀 测试功能</h2>
          <div className="buttons">
            <button onClick={triggerError} className="danger">
              触发同步错误
            </button>
            <button onClick={triggerAsyncError} className="danger">
              触发异步错误
            </button>
            <button onClick={clearErrors} className="secondary">
              清除错误
            </button>
          </div>
        </div>

        <div className="section">
          <h2>📊 错误记录</h2>
          {errors.length === 0 ? (
            <p className="no-errors">暂无错误</p>
          ) : (
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index} className="error-item">{error}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="section">
          <h2>🔧 DevMonitor 检查</h2>
          <p>在浏览器控制台中检查：</p>
          <ul>
            <li><code>DevMonitor.showPanel()</code> - 显示监控面板</li>
            <li><code>DevMonitor.getStats()</code> - 获取统计信息</li>
            <li><code>window.__DEV_INJECT__</code> - 检查注入状态</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
