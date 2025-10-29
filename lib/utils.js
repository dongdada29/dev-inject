import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

/**
 * 查找项目中的 HTML 文件
 */
export function lookupFiles(startDir = process.cwd()) {
  const htmlFiles = [];

  function searchDirectory(dir) {
    try {
      const files = readdirSync(dir);

      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = require('fs').statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过 node_modules 等目录
          if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
            searchDirectory(fullPath);
          }
        } else if (file.endsWith('.html')) {
          htmlFiles.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  searchDirectory(startDir);

  // 优先返回 index.html，否则返回第一个找到的 HTML 文件
  const indexHtml = htmlFiles.find(file => file.endsWith('index.html'));
  return indexHtml ? [indexHtml] : htmlFiles;
}

/**
 * 读取文件内容
 */
export function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`无法读取文件 ${filePath}: ${error.message}`);
  }
}

/**
 * 写入文件内容
 */
export function writeFile(filePath, content) {
  try {
    writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(`无法写入文件 ${filePath}: ${error.message}`);
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath) {
  return existsSync(filePath);
}

/**
 * 解析远程脚本类型
 */
export function parseRemoteType(remote) {
  if (remote.startsWith('http://') || remote.startsWith('https://')) {
    return 'url';
  } else if (remote.startsWith('/')) {
    return 'absolute-path';
  } else {
    throw new Error(
      `不支持的远程路径格式: ${remote}。请使用完整 URL (http://...) 或绝对路径 (/path/to/script.js)`
    );
  }
}

/**
 * 生成脚本标签
 */
export function generateScriptTag(remote, type) {
  if (type === 'url') {
    // 为 URL 类型添加时间戳参数避免缓存
    const separator = remote.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    return `<script src="${remote}${separator}t=${timestamp}"></script>`;
  } else if (type === 'absolute-path') {
    return `<script src="${remote}"></script>`;
  } else {
    throw new Error(`未知的远程类型: ${type}`);
  }
}

/**
 * 从 HTML 内容中移除注入的脚本
 */
export function removeInjectedScripts(htmlContent, identifier = 'dev-inject') {
  // 匹配由 dev-inject 注入的脚本标签
  const scriptRegex = new RegExp(
    `\\s*<script\\s+[^>]*src=["'][^"']*["'][^>]*>\\s*</script>\\s*<!--\\s*injected\\s+by\\s+${identifier}\\s*-->\\s*`,
    'g'
  );

  return htmlContent.replace(scriptRegex, '');
}

/**
 * 向 HTML 中注入脚本
 */
export function injectScriptToHtml(
  htmlContent,
  scriptTag,
  identifier = 'dev-inject'
) {
  // 查找 </head> 标签
  const headEndIndex = htmlContent.lastIndexOf('</head>');

  if (headEndIndex !== -1) {
    // 在 </head> 之前注入
    const beforeHead = htmlContent.substring(0, headEndIndex);
    const afterHead = htmlContent.substring(headEndIndex);

    return `${beforeHead}
  ${scriptTag} <!-- injected by ${identifier} -->
${afterHead}`;
  } else {
    // 如果没有找到 </head>，查找 <body> 标签
    const bodyStartIndex = htmlContent.indexOf('<body');

    if (bodyStartIndex !== -1) {
      const bodyEndIndex = htmlContent.indexOf('>', bodyStartIndex) + 1;
      const beforeBody = htmlContent.substring(0, bodyEndIndex);
      const afterBody = htmlContent.substring(bodyEndIndex);

      return `${beforeBody}
  ${scriptTag} <!-- injected by ${identifier} -->
${afterBody}`;
    } else {
      // 如果都没有找到，在文件末尾添加
      return `${htmlContent}
  ${scriptTag} <!-- injected by ${identifier} -->`;
    }
  }
}

/**
 * 日志输出函数
 */
export function log(message, verbose = false) {
  if (verbose) {
    console.log(`[dev-inject] ${message}`);
  }
}

export function logError(message) {
  console.error(`❌ [dev-inject] ${message}`);
}

export function logSuccess(message) {
  console.log(`✅ [dev-inject] ${message}`);
}

export function logInfo(message) {
  console.log(`ℹ️  [dev-inject] ${message}`);
}
