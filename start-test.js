#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 启动 dev-inject React Vite 测试环境\n');

// 检查依赖
console.log('📋 检查环境...');
const reactProjectPath = join(__dirname, 'examples', 'react-vite-test');

if (!existsSync(join(reactProjectPath, 'package.json'))) {
  console.error('❌ React 项目不存在');
  process.exit(1);
}

if (!existsSync(join(reactProjectPath, 'node_modules'))) {
  console.log('📦 安装 React 项目依赖...');
  try {
    execSync('npm install', { cwd: reactProjectPath, stdio: 'inherit' });
  } catch (error) {
    console.error('❌ 安装依赖失败:', error.message);
    process.exit(1);
  }
}

// 启动服务器
console.log('\n🌐 启动服务器...');

// 1. 启动主服务器 (端口 9001)
console.log('启动主服务器 (端口 9001)...');
const mainServer = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

mainServer.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('测试服务器启动成功')) {
    console.log('✅ 主服务器启动成功');
  }
});

mainServer.stderr.on('data', (data) => {
  console.error('主服务器错误:', data.toString());
});

// 等待主服务器启动
setTimeout(() => {
  // 2. 启动 React 开发服务器 (端口 3000)
  console.log('启动 React 开发服务器 (端口 3000)...');
  const reactServer = spawn('npm', ['run', 'dev'], {
    cwd: reactProjectPath,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  reactServer.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:')) {
      console.log('✅ React 服务器启动成功');
      console.log('\n🎉 所有服务器启动完成！');
      console.log('\n📱 访问地址:');
      console.log('   主页面: http://localhost:9001/react-iframe-test.html');
      console.log('   React App: http://localhost:3000');
      console.log('\n💡 测试步骤:');
      console.log('   1. 打开主页面查看 iframe 通信');
      console.log('   2. 在 iframe 中按 F12 打开开发者工具');
      console.log('   3. 输入 DevMonitor.showPanel() 查看监控面板');
      console.log('   4. 测试各种通信和监控功能');
      console.log('\n🛑 按 Ctrl+C 停止所有服务器');
    }
  });

  reactServer.stderr.on('data', (data) => {
    console.error('React 服务器错误:', data.toString());
  });

  // 优雅关闭处理
  process.on('SIGINT', () => {
    console.log('\n\n🛑 正在关闭服务器...');

    if (reactServer) {
      reactServer.kill('SIGTERM');
    }
    if (mainServer) {
      mainServer.kill('SIGTERM');
    }

    setTimeout(() => {
      console.log('✅ 所有服务器已关闭');
      process.exit(0);
    }, 1000);
  });

  // 处理服务器错误
  reactServer.on('error', (error) => {
    console.error('❌ React 服务器启动失败:', error.message);
    process.exit(1);
  });

}, 2000);

// 处理主服务器错误
mainServer.on('error', (error) => {
  console.error('❌ 主服务器启动失败:', error.message);
  process.exit(1);
});
