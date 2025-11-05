#!/usr/bin/env node

/**
 * 测试脚本 - 运行所有 test-projects 的注入和卸载测试
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const testProjectsDir = join(rootDir, 'test-projects');

// 测试项目列表
const testProjects = [
  { name: 'html-project', type: 'html-static' },
  { name: 'vite-project', type: 'vite' },
  { name: 'next-pages-project', type: 'next-pages' },
  { name: 'next-app-project', type: 'next-app' },
];

// 测试配置
const testConfig = {
  remote: '/sdk/dev-monitor.js',
  remoteUrl: 'https://testagent.xspaceagi.com/sdk/dev-monitor.js',
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logTest(name) {
  log(`\n📦 测试项目: ${name}`, 'cyan');
}

function runCommand(command, cwd) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      error: error.message,
    };
  }
}

/**
 * 测试单个项目的安装（注入）
 */
function testInstall(project, remote, testName) {
  const projectPath = join(testProjectsDir, project.name);

  if (!existsSync(projectPath)) {
    log(`  ❌ 项目目录不存在: ${projectPath}`, 'red');
    return false;
  }

  logTest(`${project.name} (${testName})`);

  // 1. 先清理之前的注入（可选）
  log('  🔄 步骤 1: 清理之前的注入...', 'yellow');
  const uninstallResult = runCommand(
    `node ${join(rootDir, 'bin/index.js')} uninstall --framework`,
    projectPath
  );

  if (!uninstallResult.success && !uninstallResult.output.includes('未找到需要清理的注入脚本')) {
    log(`  ⚠️  清理警告: ${uninstallResult.output}`, 'yellow');
  }

  // 2. 执行注入
  log('  ➕ 步骤 2: 注入脚本...', 'yellow');
  const installResult = runCommand(
    `node ${join(rootDir, 'bin/index.js')} install --remote=${remote} --framework`,
    projectPath
  );

  if (!installResult.success) {
    log(`  ❌ 注入失败: ${installResult.error}`, 'red');
    console.log(installResult.output);
    return false;
  }

  log('  ✅ 注入成功', 'green');

  // 3. 验证注入结果
  log('  🔍 步骤 3: 验证注入结果...', 'yellow');
  const verifyResult = verifyInjection(project, projectPath);

  if (!verifyResult.success) {
    log(`  ❌ 验证失败: ${verifyResult.message}`, 'red');
    return false;
  }

  log('  ✅ 验证通过', 'green');

  return true;
}

/**
 * 测试单个项目的卸载
 */
function testUninstall(project) {
  const projectPath = join(testProjectsDir, project.name);

  if (!existsSync(projectPath)) {
    log(`  ❌ 项目目录不存在: ${projectPath}`, 'red');
    return false;
  }

  logTest(`${project.name}`);

  // 1. 先确保有注入内容（如果没有，先注入）
  log('  🔍 步骤 1: 检查是否有注入内容...', 'yellow');
  const hasInjection = checkInjection(project, projectPath);

  if (!hasInjection) {
    log('  ⚠️  未找到注入内容，先执行注入...', 'yellow');
    const installResult = runCommand(
      `node ${join(rootDir, 'bin/index.js')} install --remote=/sdk/dev-monitor.js --framework`,
      projectPath
    );

    if (!installResult.success) {
      log(`  ❌ 预注入失败: ${installResult.error}`, 'red');
      return false;
    }
    log('  ✅ 预注入成功', 'green');
  }

  // 2. 执行卸载
  log('  🗑️  步骤 2: 卸载注入...', 'yellow');
  const uninstallResult = runCommand(
    `node ${join(rootDir, 'bin/index.js')} uninstall --framework`,
    projectPath
  );

  if (!uninstallResult.success) {
    log(`  ❌ 卸载失败: ${uninstallResult.error}`, 'red');
    console.log(uninstallResult.output);
    return false;
  }

  log('  ✅ 卸载成功', 'green');

  // 3. 验证卸载结果
  log('  🔍 步骤 3: 验证卸载结果...', 'yellow');
  const verifyResult = verifyUninstall(project, projectPath);

  if (!verifyResult.success) {
    log(`  ❌ 验证失败: ${verifyResult.message}`, 'red');
    return false;
  }

  log('  ✅ 验证通过', 'green');

  return true;
}

