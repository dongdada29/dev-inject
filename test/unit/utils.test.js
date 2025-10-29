import { test, describe } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入要测试的模块
import {
  parseRemoteType,
  generateScriptTag,
  lookupFiles,
  injectScriptToHtml,
  removeInjectedScripts
} from '../../lib/utils.js';

describe('工具函数', () => {
  const testDir = join(__dirname, 'fixtures');

  test.before(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  test.after(() => {
    const filesToClean = [
      'test1.html',
      'test2.html',
      'subdir/test3.html',
      'subdir/test4.html'
    ];

    filesToClean.forEach(file => {
      const filePath = join(testDir, file);
      if (existsSync(filePath)) {
        rmSync(filePath);
      }
    });

    const subDir = join(testDir, 'subdir');
    if (existsSync(subDir)) {
      rmSync(subDir, { recursive: true });
    }
  });

  describe('parseRemoteType', () => {
    test('应该识别 HTTP URL', () => {
      assert.strictEqual(parseRemoteType('http://localhost:9000/monitor.js'), 'url');
      assert.strictEqual(parseRemoteType('http://example.com/script.js'), 'url');
    });

    test('应该识别 HTTPS URL', () => {
      assert.strictEqual(parseRemoteType('https://cdn.example.com/monitor.js'), 'url');
      assert.strictEqual(parseRemoteType('https://localhost:3000/dev-monitor.js'), 'url');
    });

    test('应该识别绝对路径', () => {
      assert.strictEqual(parseRemoteType('/scripts/monitor.js'), 'absolute-path');
      assert.strictEqual(parseRemoteType('/assets/dev-monitor.js'), 'absolute-path');
      assert.strictEqual(parseRemoteType('/path/to/script.js'), 'absolute-path');
    });

    test('应该处理相对路径', () => {
      try {
        parseRemoteType('./script.js');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.match(error.message, /不支持的远程路径格式/);
      }
    });

    test('应该处理空字符串', () => {
      try {
        parseRemoteType('');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.match(error.message, /不支持的远程路径格式/);
      }
    });
  });

  describe('generateScriptTag', () => {
    test('应该生成 URL 类型的脚本标签', () => {
      const tag = generateScriptTag('http://localhost:9000/monitor.js', 'url');
      assert.strictEqual(tag, '<script src="http://localhost:9000/monitor.js"></script>');
    });

    test('应该生成绝对路径类型的脚本标签', () => {
      const tag = generateScriptTag('/scripts/monitor.js', 'absolute-path');
      assert.strictEqual(tag, '<script src="/scripts/monitor.js"></script>');
    });

    test('应该处理不同的路径格式', () => {
      const testCases = [
        'https://cdn.example.com/monitor.js',
        'http://localhost:3000/dev-monitor.js',
        '/assets/scripts/dev-monitor.js',
        '/scripts/monitor.js'
      ];

      testCases.forEach(path => {
        const type = parseRemoteType(path);
        const tag = generateScriptTag(path, type);
        assert.match(tag, /^<script src="[^"]*"><\/script>$/);
        assert(tag.includes(path));
      });
    });
  });

  describe('lookupFiles', () => {
    test('应该查找指定目录中的 HTML 文件', () => {
      // 创建测试文件
      writeFileSync(join(testDir, 'test1.html'), '<html></html>');
      writeFileSync(join(testDir, 'test2.html'), '<html></html>');
      mkdirSync(join(testDir, 'subdir'), { recursive: true });
      writeFileSync(join(testDir, 'subdir', 'test3.html'), '<html></html>');

      const files = lookupFiles(testDir);

      // 应该找到所有 HTML 文件
      assert(files.length >= 3);
      assert(files.some(f => f.includes('test1.html')));
      assert(files.some(f => f.includes('test2.html')));
      assert(files.some(f => f.includes('test3.html')));
    });

    test('应该优先返回 index.html', () => {
      // 创建测试文件
      writeFileSync(join(testDir, 'test.html'), '<html></html>');
      writeFileSync(join(testDir, 'index.html'), '<html></html>');

      const files = lookupFiles(testDir);

      // 应该优先返回 index.html
      assert.strictEqual(files.length, 1);
      assert(files[0].includes('index.html'));
    });

    test('应该处理空目录', () => {
      const files = lookupFiles(testDir);
      assert.deepStrictEqual(files, []);
    });

    test('应该处理不存在的目录', () => {
      const files = lookupFiles('/non-existent-directory');
      assert.deepStrictEqual(files, []);
    });

    test('应该跳过 node_modules 目录', () => {
      // 创建测试文件和 node_modules 目录
      writeFileSync(join(testDir, 'test.html'), '<html></html>');
      mkdirSync(join(testDir, 'node_modules'), { recursive: true });
      writeFileSync(join(testDir, 'node_modules', 'index.html'), '<html></html>');

      const files = lookupFiles(testDir);

      // 不应该包含 node_modules 中的文件
      assert(files.length === 1);
      assert(files[0].includes('test.html'));
      assert(!files.some(f => f.includes('node_modules')));
    });
  });

  describe('injectScriptToHtml', () => {
    test('应该注入脚本到 HTML 的 </head> 标签之前', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`;

      const scriptTag = '<script src="/scripts/monitor.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert.match(result, /<script src="\/scripts\/monitor\.js"><\/script>\s*<\/head>/);
      assert.match(result, /dev-inject/);
    });

    test('应该添加 dev-inject 标识注释', () => {
      const html = `<html><head></head><body></body></html>`;
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert.match(result, /<!-- injected by dev-inject -->/);
    });

    test('应该处理没有 </head> 标签的情况', () => {
      const html = `<html><head><title>Test</title></head><body>content</body></html>`;
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert.match(result, /<script src="\/test\.js"><\/script>/);
    });

    test('应该处理没有 <head> 标签的情况', () => {
      const html = `<html><body>content</body></html>`;
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert.match(result, /<script src="\/test\.js"><\/script>/);
    });

    test('应该处理空 HTML', () => {
      const html = '';
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert.match(result, /<script src="\/test\.js"><\/script>/);
    });
  });

  describe('removeInjectedScripts', () => {
    test('应该移除注入的脚本和注释', () => {
      const htmlWithInjection = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test</title>
    <script src="/scripts/monitor.js"></script> <!-- injected by dev-inject -->
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>`;

      const result = removeInjectedScripts(htmlWithInjection);

      assert.match(result, /<head>\s*<meta charset="UTF-8">\s*<title>Test<\/title>\s*<\/head>/);
      assert(!result.includes('dev-monitor.js'));
      assert(!result.includes('injected by dev-inject'));
    });

    test('应该处理多个注入的脚本', () => {
      const htmlWithMultiple = `<html><head>
    <script src="/script1.js"></script> <!-- injected by dev-inject -->
    <title>Test</title>
    <script src="/script2.js"></script> <!-- injected by dev-inject -->
</head></html>`;

      const result = removeInjectedScripts(htmlWithMultiple);

      assert(!result.includes('script1.js'));
      assert(!result.includes('script2.js'));
      assert(!result.includes('injected by dev-inject'));
    });

    test('应该保留非注入的脚本', () => {
      const htmlWithMixed = `<html><head>
    <script src="/normal-script.js"></script>
    <script src="/injected-script.js"></script> <!-- injected by dev-inject -->
    <title>Test</title>
</head></html>`;

      const result = removeInjectedScripts(htmlWithMixed);

      assert(result.includes('normal-script.js'));
      assert(!result.includes('injected-script.js'));
      assert(!result.includes('injected by dev-inject'));
    });

    test('应该处理没有注入脚本的 HTML', () => {
      const normalHtml = `<html><head><title>Test</title></head><body>content</body></html>`;
      const result = removeInjectedScripts(normalHtml);

      assert.strictEqual(result, normalHtml);
    });
  });

  describe('边界情况和错误处理', () => {
    test('应该处理特殊字符', () => {
      const html = '<html><head><title>Test & "Special" Characters</title></head></html>';
      const scriptTag = '<script src="/path/with spaces/script.js"></script>';
      const result = injectScriptToHtml(html, scriptTag);

      assert(result.includes('script.js'));
    });

    test('应该处理非常长的 HTML', () => {
      const longHtml = '<html><head>' + '<meta charset="UTF-8">'.repeat(1000) + '</head></html>';
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(longHtml, scriptTag);

      assert(result.length > longHtml.length);
      assert(result.includes('test.js'));
    });

    test('应该处理格式不规范的 HTML', () => {
      const malformedHtml = '<html><HEAD><title>Test</Title></HEAD><BODY>content</BODY></HTML>';
      const scriptTag = '<script src="/test.js"></script>';
      const result = injectScriptToHtml(malformedHtml, scriptTag);

      assert(result.includes('test.js'));
    });
  });
});
