#!/usr/bin/env node

console.log('🧪 dev-inject 测试运行器\n');
console.log('=' .repeat(50));

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const testDir = new URL('.', import.meta.url).pathname;

// 颜要在项目根目录运行
const projectRoot = process.cwd();
const cliPath = join(projectRoot, 'bin', 'index.js');
const testPackagePath = join(projectRoot, 'test', 'package.json');

// 检查测试环境
function checkTestEnvironment() {
  if (!existsSync(cliPath)) {
    console.error('❌ CLI 路径不存在:', cliPath);
    console.log('请确保在 dev-inject 项目根目录运行此脚本');
    process.exit(1);
  }

  if (!existsSync(testPackagePath)) {
    console.error('❌ 测试配置不存在:', testPackagePath);
    console.log('正在创建测试配置...');
    execSync('npm init -y', { cwd: join(projectRoot, 'test'), stdio: 'inherit' });
  }
}

// 运行指定类型的测试
function runTests(testType) {
  console.log(`\n🚀 运行 ${testType.toUpperCase()} 测试...\n`);

  try {
    const testCommand = `node --test test/${testType}/*.test.js`;
    execSync(testCommand, {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 60000 // 60秒超时
    });
    return true;
  } catch (error) {
    console.log(`\n❌ ${testType.toUpperCase()} 测试失败`);
    if (error.signal === 'SIGTERM') {
      console.log('   原因: 测试超时');
    }
    return false;
  }
}

// 运行特定测试
function runSpecificTest(testPath) {
  console.log(`\n🎯 运行特定测试: ${testPath}\n`);

  try {
    execSync(`node --test ${testPath}`, {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 30000
    });
    return true;
  } catch (error) {
    console.log(`\n❌ 测试 ${testPath} 失败`);
    return false;
  }
}

// 生成测试报告
function generateTestReport(results) {
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;

  console.log('\n' + '='.repeat(50));
  console.log('📊 测试报告汇总');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${failedTests}/${totalTests}`);
  console.log(`📈 成功率: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试都通过了！dev-inject 功能正常！');
  } else {
    console.log('\n⚠️  有部分测试失败，请检查相关功能。');
  }

  console.log('\n🔍 测试覆盖范围:');
  console.log('   📦 单元测试 - 核心函数和逻辑');
  console.log('   🔧 集成测试 - 模块间协作');
  console.log('   🌐 端到端测试 - 完整工作流');
  console.log('   📱 框架支持 - Vite、Next.js、HTML');

  return passedTests === totalTests;
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  // 检查测试环境
  checkTestEnvironment();

  // 解析命令行参数
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 dev-inject 测试运行器

用法:
  node test/test-runner.js [选项] [测试类型/文件]

选项:
  --help, -h                 显示帮助信息
  --unit                     运行单元测试
  --integration              运行集成测试
  --e2e                      运行端到端测试
  --all                      运行所有测试
  --verbose                  显示详细输出
  --watch                     监听模式（需要 node --test 支持）

示例:
  node test/test-runner.js --unit                    # 只运行单元测试
  node test/test-runner.js --integration             # 只运行集成测试
  node test/test-runner.js --e2e                       # 只运行端到端测试
  node test/test-runner.js --all                       # 运行所有测试
  node test/test-runner.js test/unit/parseArgs.test.js  # 运行特定测试文件

测试类型:
  unit                       单元测试（核心函数）
  integration               集成测试（模块协作）
  e2e                        端到端测试（完整流程）
`);
    process.exit(0);
  }

  const results = {};

  if (args.includes('--all')) {
    // 运行所有测试
    console.log('🎯 运行所有测试套件...');
    results.unit = runTests('unit');
    results.integration = runTests('integration');
    results.e2e = runTests('e2e');
  } else if (args.includes('--unit')) {
    // 运行单元测试
    results.unit = runTests('unit');
  } else if (args.includes('--integration')) {
    // 运行集成测试
    results.integration = runTests('integration');
  } else if (args.includes('--e2e')) {
    // 运行端到端测试
    results.e2e = runTests('e2e');
  } else if (args.some(arg => arg.endsWith('.test.js'))) {
    // 运行特定测试文件
    const testFile = args.find(arg => arg.endsWith('.test.js'));
    const success = runSpecificTest(testFile);
    process.exit(success ? 0 : 1);
  } else {
    // 默认运行快速测试
    console.log('🚀 运行快速测试套件...');
    results.unit = runTests('unit');

    if (results.unit) {
      console.log('\n✅ 单元测试通过，继续运行集成测试...');
      results.integration = runTests('integration');
    }

    if (results.unit && results.integration) {
      console.log('\n✅ 基础测试通过，可以运行完整测试:');
      console.log('   node test/test-runner.js --all');
    }
  }

  // 生成报告
  const allPassed = generateTestReport(results);
  process.exit(allPassed ? 0 : 1);
}

main();
