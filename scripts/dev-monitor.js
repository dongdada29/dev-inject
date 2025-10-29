/**
 * 开发环境监控脚本
 * 提供错误监控、性能监控、通信功能
 */

(function () {
  'use strict';

  // 配置
  const config = {
    version: '1.0.0',
    enabled: true,
    logLevel: 'error', // 只记录错误级别日志
    maxErrors: 10, // 减少存储量
    maxLogs: 20, // 减少存储量
  };

  // 简化的监控数据存储
  const monitorData = {
    errors: [],
    basicInfo: {
      url: window.location.href,
      userAgent: navigator.userAgent.split(' ')[0], // 只保留浏览器名称
    },
    ready: false,
  };

  // 简化的日志函数 - 只记录错误
  const logger = {
    error: (message, details = null) => {
      console.error('[Dev-Monitor ERROR]', message, details || '');

      const errorData = {
        message: typeof message === 'string' ? message : message.toString(),
        details: details ? JSON.stringify(details).substring(0, 200) : null, // 限制详细信息长度
        timestamp: Date.now(),
      };

      monitorData.errors.push(errorData);

      // 限制错误数量
      if (monitorData.errors.length > config.maxErrors) {
        monitorData.errors.shift();
      }
    },
  };

  // 简化的错误监控
  function setupErrorMonitoring() {
    // 全局错误捕获
    window.addEventListener('error', function (event) {
      const errorMsg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      logger.error(errorMsg);
    });

    // Promise 错误捕获
    window.addEventListener('unhandledrejection', function (event) {
      const errorMsg = `Promise rejection: ${event.reason}`;
      logger.error(errorMsg);
    });

    // 资源加载错误 - 只记录关键信息
    window.addEventListener(
      'error',
      function (event) {
        if (event.target !== window) {
          const source = event.target.src || event.target.href || 'unknown';
          logger.error(`Resource failed: ${source}`);
        }
      },
      true
    );
  }

  // 移除复杂的性能监控和控制台拦截，专注于核心错误监控

  // 简化的通信功能
  function setupCommunication() {
    // 向父窗口发送监控数据 - 只在有新错误时发送
    function sendToParent() {
      if (
        window.parent &&
        window.parent !== window &&
        monitorData.errors.length > 0
      ) {
        try {
          const summary = {
            type: 'dev-monitor-summary',
            errorCount: monitorData.errors.length,
            latestError: monitorData.errors[monitorData.errors.length - 1],
            url: monitorData.basicInfo.url,
            timestamp: Date.now(),
          };

          window.parent.postMessage(summary, '*');
        } catch (e) {
          // 静默处理错误
        }
      }
    }

    // 监听来自父窗口的请求
    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === 'dev-monitor-request') {
        const summary = {
          type: 'dev-monitor-data',
          errorCount: monitorData.errors.length,
          errors: monitorData.errors.slice(-3), // 只发送最近3个错误
          url: monitorData.basicInfo.url,
        };

        try {
          window.parent.postMessage(summary, '*');
        } catch (e) {
          // 静默处理错误
        }
      }
    });

    // 降低发送频率 - 每10秒检查一次
    setInterval(sendToParent, 10000);
  }

  // 简化的全局 API
  window.DevMonitor = {
    // 获取错误统计
    getStats: function () {
      return {
        errorCount: monitorData.errors.length,
        url: monitorData.basicInfo.url,
        userAgent: monitorData.basicInfo.userAgent,
        latestError: monitorData.errors[monitorData.errors.length - 1] || null,
      };
    },

    // 获取所有错误（限制数量）
    getErrors: function () {
      return monitorData.errors.slice(-5); // 只返回最近5个错误
    },

    // 清除错误
    clearErrors: function () {
      monitorData.errors = [];
      console.log('✅ DevMonitor errors cleared');
    },

    // 显示简化监控面板
    showPanel: function () {
      // 移除现有面板
      const existingPanel = document.getElementById('dev-monitor-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      const panel = document.createElement('div');
      panel.id = 'dev-monitor-panel';
      panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 280px;
        background: #1a1a1a;
        color: white;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 12px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;

      const errors = monitorData.errors.slice(-3); // 只显示最近3个错误

      panel.innerHTML = `
        <div style="border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #4CAF50;">DevMonitor</strong>
          <button onclick="this.parentElement.parentElement.remove()" style="background: #ff4444; border: none; color: white; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Errors (${monitorData.errors.length}):</strong>
        </div>
        ${
          errors.length
            ? errors
                .map(
                  e => `
          <div style="color: #ff6b6b; margin: 4px 0; padding: 4px; background: rgba(255,107,107,0.1); border-radius: 3px; font-size: 11px;">
            ${e.message}
            ${e.details ? `<br><small style="color: #999;">${e.details}</small>` : ''}
          </div>
        `
                )
                .join('')
            : '<div style="color: #666; font-style: italic;">No errors</div>'
        }
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
          <button onclick="DevMonitor.clearErrors(); DevMonitor.showPanel();" style="background: #333; border: none; color: white; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin-right: 8px;">Clear</button>
          <button onclick="console.log('Stats:', DevMonitor.getStats())" style="background: #2196F3; border: none; color: white; padding: 6px 12px; border-radius: 3px; cursor: pointer;">Stats</button>
        </div>
      `;

      document.body.appendChild(panel);
    },
  };

  // 简化的初始化
  function init() {
    setupErrorMonitoring();
    setupCommunication();
    monitorData.ready = true;

    // 简化的控制台提示
    console.log(
      '%cDevMonitor v' + config.version,
      'color: #4CAF50; font-weight: bold;',
      '- DevMonitor.showPanel()'
    );
  }

  // 立即初始化
  init();
})();
