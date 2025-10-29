#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseArgs } from '../lib/args.js';
import { installScript } from '../lib/inject.js';
import { uninstallScript } from '../lib/inject.js';
import { showHelp, showVersion } from '../lib/help.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    const args = process.argv.slice(2);

    // 显示帮助信息
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }

    // 显示版本信息
    if (args.includes('--version') || args.includes('-v')) {
      showVersion();
      return;
    }

    const parsed = parseArgs(args);

    if (!parsed.command) {
      console.error('❌ 错误：请指定命令 (install 或 uninstall)');
      console.log('使用 --help 查看帮助信息');
      process.exit(1);
    }

    switch (parsed.command) {
      case 'install':
        await installScript(parsed.options);
        break;
      case 'uninstall':
        await uninstallScript(parsed.options);
        break;
      default:
        console.error(`❌ 未知命令: ${parsed.command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main();
