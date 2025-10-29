import { test, describe } from 'node:test';
import assert from 'node:assert';

// 导入要测试的模块
import { parseArgs } from '../../lib/args.js';

describe('CLI 参数解析', () => {
  describe('基本命令解析', () => {
    test('应该解析 install 命令', () => {
      const result = parseArgs(['install', '--remote', '/scripts/test.js']);
      assert.strictEqual(result.command, 'install');
      assert.strictEqual(result.options.remote, '/scripts/test.js');
    });

    test('应该解析 uninstall 命令', () => {
      const result = parseArgs(['uninstall']);
      assert.strictEqual(result.command, 'uninstall');
    });

    test('应该处理空参数', () => {
      const result = parseArgs([]);
      assert.strictEqual(result.command, null);
      assert.deepStrictEqual(result.options, {});
    });
  });

  describe('--remote 参数解析', () => {
    test('应该解析 --remote=value 格式', () => {
      const result = parseArgs(['install', '--remote=http://localhost:9000/monitor.js']);
      assert.strictEqual(result.options.remote, 'http://localhost:9000/monitor.js');
    });

    test('应该解析 --remote value 格式', () => {
      const result = parseArgs(['install', '--remote', '/scripts/dev-monitor.js']);
      assert.strictEqual(result.options.remote, '/scripts/dev-monitor.js');
    });

    test('应该处理多个 --remote 参数（使用最后一个）', () => {
      const result = parseArgs(['install', '--remote', '/first.js', '--remote', '/second.js']);
      assert.strictEqual(result.options.remote, '/second.js');
    });
  });

  describe('--file 参数解析', () => {
    test('应该解析 --file=value 格式', () => {
      const result = parseArgs(['install', '--remote=/test.js', '--file=public/index.html']);
      assert.strictEqual(result.options.file, 'public/index.html');
    });

    test('应该解析 --file value 格式', () => {
      const result = parseArgs(['install', '--remote=/test.js', '--file', './public/index.html']);
      assert.strictEqual(result.options.file, './public/index.html');
    });
  });

  describe('--framework 参数解析', () => {
    test('应该解析 --framework 选项', () => {
      const result = parseArgs(['install', '--remote=/test.js', '--framework']);
      assert.strictEqual(result.options.framework, true);
    });

    test('应该解析 -f 简写选项', () => {
      const result = parseArgs(['install', '--remote=/test.js', '-f']);
      assert.strictEqual(result.options.framework, true);
    });
  });

  describe('--dry-run 参数解析', () => {
    test('应该解析 --dry-run 选项', () => {
      const result = parseArgs(['install', '--remote=/test.js', '--dry-run']);
      assert.strictEqual(result.options.dryRun, true);
    });
  });

  describe('--verbose 参数解析', () => {
    test('应该解析 --verbose 选项', () => {
      const result = parseArgs(['install', '--remote=/test.js', '--verbose']);
      assert.strictEqual(result.options.verbose, true);
    });
  });

  describe('复合选项解析', () => {
    test('应该解析多个选项', () => {
      const result = parseArgs([
        'install',
        '--remote', 'http://localhost:9000/monitor.js',
        '--framework',
        '--dry-run',
        '--verbose',
        '--file', './test.html'
      ]);

      assert.strictEqual(result.command, 'install');
      assert.strictEqual(result.options.remote, 'http://localhost:9000/monitor.js');
      assert.strictEqual(result.options.framework, true);
      assert.strictEqual(result.options.dryRun, true);
      assert.strictEqual(result.options.verbose, true);
      assert.strictEqual(result.options.file, './test.html');
    });
  });

  describe('错误处理', () => {
    test('install 命令缺少 --remote 参数应该抛出错误', () => {
      assert.throws(() => {
        parseArgs(['install']);
      }, /install 命令需要 --remote 参数/);
    });

    test('uninstall 命令不需要 --remote 参数', () => {
      const result = parseArgs(['uninstall']);
      assert.strictEqual(result.command, 'uninstall');
      assert.deepStrictEqual(result.options, {});
    });
  });

  describe('无效参数处理', () => {
    test('应该忽略未知参数', () => {
      // 使用 mock console.warn 来捕获警告
      const originalWarn = console.warn;
      let warnCalled = false;
      console.warn = () => { warnCalled = true; };

      const result = parseArgs(['install', '--remote=/test.js', '--unknown-option']);

      console.warn = originalWarn;

      // 应该仍然正确解析已知参数
      assert.strictEqual(result.options.remote, '/test.js');
      // 应该标记未知参数被忽略（通过 console.warn）
      assert.ok(warnCalled); // 如果有警告输出则测试通过
    });
  });

  describe('参数顺序无关性', () => {
    test('应该正确处理不同顺序的参数', () => {
      const result1 = parseArgs(['install', '--remote=/test.js', '--framework', '--dry-run']);
      const result2 = parseArgs(['install', '--dry-run', '--framework', '--remote=/test.js']);

      assert.deepStrictEqual(result1.options, result2.options);
    });
  });

  describe('边界情况', () => {
    test('应该处理空的 --remote 值', () => {
      const result = parseArgs(['install', '--remote', '']);
      assert.strictEqual(result.options.remote, '');
    });

    test('应该处理包含特殊字符的路径', () => {
      const complexPath = '/path with spaces/file.js';
      const result = parseArgs(['install', '--remote', complexPath]);
      assert.strictEqual(result.options.remote, complexPath);
    });

    test('应该处理长参数值', () => {
      const longValue = 'a'.repeat(1000);
      const result = parseArgs(['install', '--remote', longValue]);
      assert.strictEqual(result.options.remote, longValue);
    });
  });
});
