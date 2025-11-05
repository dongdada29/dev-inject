import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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
        const stat = statSync(fullPath);

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
  // 所有类型都添加时间戳参数避免缓存
  const separator = remote.includes('?') ? '&' : '?';
  const timestamp = Date.now();

  if (type === 'url') {
    return `<script src="${remote}${separator}t=${timestamp}"></script>`;
  } else if (type === 'absolute-path') {
    return `<script src="${remote}${separator}t=${timestamp}"></script>`;
  } else {
    throw new Error(`未知的远程类型: ${type}`);
  }
}

/**
 * 从 HTML 内容中移除注入的脚本 - 同时清理前后的空白行
 */
export function removeInjectedScripts(htmlContent, identifier = 'dev-inject') {
  // 使用标准的开始/结束标识移除注入的代码
  // 匹配包括前后换行符和空白在内的完整块
  // 使用非贪婪匹配确保只匹配一个注入块
  const injectBlockRegex = /(\r?\n)?\s*<!-- DEV-INJECT-START -->[\s\S]*?<!-- DEV-INJECT-END -->\s*(\r?\n)?/g;

  let cleaned = htmlContent.replace(injectBlockRegex, (match, beforeNewline, afterNewline) => {
    // 如果匹配块前后都有换行符，只保留一个换行符
    if (beforeNewline && afterNewline) {
      return '\n';
    }
    // 如果只有前面的换行符，保留它
    if (beforeNewline) {
      return beforeNewline;
    }
    // 如果只有后面的换行符，保留它
    if (afterNewline) {
      return afterNewline;
    }
    // 如果都没有，返回空字符串
    return '';
  });

  // 清理移除后可能产生的多余空白行
  // 清理 <head> 标签后的多余空白行（保留一个换行）
  cleaned = cleaned.replace(/(<head[^>]*>)\s*\n\s*\n+(\s*)/g, '$1\n$2');
  // 清理 </head> 前的多余空白行（保留一个换行）
  cleaned = cleaned.replace(/(\s*)\n\s*\n+(\s*<\/head>)/g, '$1\n$2');
  // 清理连续的多个空白行（保留最多一个空行）
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  // 清理空行（只包含空白字符的行）
  cleaned = cleaned.replace(/^\s+$/gm, '');

  return cleaned;
}

/**
 * 向 HTML 中注入脚本 - 使用动态时间戳防止缓存
 */
export function injectScriptToHtml(
  htmlContent,
  scriptTag,
  identifier = 'dev-inject',
  remote = null
) {
  // 先清除之前的注入
  htmlContent = removeInjectedScripts(htmlContent, identifier);

  // 生成脚本内容 - 优先使用动态时间戳方式
  // 注意：脚本内容前后不包含额外的换行符，由插入逻辑统一处理
  let scriptContent;
  if (remote) {
    // 使用动态脚本加载器（推荐方式，防止缓存）
    const safeRemote = JSON.stringify(remote);
    const scriptId = `${identifier}-monitor`;
    scriptContent = `<!-- DEV-INJECT-START -->
  <script data-id="${scriptId}">
    (function() {
      const remote = ${safeRemote};
      const separator = remote.includes('?') ? '&' : '?';
      const script = document.createElement('script');
      script.src = remote + separator + 't=' + Date.now();
      script.dataset.id = '${scriptId}-script';
      script.defer = true;
      // 防止重复注入
      if (!document.querySelector('[data-id="${scriptId}-script"]')) {
        document.head.appendChild(script);
      }
    })();
  </script>
<!-- DEV-INJECT-END -->`;
  } else {
    // 向后兼容：从 scriptTag 中提取 URL 并添加时间戳
    const scriptSrc = scriptTag.match(/src="([^"]*)"/)?.[1] || '';
    if (scriptSrc) {
      // 提取基础 URL（移除可能已存在的时间戳参数）
      const baseUrl = scriptSrc.split('?')[0];
      const separator = scriptSrc.includes('?') ? '&' : '?';
      scriptContent = `<!-- DEV-INJECT-START -->
  <script>
    (function() {
      const remote = ${JSON.stringify(baseUrl)};
      const separator = remote.includes('?') ? '&' : '?';
      const script = document.createElement('script');
      script.src = remote + separator + 't=' + Date.now();
      script.defer = true;
      // 防止重复注入
      if (!document.querySelector('script[src*="' + remote.split('/').pop() + '"]')) {
        document.head.appendChild(script);
      }
    })();
  </script>
<!-- DEV-INJECT-END -->`;
    } else {
      // 如果无法提取 URL，使用旧的静态方式
      scriptContent = `<!-- DEV-INJECT-START -->
  ${scriptTag}
<!-- DEV-INJECT-END -->`;
    }
  }

  // 查找 </head> 标签
  const headEndIndex = htmlContent.lastIndexOf('</head>');

  if (headEndIndex !== -1) {
    // 在 </head> 之前注入
    const beforeHead = htmlContent.substring(0, headEndIndex);
    const afterHead = htmlContent.substring(headEndIndex);

    // 检查 </head> 前是否有非空白内容
    const beforeHeadTrimmed = beforeHead.trimEnd();
    const needsNewlineBefore = beforeHeadTrimmed.length > 0 && !beforeHeadTrimmed.endsWith('\n');

    // 构建注入内容，统一格式
    let result;
    if (needsNewlineBefore) {
      // 如果前面有内容，添加换行符后插入脚本
      result = `${beforeHeadTrimmed}\n${scriptContent}\n${afterHead}`;
    } else {
      // 如果前面是空白或换行，直接插入（脚本内容已有标识注释）
      // 确保脚本前后有适当的换行
      const trimmedBefore = beforeHead.trimEnd();
      if (trimmedBefore.length === 0) {
        // 如果前面完全是空白，直接插入
        result = `${beforeHead}${scriptContent}\n${afterHead}`;
      } else {
        // 前面有内容但末尾是换行，直接插入
        result = `${beforeHead}${scriptContent}\n${afterHead}`;
      }
    }

    // 清理可能的多余空白行（保留最多一个空行）
    // 清理 <head> 标签后的多余空白行
    result = result.replace(/(<head[^>]*>)\s*\n\s*\n+(\s*)/g, '$1\n$2');
    // 清理 </head> 前的多余空白行
    result = result.replace(/(\s*)\n\s*\n+(\s*<\/head>)/g, '$1\n$2');
    // 清理连续的多个空白行
    result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');

    return result;
  } else {
    // 如果没有找到 </head>，查找 <body> 标签
    const bodyStartIndex = htmlContent.indexOf('<body');

    if (bodyStartIndex !== -1) {
      const bodyEndIndex = htmlContent.indexOf('>', bodyStartIndex) + 1;
      const beforeBody = htmlContent.substring(0, bodyEndIndex);
      const afterBody = htmlContent.substring(bodyEndIndex);
      return `${beforeBody}
${scriptContent}
${afterBody}`;
    } else {
      // 如果都没有找到，在文件末尾添加
      return `${htmlContent}
${scriptContent}`;
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
