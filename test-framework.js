#!/usr/bin/env node

console.log('🧪 dev-inject 框架感知功能测试\n');

import { detectProjectType } from './lib/smart-inject.js';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// 测试项目列表
const testProjects = [
  { name: 'Vite Project', path: './test-projects/vite-project', expected: 'vite' },
  { name: 'Next.js App Router', path: './test-projects/next-app-project', expected: 'next-app' },
  { name: 'HTML Static', path: './test-projects/html-project', expected: 'html-static' },
];

console.log('📋 项目类型检测测试:');
console.log('='.repeat(50));

let passedTests = 0;
let totalTests = testProjects.length;

testProjects.forEach(project => {
  try {
    if (!existsSync(project.path)) {
      console.log(`⚠️  ${project.name}: 跳过 - 项目目录不存在`);
      totalTests--;
      return;
    }

    // 切换到测试项目目录进行检测
    const originalCwd = process.cwd();
    process.chdir(project.path);

    const detectedType = detectProjectType();
    const success = detectedType === project.expected;

    if (success) {
      console.log(`✅ ${project.name}: 检测正确 (${detectedType})`);
      passedTests++;
    } else {
      console.log(`❌ ${project.name}: 检测失败`);
      console.log(`   期望: ${project.expected}, 实际: ${detectedType}`);
    }

    // 恢复原始目录
    process.chdir(originalCwd);

  } catch (error) {
    console.log(`❌ ${project.name}: 检测出错 - ${error.message}`);
  }
});

console.log('\n📋 CLI 命令测试:');
console.log('='.repeat(50));

// 测试帮助信息
try {
  const helpOutput = execSync('node bin/index.js --help', { encoding: 'utf8', cwd: '.' });
  const hasFrameworkOption = helpOutput.includes('--framework');

  if (hasFrameworkOption) {
    console.log('✅ 帮助信息包含 --framework 选项');
    passedTests++;
  } else {
    console.log('❌ 帮助信息缺少 --framework 选项');
  }
  totalTests++;
} catch (error) {
  console.log('❌ 帮助信息测试失败:', error.message);
  totalTests++;
}

// 测试框架检测功能（如果存在测试项目）
console.log('\n📋 框架注入测试:');
console.log('='.repeat(50));

testProjects.forEach(project => {
  if (!existsSync(project.path)) {
    return;
  }

  try {
    // 测试框架感知命令
    const result = execSync(
      `node bin/index.js install --remote=/scripts/dev-monitor.js --framework --dry-run --verbose`,
      {
        encoding: 'utf8',
        cwd: project.path,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const hasProjectType = result.includes(`检测到项目类型:`);

    if (hasProjectType) {
      console.log(`✅ ${project.name}: 框架检测正常`);
      passedTests++;
    } else {
      console.log(`❌ ${project.name}: 框架检测失败`);
    }
    totalTests++;

  } catch (error) {
    console.log(`❌ ${project.name}: 框架注入测试失败 - ${error.message}`);
    totalTests++;
  }
});

// 显示测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果汇总');
console.log('='.repeat(50));
console.log(`✅ 通过: ${passedTests}/${totalTests}`);
console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试都通过了！dev-inject 框架感知功能工作正常！');

  console.log('\n🚀 快速开始测试:');
  console.log('1. 进入测试项目目录:');
  console.log('   cd test-projects/vite-project');
  console.log('2. 安装依赖:');
  console.log('   npm install');
  console.log('3. 注入监控脚本:');
  console.log('   npx dev-inject install --remote=/scripts/dev-monitor.js --framework');
  console.log('4. 启动开发服务器:');
  console.log('   npm run dev');
  console.log('5. 在浏览器中测试功能');

} else {
  console.log('\n⚠️  有部分测试失败，请检查相关功能。');

  console.log('\n🔧 调试建议:');
  console.log('- 检查 test-projects 目录是否完整');
  console.log('- 验证框架检测逻辑是否正确');
  console.log('- 确认 CLI 参数解析是否正常');
}

console.log('\n🎯 测试完成！');
