import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('端到端测试', () => {
  const testDir = join(__dirname, 'fixtures');
  const cliPath = join(__dirname, '..', '..', 'bin', 'index.js');
  const projectRoot = join(__dirname, '..', '..');

  // 创建测试项目的基本结构
  const testProjects = {
    vite: {
      name: 'test-vite-project',
      files: {
        'package.json': JSON.stringify({
          "name": "test-vite-project",
          "version": "1.0.0",
          "type": "module",
          "scripts": { "dev": "vite" },
          "dependencies": { "react": "^18.2.0" }
        }, null, 2),
        'vite.config.js': `import { defineConfig } from 'vite'
export default defineConfig({
  plugins: []
})`,
        'index.html': `<!DOCTYPE html>
<html>
<head>
    <title>Vite Test</title>
</head>
<body>
    <div id="app"></div>
</body>
</html>`,
        'src/main.js': `import './app.js'`,
        'src/app.js': `console.log('Vite app loaded');
document.getElementById('app').innerHTML = '<h1>Vite App</h1>';`
      }
    },
    'next-app': {
      name: 'test-next-app',
      files: {
        'package.json': JSON.stringify({
          "name": "test-next-app",
          "version": "1.0.0",
          "scripts": { "dev": "next dev" }
        }, null, 2),
        'next.config.js': 'module.exports = {}',
        'app/layout.tsx': `import './globals.css'
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )}`,
        'app/page.tsx': `export default function Home() {
  return <h1>Next.js App</h1>;
}`,
        'app/globals.css': 'body { font-family: Arial, sans-serif; }'
      }
    },
    'html-static': {
      name: 'test-html-project',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Static HTML</title>
</head>
<body>
    <h1>Static HTML Project</h1>
    <p>This is a static HTML project.</p>
</body>
</html>`
      }
    }
  };

  function createProject(projectName, files) {
    const projectPath = join(testDir, projectName);
    mkdirSync(projectPath, { recursive: true });

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = join(projectPath, filePath);
      const dir = dirname(fullPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, content);
    }

    return projectPath;
  }

  function cleanupProject(projectPath) {
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true });
    }
  }

  function runCliInProject(projectPath, args, options = {}) {
    try {
      const result = execSync(`node ${cliPath} ${args}`, {
        encoding: 'utf8',
        cwd: projectPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout || 10000
      });
      return { success: true, output: result };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || error.message,
        code: error.status,
        signal: error.signal
      };
    }
  }

  test.before(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  test.after(() => {
    // 清理所有测试项目
    Object.keys(testProjects).forEach(projectName => {
      const projectPath = join(testDir, testProjects[projectName].name);
      cleanupProject(projectPath);
    });
  });

  describe('Vite 项目完整流程', () => {
    test('应该完成 Vite 项目的完整注入流程', () => {
      const projectPath = createProject(testProjects.vite.name, testProjects.vite.files);

      try {
        // 1. 检测项目类型
        const detectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework --dry-run --verbose');
        assert.strictEqual(detectResult.success, true);
        assert.match(detectResult.output, /检测到项目类型: vite/);

        // 2. 执行实际注入
        const injectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework');
        assert.strictEqual(injectResult.success, true);
        assert.match(injectResult.output, /框架注入成功/);

        // 3. 验证配置文件被修改
        const viteConfigPath = join(projectPath, 'vite.config.js');
        assert(existsSync(viteConfigPath));
        const configContent = readFileSync(viteConfigPath, 'utf8');
        assert.match(configContent, /dev-inject-plugin/);
        assert.match(configContent, /scripts\/monitor\.js/);

        // 4. 验证原始配置保留
        assert.match(configContent, /defineConfig/);

        // 5. 执行卸载
        const uninstallResult = runCliInProject(projectPath, 'uninstall --framework');
        assert.strictEqual(uninstallResult.success, true);

        // 6. 验证插件被移除
        const cleanedContent = readFileSync(viteConfigPath, 'utf8');
        assert(!cleanedContent.includes('dev-inject-plugin'));

      } finally {
        cleanupProject(projectPath);
      }
    });

    test('应该处理不同的脚本类型', () => {
      const projectPath = createProject(testProjects.vite.name, testProjects.vite.files);

      try {
        // 测试 HTTP URL
        const httpResult = runCliInProject(projectPath, 'install --remote=https://cdn.example.com/monitor.js --framework --dry-run');
        assert.strictEqual(httpResult.success, true);
        assert.match(httpResult.output, /检测到项目类型: vite/);

        // 测试本地路径
        const localResult = runCliInProject(projectPath, 'install --remote=/assets/dev-monitor.js --framework --dry-run');
        assert.strictEqual(localResult.success, true);
        assert.match(localResult.output, /检测到项目类型: vite/);

      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('Next.js 项目完整流程', () => {
    test('应该完成 Next.js App Router 的完整注入流程', () => {
      const projectPath = createProject(testProjects['next-app'].name, testProjects['next-app'].files);

      try {
        // 1. 检测项目类型
        const detectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework --dry-run --verbose');
        assert.strictEqual(detectResult.success, true);
        assert.match(detectResult.output, /检测到项目类型: next-app/);

        // 2. 执行实际注入
        const injectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework');
        assert.strictEqual(injectResult.success, true);
        assert.match(injectResult.output, /框架注入成功/);

        // 3. 验证 layout 文件被修改
        const layoutPath = join(projectPath, 'app/layout.tsx');
        assert(existsSync(layoutPath));
        const layoutContent = readFileSync(layoutPath, 'utf8');
        assert.match(layoutContent, /process\.env\.NODE_ENV === 'development'/);
        assert.match(layoutContent, /scripts\/monitor\.js/);

        // 4. 验证原始内容保留
        assert.match(layoutContent, /RootLayout/);
        assert.match(layoutContent, /children/);

        // 5. 执行卸载
        const uninstallResult = runCliInProject(projectPath, 'uninstall --framework');
        assert.strictEqual(uninstallResult.success, true);

        // 6. 验证注入内容被移除
        const cleanedContent = readFileSync(layoutPath, 'utf8');
        assert(!cleanedContent.includes('process.env.NODE_ENV'));
        assert(!cleanedContent.includes('scripts/monitor.js'));

      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('静态 HTML 项目完整流程', () => {
    test('应该完成静态 HTML 项目的完整注入流程', () => {
      const projectPath = createProject(testProjects['html-static'].name, testProjects['html-static'].files);

      try {
        // 1. 检测项目类型
        const detectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework --dry-run --verbose');
        assert.strictEqual(detectResult.success, true);
        assert.match(detectResult.output, /检测到项目类型: html-static/);

        // 2. 执行实际注入
        const injectResult = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework');
        assert.strictEqual(injectResult.success, true);
        assert.match(injectResult.output, /成功处理 \d+ 个文件/);

        // 3. 验证 HTML 文件被修改
        const htmlPath = join(projectPath, 'index.html');
        assert(existsSync(htmlPath));
        const htmlContent = readFileSync(htmlPath, 'utf8');
        assert.match(htmlContent, /<script src="\/scripts\/monitor\.js"><\/script>/);
        assert.match(htmlContent, /<!-- injected by dev-inject -->/);

        // 4. 验证原始内容保留
        assert.match(htmlContent, /Static HTML Project/);

        // 5. 执行卸载
        const uninstallResult = runCliInProject(projectPath, 'uninstall');
        assert.strictEqual(uninstallResult.success, true);
        assert.match(uninstallResult.output, /成功清理 \d+ 个文件/);

        // 6. 验证脚本被移除
        const cleanedContent = readFileSync(htmlPath, 'utf8');
        assert(!cleanedContent.includes('scripts/monitor.js'));
        assert(!cleanedContent.includes('injected by dev-inject'));

      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('回退机制测试', () => {
    test('应该在不支持的项目中回退到传统模式', () => {
      // 创建一个不支持的空项目
      const projectPath = join(testDir, 'unsupported-project');
      mkdirSync(projectPath, { recursive: true });

      try {
        const result = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework --dry-run');

        // 应该回退到传统模式并找到 HTML 文件
        assert.strictEqual(result.success, true);
        assert.match(result.output, /回退到传统 HTML 注入模式/);
      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('并发测试', () => {
    test('应该处理多个并发命令', async () => {
      const projectPath = createProject(testProjects.vite.name, testProjects.vite.files);

      try {
        // 创建多个并发命令
        const commands = [
          runCliInProject(projectPath, 'install --remote=/scripts/monitor1.js --framework --dry-run'),
          runCliInProject(projectPath, 'install --remote=/scripts/monitor2.js --framework --dry-run'),
          runCliInProject(projectPath, 'install --remote=/scripts/monitor3.js --framework --dry-run')
        ];

        // 等待所有命令完成
        const results = await Promise.all(commands);

        // 所有命令都应该成功
        results.forEach(result => {
          assert.strictEqual(result.success, true);
        });

      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内完成大型项目操作', () => {
      // 创建一个大项目（很多文件）
      const projectPath = join(testDir, 'large-project');
      mkdirSync(projectPath, { recursive: true });

      // 创建大量 HTML 文件
      for (let i = 0; i < 100; i++) {
        writeFileSync(join(projectPath, `file${i}.html`), `<html><head><title>File ${i}</title></head><body></body></html>`);
      }

      // 创建 Vite 配置
      writeFileSync(join(projectPath, 'vite.config.js'), 'module.exports = { plugins: [] }');

      try {
        const startTime = Date.now();
        const result = runCliInProject(projectPath, 'install --remote=/scripts/monitor.js --framework --dry-run', {
          timeout: 30000 // 30秒超时
        });
        const endTime = Date.now();

        assert.strictEqual(result.success, true);
        assert(endTime - startTime < 10000, '大项目操作应该在 10 秒内完成');

      } finally {
        cleanupProject(projectPath);
      }
    });
  });

  describe('真实场景模拟', () => {
    test('应该模拟真实的开发工作流', () => {
      const projectPath = createProject(testProjects.vite.name, testProjects.vite.files);

      try {
        // 1. 初始注入
        const initialInject = runCliInProject(projectPath, 'install --remote=/scripts/dev-monitor.js --framework');
        assert.strictEqual(initialInject.success, true);

        // 2. 重新注入（应该检测到已存在）
        const reInject = runCliInProject(projectPath, 'install --remote=/scripts/dev-monitor.js --framework --dry-run');
        assert.strictEqual(reInject.success, true);

        // 3. 更换脚本
        const switchScript = runCliInProject(projectPath, 'install --remote=/scripts/new-monitor.js --framework --dry-run');
        assert.strictEqual(switchScript.success, true);

        // 4. 卸载
        const uninstall = runCliInProject(projectPath, 'uninstall --framework');
        assert.strictEqual(uninstall.success, true);

        // 5. 清理后重新注入
        const cleanReinject = runCliInProject(projectPath, 'install --remote=/scripts/dev-monitor.js --framework --dry-run');
        assert.strictEqual(cleanReinject.success, true);

      } finally {
        cleanupProject(projectPath);
      }
    });
  });
});
