import {
  lookupFiles,
  readFile,
  writeFile,
  parseRemoteType,
  generateScriptTag,
  injectScriptToHtml,
  removeInjectedScripts,
  log,
  logInfo,
  logSuccess,
  logError,
} from './utils.js';
import {
  detectProjectType,
  smartInject as smartInjectFramework,
} from './framework-inject.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * 获取当前包版本号
 */
function getVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * 安装脚本 - 支持框架感知
 */
export async function installScript(options = {}) {
  const {
    remote,
    file,
    dryRun = false,
    verbose = false,
    framework = false,
  } = options;

  const version = getVersion();
  logInfo(`开始执行脚本注入... (v${version})`);

  // 检测是否使用框架注入模式
  if (framework) {
    logInfo('使用框架感知注入模式...');

    // 检测项目类型
    const projectType = detectProjectType();
    logInfo(`检测到项目类型: ${projectType}`, verbose);

    // 对于现代框架，使用智能注入
    if (
      ['vite', 'next-app', 'next-pages', 'next-hybrid'].includes(projectType)
    ) {
      try {
        const success = smartInjectFramework({ remote, dryRun, verbose });
        if (success) {
          logSuccess(`框架注入成功`);
          logInfo(`项目类型: ${projectType}`);
          logInfo(`脚本地址: ${remote}`);

          // 给出重启提示
          if (projectType === 'vite') {
            logInfo('💡 请重启 Vite 开发服务器以应用更改');
          } else if (projectType.startsWith('next')) {
            logInfo('💡 请重启 Next.js 开发服务器以应用更改');
          }
        }
        return success;
      } catch (error) {
        logError(`框架注入失败: ${error.message}`);
        logInfo('回退到传统 HTML 注入模式...');
      }
    }
  }

  // 传统 HTML 注入模式（兜底方案）
  logInfo('使用传统 HTML 注入模式...');

  // 查找 HTML 文件
  const targetFiles = file ? [file] : lookupFiles();

  if (targetFiles.length === 0) {
    throw new Error('未找到 HTML 文件');
  }

  log(`找到 ${targetFiles.length} 个 HTML 文件:`, verbose);
  targetFiles.forEach(f => log(`  - ${f}`, verbose));

  // 解析远程脚本类型和生成脚本标签
  const remoteType = parseRemoteType(remote);
  const scriptTag = generateScriptTag(remote, remoteType);

  log(`脚本类型: ${remoteType}`, verbose);
  log(`脚本标签: ${scriptTag}`, verbose);

  // 处理每个 HTML 文件
  let successCount = 0;

  for (const htmlFile of targetFiles) {
    try {
      // 读取 HTML 内容
      let htmlContent = readFile(htmlFile);
      const originalContent = htmlContent;

      // 移除之前注入的脚本（避免重复）
      htmlContent = removeInjectedScripts(htmlContent);

      // 注入新脚本
      const newContent = injectScriptToHtml(htmlContent, scriptTag);

      // 检查是否有变化
      if (newContent === originalContent) {
        log(`文件 ${htmlFile} 无需更新`, verbose);
        successCount++;
        continue;
      }

      // 写入文件
      if (!dryRun) {
        writeFile(htmlFile, newContent);
        logSuccess(`已注入脚本到 ${htmlFile}`);
      } else {
        logInfo(`[DRY RUN] 将注入脚本到 ${htmlFile}`);
      }

      successCount++;
    } catch (error) {
      logError(`处理文件 ${htmlFile} 失败: ${error.message}`);
    }
  }

  if (successCount > 0) {
    logSuccess(`成功处理 ${successCount} 个文件`);
    logInfo(`脚本地址: ${remote}`);

    if (remoteType === 'absolute-path') {
      logInfo('提示：请确保静态文件服务器可以访问该路径');
    }
  } else {
    logError('没有成功处理任何文件');
  }
}

/**
 * 卸载脚本从 HTML 文件
 */
export async function uninstallScript(options = {}) {
  const { file, dryRun = false, verbose = false, framework } = options;

  // 如果指定了 framework 标志，使用框架感知卸载
  if (framework) {
    const { smartUninstall } = await import('./framework-inject.js');
    return smartUninstall(options);
  }

  logInfo('开始移除注入的脚本...');

  // 查找 HTML 文件
  const targetFiles = file ? [file] : lookupFiles();

  if (targetFiles.length === 0) {
    logInfo('未找到 HTML 文件');
    return;
  }

  log(`找到 ${targetFiles.length} 个 HTML 文件:`, verbose);
  targetFiles.forEach(f => log(`  - ${f}`, verbose));

  // 处理每个 HTML 文件
  let successCount = 0;

  for (const htmlFile of targetFiles) {
    try {
      // 读取 HTML 内容
      let htmlContent = readFile(htmlFile);
      const originalContent = htmlContent;

      // 移除注入的脚本
      const newContent = removeInjectedScripts(htmlContent);

      // 检查是否有变化
      if (newContent === originalContent) {
        log(`文件 ${htmlFile} 无需清理`, verbose);
        successCount++;
        continue;
      }

      // 写入文件
      if (!dryRun) {
        writeFile(htmlFile, newContent);
        logSuccess(`已从 ${htmlFile} 移除注入的脚本`);
      } else {
        logInfo(`[DRY RUN] 将从 ${htmlFile} 移除注入的脚本`);
      }

      successCount++;
    } catch (error) {
      logError(`处理文件 ${htmlFile} 失败: ${error.message}`);
    }
  }

  if (successCount > 0) {
    logSuccess(`成功清理 ${successCount} 个文件`);
  } else {
    logInfo('没有找到需要清理的注入脚本');
  }
}
