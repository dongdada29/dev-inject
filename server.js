#!/usr/bin/env node

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 9001;

const server = createServer(async (req, res) => {
  try {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    let filePath = req.url === '/' ? '/test.html' : req.url;

    // 处理静态文件
    if (filePath.startsWith('/scripts/')) {
      // 返回监控脚本
      const scriptContent = await readFile(
        join(__dirname, filePath.slice(1)),
        'utf8'
      );
      res.setHeader('Content-Type', 'application/javascript');
      res.end(scriptContent);
      return;
    }

    if (filePath.startsWith('/dev-inject/')) {
      // 返回 CLI 相关文件
      filePath = filePath.replace('/dev-inject/', '');
    }

    // 读取文件
    const fullPath = join(__dirname, filePath);
    const content = await readFile(fullPath, 'utf8');

    // 设置 Content-Type
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'text/plain');
    }

    res.end(content);
  } catch (error) {
    console.error('Error serving file:', error);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 测试服务器启动成功！`);
  console.log(`📱 测试页面: http://localhost:${PORT}/test.html`);
  console.log(`📊 监控脚本: http://localhost:${PORT}/scripts/dev-monitor.js`);
  console.log(`🛠️  按 Ctrl+C 停止服务器`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});
