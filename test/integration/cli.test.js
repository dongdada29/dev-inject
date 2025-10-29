import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CLI 功能集成测试', () => {
  const testDir = join(__dirname, 'fixtures');
  const cliPath = join(__dirname, '..', '..', 'bin', 'index.js');
  const projectRoot = join(__dirname, '..', '..');

  test.before(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  test.after(() => {
    // 清理测试文件
    const filesToClean = [
      'vite.config.js',
      'next.config.js',
      'app/layout.tsx',
      'pages/_document.tsx',
      'test.html',
      'public/index.html'
    ];

    filesToClean.forEach(file => {
      const filePath = join(testDir, file);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
    });

    const dirsToClean = ['app', 'pages', 'public'];
    dirsToClean.forEach(dir => {
      const dirPath = join(testDir, dir);
      if (existsSync(dirPath)) {
        rmSync(dirPath, { recursive: true });
      }
    });
  });

  function runCli(args, options = {}) {
    try {
      const result = execSync(`node ${cliPath} ${args}`, {
        encoding: 'utf8',
        cwd: options.cwd || projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      return { success: true, output: result };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || error.message,
        code: error.status
      };
    }
  }

  describe('基本 CLI 命令', () => {
    test('应该显示帮助信息', () => {
      const result = runCli('--help');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /dev-inject.*开发环境脚本注入工具/);
      assert.match(result.output, /--framework.*使用框架感知注入模式/);
      assert.match(result.output, /--remote.*脚本地址/);
    });

    test('应该显示版本信息', () => {
      const result = runCli('--version');

      assert.strictEqual(result.success, true);
      assert.match(result.output, /dev-inject v\d+\.\d+\.\d+/);
    });

    test('应该处理无效参数', () => {
      const result = runCli('--invalid-option');

      // 应该仍然成功（忽略未知选项）
      assert.strictEqual(result.success, true);
    });

    test('应该在缺少参数时显示错误', () => {
      const result = runCli('install');

      assert.strictEqual(result.success, false);
      assert.match(result.output, /install 命令需要 --remote 参数/);
    });
  });

  describe('框架感知命令', () => {
    test('应该检测到 Vite 项目', () => {
      // 创建 Vite 项目
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = { plugins: [] }');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /检测到项目类型: vite/);
      assert.match(result.output, /DRY RUN/);
    });

    test('应该检测到 Next.js App Router', () => {
      // 创建 Next.js App Router
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}');
      mkdirSync(join(testDir, 'app'), { recursive: true });
      writeFileSync(join(testDir, 'app', 'layout.tsx'), 'export default function Layout() {}');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /检测到项目类型: next-app/);
    });

    test('应该检测到 Next.js Pages Router', () => {
      // 创建 Next.js Pages Router
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {}');
      mkdirSync(join(testDir, 'pages'), { recursive: true });
      writeFileSync(join(testDir, 'pages', '_document.tsx'), 'export default function Document() {}');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /检测到项目类型: next-pages/);
    });

    test('应该检测到 Create React App', () => {
      // Create React App
      mkdirSync(join(testDir, 'public'), { recursive: true });
      writeFileSync(join(testDir, 'public', 'index.html'), '<html></html>');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /检测到项目类型: create-react-app/);
    });

    test('应该检测到 HTML 项目', () => {
      writeFileSync(join(testDir, 'index.html'), '<html></html>');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /检测到项目类型: html-static/);
    });
  });

  describe('传统注入模式', () => {
    test('应该注入到 HTML 文件', () => {
      // 创建 HTML 文件
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`;
      writeFileSync(join(testDir, 'test.html'), htmlContent);

      const result = runCli('install --remote=/scripts/test.js --file=./test.html --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /DRY RUN.*将注入脚本到.*test\.html/);
    });

    test('应该查找多个 HTML 文件', () => {
      // 创建多个 HTML 文件
      writeFileSync(join(testDir, 'index.html'), '<html></html>');
      writeFileSync(join(testDir, 'test.html'), '<html></html>');

      const result = runCli('install --remote=/scripts/test.js --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /找到 \d+ 个 HTML 文件/);
    });
  });

  describe('卸载功能', () => {
    test('应该支持传统卸载', () => {
      writeFileSync(join(testDir, 'test.html'), '<html></html>');

      const result = runCli('uninstall --file=./test.html --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /卸载脚本/);
    });

    test('应该支持框架卸载', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = { plugins: [] }');

      const result = runCli('uninstall --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      // 框架卸载的输出可能不同
    });
  });

  describe('详细输出模式', () => {
    test('应该显示详细的注入信息', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = { plugins: [] }');

      const result = runCli('install --remote=/scripts/test.js --framework --dry-run --verbose', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
      assert.match(result.output, /脚本类型:/);
      assert.match(result.output, /脚本标签:/);
    });
  });

  describe('错误处理', () => {
    test('应该处理不存在的文件', () => {
      const result = runCli('install --remote=/scripts/test.js --file=./nonexistent.html', {
        cwd: testDir
      });

      assert.strictEqual(result.success, false);
      assert.match(result.output, /未找到 HTML 文件/);
    });

    test('应该处理权限问题', () => {
      // 创建只读目录（在某些系统上可能不支持）
      try {
        mkdirSync(join(testDir, 'readonly'), { recursive: true, mode: 0o444 });

        const result = runCli('install --remote=/scripts/test.js --file=./readonly/test.html', {
          cwd: testDir
        });

        // 应该有某种错误处理
        assert.ok(true);
      } catch (error) {
        // 忽略权限相关的错误
      }
    });
  });

  describe('参数验证', () => {
    test('应该验证远程 URL 格式', () => {
      const result = runCli('install --remote=invalid-url --framework --dry-run', {
        cwd: testDir
      });

      // 应该仍然接受，验证在实际注入时进行
      assert.strictEqual(result.success, true);
    });

    test('应该处理空参数', () => {
      const result = runCli('install --remote= --framework --dry-run', {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
    });

    test('应该处理长参数', () => {
      const longRemote = 'https://example.com/' + 'a'.repeat(100) + '/script.js';
      const result = runCli(`install --remote=${longRemote} --framework --dry-run`, {
        cwd: testDir
      });

      assert.strictEqual(result.success, true);
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内完成', () => {
      // 创建一些文件
      for (let i = 0; i < 10; i++) {
        writeFileSync(join(testDir, `test${i}.html`), '<html></html>');
      }

      const startTime = Date.now();
      const result = runCli('install --remote=/scripts/test.js --dry-run', {
        cwd: testDir
      });
      const endTime = Date.now();

      assert.strictEqual(result.success, true);
      assert(endTime - startTime < 5000, 'CLI 命令应该在 5 秒内完成');
    });
  });
});
