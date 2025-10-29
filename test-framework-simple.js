#!/usr/bin/env node

console.log('🧪 dev-inject 框架感知功能测试\n');

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('📋 基础 CLI 功能测试:');
console.log('='.repeat(50));

let passedTests = 0;
let totalTests = 0;

// 测试帮助信息
totalTests++;
try {
  const helpOutput = execSync('node bin/index.js --help', { encoding: 'utf8', cwd: '.' });
  const hasFrameworkOption = helpOutput.includes('--framework');

  if (hasFrameworkOption) {
    console.log('✅ 帮助信息包含 --framework 选项');
    passedTests++;
  } else {
    console.log('❌ 帮助信息缺少 --framework 选项');
  }
} catch (error) {
  console.log('❌ 帮助信息测试失败:', error.message);
}

// 测试版本信息
totalTests++;
try {
  const versionOutput = execSync('node bin/index.js --version', { encoding: 'utf8', cwd: '.' });
  const hasVersion = versionOutput.includes('dev-inject v');

  if (hasVersion) {
    console.log('✅ 版本信息正常');
    passedTests++;
  } else {
    console.log('❌ 版本信息异常');
  }
} catch (error) {
  console.log('❌ 版本信息测试失败:', error.message);
}

console.log('\n📋 框架检测功能测试:');
console.log('='.repeat(50));

// 测试项目类型检测（使用简化版本）
totalTests++;
try {
  const testOutput = execSync(
    'node -e "import(\'./lib/smart-inject.js\').then(m => console.log(JSON.stringify(m.detectProjectType())))"',
    { encoding: 'utf8', cwd: '.' }
  );

  if (testOutput.trim()) {
    console.log(`✅ 框架检测功能正常 (${testOutput.trim()})`);
    passedTests++;
  } else {
    console.log('❌ 框架检测功能异常');
  }
} catch (error) {
  console.log('❌ 框架检测测试失败:', error.message);
}

console.log('\n📋 预览模式测试:');
console.log('='.repeat(50));

// 测试预览模式
totalTests++;
try {
  const dryRunOutput = execSync(
    'node bin/index.js install --remote=/scripts/test.js --framework --dry-run',
    { encoding: 'utf8', cwd: '.' }
  );

  const hasDryRun = dryRunOutput.includes('[DRY RUN]') || dryRunOutput.includes('检测到项目类型');

  if (hasDryRun) {
    console.log('✅ 预览模式正常');
    passedTests++;
  } else {
    console.log('❌ 预览模式异常');
    console.log('输出:', dryRunOutput);
  }
} catch (error) {
  console.log('❌ 预览模式测试失败:', error.message);
}

// 显示测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果汇总');
console.log('='.repeat(50));
console.log(`✅ 通过: ${passedTests}/${totalTests}`);
console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有基础测试都通过了！dev-inject 框架感知功能基本正常！');

  console.log('\n🚀 使用方法:');
  console.log('# Vite 项目');
  console.log('cd your-vite-project');
  console.log('npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework');
  console.log('');
  console.log('# Next.js 项目');
  console.log('cd your-next-project');
  console.log('npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework');
  console.log('');
  console.log('# 查看帮助');
  console.log('npx dev-inject --help');

} else {
  console.log('\n⚠️  有部分测试失败，但核心功能可能仍然可用。');
  console.log('\n🔧 手动测试建议:');
  console.log('1. 在你的项目中运行:');
  console.log('   npx dev-inject install --remote=http://localhost:9000/dev-monitor.js --framework --dry-run');
  console.log('2. 检查是否正确检测到项目类型');
  console.log('3. 确认注入方式是否合适');
}

console.log('\n🎯 测试完成！');