/**
 * 检查是否有注入内容
 */
function checkInjection(project, projectPath) {
  try {
    switch (project.type) {
      case 'html-static': {
        const htmlFile = join(projectPath, 'index.html');
        if (existsSync(htmlFile)) {
          const content = readFileSync(htmlFile, 'utf8');
          return content.includes('DEV-INJECT-START');
        }
        return false;
      }
      case 'vite': {
        const configFile = join(projectPath, 'vite.config.js');
        if (existsSync(configFile)) {
          const content = readFileSync(configFile, 'utf8');
          return content.includes('DEV-INJECT-START');
        }
        return false;
      }
      case 'next-pages': {
        const docFile = join(projectPath, 'pages/_document.tsx');
        if (existsSync(docFile)) {
          const content = readFileSync(docFile, 'utf8');
          return content.includes('DEV-INJECT-START');
        }
        return false;
      }
      case 'next-app': {
        const layoutFile = join(projectPath, 'app/layout.tsx');
        if (existsSync(layoutFile)) {
          const content = readFileSync(layoutFile, 'utf8');
          return content.includes('DEV-INJECT-START');
        }
        return false;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * 验证注入结果
 */
function verifyInjection(project, projectPath) {
  try {
    switch (project.type) {
      case 'html-static': {
        const htmlFile = join(projectPath, 'index.html');
        const content = readFileSync(htmlFile, 'utf8');
        if (!content.includes('DEV-INJECT-START')) {
          return { success: false, message: 'HTML 文件中未找到注入标记' };
        }
        break;
      }
      case 'vite': {
        const configFile = join(projectPath, 'vite.config.js');
        const content = readFileSync(configFile, 'utf8');
        if (!content.includes('DEV-INJECT-START')) {
          return { success: false, message: 'Vite 配置文件中未找到注入标记' };
        }
        // 验证逗号位置（允许多种格式）
        if (!content.includes('// <!-- DEV-INJECT-END -->')) {
          return { success: false, message: '未找到结束标记' };
        }
        // 验证 index.html 未被修改
        const htmlFile = join(projectPath, 'index.html');
        const htmlContent = readFileSync(htmlFile, 'utf8');
        if (htmlContent.includes('DEV-INJECT-START')) {
          return { success: false, message: 'index.html 不应包含注入标记' };
        }
        break;
      }
      case 'next-pages': {
        const docFile = join(projectPath, 'pages/_document.tsx');
        if (existsSync(docFile)) {
          const content = readFileSync(docFile, 'utf8');
          if (!content.includes('DEV-INJECT-START')) {
            return { success: false, message: '_document.tsx 中未找到注入标记' };
          }
        }
        break;
      }
      case 'next-app': {
        const layoutFile = join(projectPath, 'app/layout.tsx');
        if (existsSync(layoutFile)) {
          const content = readFileSync(layoutFile, 'utf8');
          if (!content.includes('DEV-INJECT-START')) {
            return { success: false, message: 'layout.tsx 中未找到注入标记' };
          }
        }
        break;
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * 验证卸载结果
 */
function verifyUninstall(project, projectPath) {
  try {
    switch (project.type) {
      case 'html-static': {
        const htmlFile = join(projectPath, 'index.html');
        const content = readFileSync(htmlFile, 'utf8');
        if (content.includes('DEV-INJECT-START')) {
          return { success: false, message: 'HTML 文件中仍存在注入标记' };
        }
        break;
      }
      case 'vite': {
        const configFile = join(projectPath, 'vite.config.js');
        const content = readFileSync(configFile, 'utf8');
        if (content.includes('DEV-INJECT-START')) {
          return { success: false, message: 'Vite 配置文件中仍存在注入标记' };
        }
        break;
      }
      case 'next-pages': {
        const docFile = join(projectPath, 'pages/_document.tsx');
        if (existsSync(docFile)) {
          const content = readFileSync(docFile, 'utf8');
          if (content.includes('DEV-INJECT-START')) {
            return { success: false, message: '_document.tsx 中仍存在注入标记' };
          }
        }
        break;
      }
      case 'next-app': {
        const layoutFile = join(projectPath, 'app/layout.tsx');
        if (existsSync(layoutFile)) {
          const content = readFileSync(layoutFile, 'utf8');
          if (content.includes('DEV-INJECT-START')) {
            return { success: false, message: 'layout.tsx 中仍存在注入标记' };
          }
        }
        break;
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * 运行安装测试
 */
function runInstallTests() {
  logSection('🚀 开始运行安装（注入）测试');
  log(`测试目录: ${testProjectsDir}`, 'blue');
  log(`测试项目数量: ${testProjects.length}`, 'blue');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    projects: [],
  };

  // 测试本地路径注入
  logSection('📝 测试 1: 本地路径注入 (/sdk/dev-monitor.js)');

  for (const project of testProjects) {
    results.total++;
    const success = testInstall(project, testConfig.remote, '本地路径');
    results.projects.push({ project: project.name, test: '本地路径', success });

    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 测试远程 URL 注入
  logSection('🌐 测试 2: 远程 URL 注入 (https://testagent.xspaceagi.com/sdk/dev-monitor.js)');

  for (const project of testProjects) {
    results.total++;
    const success = testInstall(project, testConfig.remoteUrl, '远程URL');
    results.projects.push({ project: project.name, test: '远程URL', success });

    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 输出测试结果
  logSection('📊 安装测试结果汇总');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  console.log('\n详细结果:');
  results.projects.forEach(({ project, test, success }) => {
    const icon = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`  ${icon} ${project} - ${test}`, color);
  });

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * 运行卸载测试
 */
function runUninstallTests() {
  logSection('🚀 开始运行卸载测试');
  log(`测试目录: ${testProjectsDir}`, 'blue');
  log(`测试项目数量: ${testProjects.length}`, 'blue');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    projects: [],
  };

  for (const project of testProjects) {
    results.total++;
    const success = testUninstall(project);
    results.projects.push({ project: project.name, success });

    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 输出测试结果
  logSection('📊 卸载测试结果汇总');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  console.log('\n详细结果:');
  results.projects.forEach(({ project, success }) => {
    const icon = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`  ${icon} ${project}`, color);
  });

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * 运行所有测试（安装 + 卸载）
 */
function runAllTests() {
  logSection('🚀 开始运行完整测试（安装 + 卸载）');
  log(`测试目录: ${testProjectsDir}`, 'blue');
  log(`测试项目数量: ${testProjects.length}`, 'blue');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    projects: [],
  };

  // 先运行安装测试
  logSection('📝 第一部分: 安装测试');

  for (const project of testProjects) {
    results.total++;
    const success = testInstall(project, testConfig.remote, '本地路径');
    results.projects.push({ project: project.name, test: '安装', success });

    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 再运行卸载测试
  logSection('🗑️  第二部分: 卸载测试');

  for (const project of testProjects) {
    results.total++;
    const success = testUninstall(project);
    results.projects.push({ project: project.name, test: '卸载', success });

    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // 输出测试结果
  logSection('📊 完整测试结果汇总');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  console.log('\n详细结果:');
  results.projects.forEach(({ project, test, success }) => {
    const icon = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`  ${icon} ${project} - ${test}`, color);
  });

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'all';

// 运行测试
try {
  switch (command) {
    case 'install':
    case 'i':
      runInstallTests();
      break;
    case 'uninstall':
    case 'u':
      runUninstallTests();
      break;
    case 'all':
    default:
      runAllTests();
      break;
  }
} catch (error) {
  log(`\n❌ 测试执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}

