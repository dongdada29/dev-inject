
export function parseArgs(args) {
  const result = {
    command: null,
    options: {},
  };

  // 解析命令
  if (args[0] === 'install' || args[0] === 'uninstall') {
    result.command = args[0];
    args = args.slice(1);
  } else if (args.length === 0) {
    return result;
  }

  // 解析选项
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--remote=')) {
      result.options.remote = arg.split('=')[1];
    } else if (arg === '--remote' && i + 1 < args.length) {
      result.options.remote = args[i + 1];
      i++; // 跳过下一个参数
    } else if (arg.startsWith('--file=')) {
      result.options.file = arg.split('=')[1];
    } else if (arg === '--file' && i + 1 < args.length) {
      result.options.file = args[i + 1];
      i++; // 跳过下一个参数
    } else if (arg === '--dry-run') {
      result.options.dryRun = true;
    } else if (arg === '--verbose') {
      result.options.verbose = true;
    } else if (arg === '--framework' || arg === '-f') {
      result.options.framework = true;
    } else if (!arg.startsWith('--')) {
      // 未知参数，可能是错误输入
      console.warn(`⚠️  忽略未知参数: ${arg}`);
    }
  }

  // 验证 install 命令的必需参数
  if (result.command === 'install' && !result.options.remote) {
    throw new Error('install 命令需要 --remote 参数');
  }

  return result;
}
