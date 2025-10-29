import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入要测试的模块
import { detectProjectType } from '../../lib/framework-inject.js';

describe('框架检测功能', () => {
  const testDir = join(__dirname, 'fixtures');

  // 测试前设置
  test.before(() => {
    // 确保测试目录存在
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  // 测试后清理
  test.after(() => {
    // 清理测试文件
    const filesToClean = [
      'vite.config.js',
      'vite.config.ts',
      'next.config.js',
      'app/layout.tsx',
      'pages/_document.tsx',
      'public/index.html',
      'index.html'
    ];

    filesToClean.forEach(file => {
      const filePath = join(testDir, file);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
    });
  });

  describe('Vite 项目检测', () => {
    test('应该检测到 Vite 项目 (js)', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = {};');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'vite');
    });

    test('应该检测到 Vite 项目 (ts)', () => {
      writeFileSync(join(testDir, 'vite.config.ts'), 'export default {};');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'vite');
    });

    test('优先检测 Vite 而不是其他配置', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = {};');
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      writeFileSync(join(testDir, 'public/index.html'), '<html></html>');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'vite');
    });
  });

  describe('Next.js App Router 检测', () => {
    test('应该检测到 Next.js App Router', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      mkdirSync(join(testDir, 'app'), { recursive: true });
      writeFileSync(join(testDir, 'app', 'layout.tsx'), 'export default function Layout() {}');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-app');
    });

    test('应该检测到 Next.js App Router (js)', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      mkdirSync(join(testDir, 'app'), { recursive: true });
      writeFileSync(join(testDir, 'app', 'layout.js'), 'export default function Layout() {}');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-app');
    });
  });

  describe('Next.js Pages Router 检测', () => {
    test('应该检测到 Next.js Pages Router', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      mkdirSync(join(testDir, 'pages'), { recursive: true });
      writeFileSync(join(testDir, 'pages', '_document.tsx'), 'export default function Document() {}');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-pages');
    });

    test('应该检测到 Next.js Pages Router (js)', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      mkdirSync(join(testDir, 'pages'), { recursive: true });
      writeFileSync(join(testDir, 'pages', '_document.js'), 'export default function Document() {}');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-pages');
    });
  });

  describe('Next.js 混合模式检测', () => {
    test('应该检测到 Next.js 混合模式', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      mkdirSync(join(testDir, 'app'), { recursive: true });
      mkdirSync(join(testDir, 'pages'), { recursive: true });
      writeFileSync(join(testDir, 'app', 'layout.tsx'), 'export default function Layout() {}');
      writeFileSync(join(testDir, 'pages', '_document.tsx'), 'export default function Document() {}');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-hybrid');
    });
  });

  describe('Create React App 检测', () => {
    test('应该检测到 Create React App', () => {
      mkdirSync(join(testDir, 'public'), { recursive: true });
      writeFileSync(join(testDir, 'public', 'index.html'), '<html></html>');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'create-react-app');
    });
  });

  describe('HTML 静态项目检测', () => {
    test('应该检测到 HTML 静态项目', () => {
      writeFileSync(join(testDir, 'index.html'), '<html></html>');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'html-static');
    });
  });

  describe('未知项目检测', () => {
    test('应该返回 unknown 对于空目录', () => {
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'unknown');
    });

    test('应该返回 unknown 对于不存在的目录', () => {
      const type = detectProjectType('/non-existent-directory');
      assert.strictEqual(type, 'unknown');
    });
  });

  describe('优先级检测', () => {
    test('Next.js 优先于 HTML', () => {
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      writeFileSync(join(testDir, 'index.html'), '<html></html>');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'next-app'); // 默认是 app 模式
    });

    test('Vite 优先于 Next.js', () => {
      writeFileSync(join(testDir, 'vite.config.js'), 'module.exports = {};');
      writeFileSync(join(testDir, 'next.config.js'), 'module.exports = {};');
      const type = detectProjectType(testDir);
      assert.strictEqual(type, 'vite');
    });
  });
});
