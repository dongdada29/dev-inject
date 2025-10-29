#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🧪 开始测试 dev-inject 工具...\n');

// 测试函数
function runTest(testName, command, expectedInOutput) {
  console.log(`\n📋 测试: ${testName}`);
  console.log(`命令: ${command}`);

  try {
    const output = execSync(command, { encoding: 'utf8', cwd: './dev-inject' });

    if (expectedInOutput && output.includes(expectedInOutput)) {
      console.log('✅ 测试通过');
      return true;
    } else if (!expectedInOutput) {
      console.log('✅ 命令执行成功');
      return true;
    } else {
      console.log('❌ 测试失败 - 输出不符合预期');
      console.log('预期输出:', expectedInOutput);
      console.log('实际输出:', output);
      return false;
    }
  } catch (error) {
    console.log('❌ 测试失败 - 命令执行出错');
    console.log('错误信息:', error.message);
    return false;
  }
}

// 检查文件内容函数
function checkFileContains(filePath, expectedContent) {
  try {
    const content = readFileSync(filePath, 'utf8');
    if (content.includes(expectedContent)) {
      console.log('✅ 文件内容检查通过');
      return true;
    } else {
      console.log('❌ 文件内容检查失败');
      console.log('预期内容:', expectedContent);
      return false;
    }
  } catch (error) {
    console.log('❌ 文件读取失败:', error.message);
    return false;
  }
}

let testsPassed = 0;
let totalTests = 0;

// 1. 测试帮助信息
totalTests++;
if (runTest('帮助信息', 'node bin/index.js --help', 'dev-inject - 开发环境脚本注入工具')) {
  testsPassed++;
}

// 2. 测试版本信息
totalTests++;
if (runTest('版本信息', 'node bin/index.js --version', 'dev-inject v1.0.0')) {
  testsPassed++;
}

// 3. 测试绝对路径注入
totalTests++;
if (runTest('绝对路径注入', 'node bin/index.js install --remote=/scripts/dev-monitor.js --file=./test.html', '已注入脚本到 ./test.html')) {
  testsPassed++;

  // 检查文件内容
  totalTests++;
  if (checkFileContains('./dev-inject/test.html', '<script src="/scripts/dev-monitor.js"></script>')) {
    testsPassed++;
  }
}

// 4. 测试远程 URL 注入
totalTests++;
if (runTest('远程 URL 注入', 'node bin/index.js install --remote=http://localhost:9001/scripts/dev-monitor.js --file=./test.html', '已注入脚本到 ./test.html')) {
  testsPassed++;

  // 检查文件内容
  totalTests++;
  if (checkFileContains('./dev-inject/test.html', '<script src="http://localhost:9001/scripts/dev-monitor.js"></script>')) {
    testsPassed++;
  }
}

// 5. 测试卸载功能
totalTests++;
if (runTest('卸载脚本', 'node bin/index.js uninstall --file=./test.html', '已从 ./test.html 移除注入的脚本')) {
  testsPassed++;

  // 检查脚本是否被移除
  totalTests++;
  const content = readFileSync('./dev-inject/test.html', 'utf8');
  if (!content.includes('dev-monitor.js') && !content.includes('injected by dev-inject')) {
    console.log('✅ 脚本已完全移除');
    testsPassed++;
  } else {
    console.log('❌ 脚本未完全移除');
  }
}

// 6. 测试预览模式
totalTests++;
if (runTest('预览模式', 'node bin/index.js install --remote=/scripts/test.js --file=./test.html --dry-run', '[DRY RUN] 将注入脚本到 ./test.html')) {
  testsPassed++;
}

// 7. 测试错误处理
totalTests++;
try {
  execSync('node bin/index.js install', { encoding: 'utf8', cwd: './dev-inject' });
  console.log('❌ 错误处理测试失败 - 应该报错但没有');
} catch (error) {
  if (error.message.includes('install 命令需要 --remote 参数')) {
    console.log('✅ 错误处理测试通过');
    testsPassed++;
  } else {
    console.log('❌ 错误处理测试失败 - 错误信息不符合预期');
  }
}

// 显示测试结果
console.log('\n' + '='.repeat(50));
console.log('📊 测试结果汇总');
console.log('='.repeat(50));
console.log(`✅ 通过: ${testsPassed}/${totalTests}`);
console.log(`❌ 失败: ${totalTests - testsPassed}/${totalTests}`);

if (testsPassed === totalTests) {
  console.log('\n🎉 所有测试都通过了！dev-inject 工具工作正常！');
} else {
  console.log('\n⚠️  有部分测试失败，请检查相关功能。');
}

console.log('\n🌐 测试服务器地址:');
console.log('   测试页面: http://localhost:9001/test.html');
console.log('   监控脚本: http://localhost:9001/scripts/dev-monitor.js');
console.log('\n💡 提示: 在浏览器中打开测试页面，然后按 F12 打开开发者工具查看监控效果');
