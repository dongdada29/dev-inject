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
  logError
} from './utils.js';

import fs from 'fs';
import path from 'path';

// 检测项目类型
export function detectProjectType(startDir = process.cwd()) {
  const indicators = {
    'vite': ['vite.config.js', 'vite.config.ts'],
    'next-pages': ['next.config.js', 'pages/'],
    'next-app': ['next.config.js', 'app/'],
    'create-react-app': ['public/index.html', 'src/'],
    'webpack': ['webpack.config.js'],
    'html-static': ['index.html', '.html']
  };

  try {
    // 按优先级顺序检测
    const priorityOrder = ['vite', 'next-app', 'next-pages', 'create-react-app', 'webpack', 'html-static'];

    for (const type of priorityOrder) {
      const files = indicators[type];
      for (const file of files) {
        if (fs.existsSync(path.join(startDir, file))) {
          // 特殊处理 Next.js
          if (type.startsWith('next-')) {
            const hasPages = fs.existsSync(path.join(startDir, 'pages'));
            const hasApp = fs.existsSync(path.join(startDir, 'app'));

            if (hasApp && hasPages) {
              return 'next-hybrid'; // 两个目录都存在
            } else if (hasApp) {
              return 'next-app';
            } else if (hasPages) {
              return 'next-pages';
            }
          }
          return type;
        }
      }
    }
  } catch (error) {
    logError(`项目类型检测失败: ${error.message}`);
  }

  return 'unknown';
}

// 查找框架特定的入口文件
export function findFrameworkEntry(projectType, startDir = process.cwd()) {

  switch (projectType) {
    case 'vite':
      return [
        'vite.config.js',
        'vite.config.ts'
      ];

    case 'next-pages':
      return [
        'pages/_document.tsx',
        'pages/_document.js',
        'pages/_app.tsx',
        'pages/_app.js'
      ];

    case 'next-app':
      return [
        'app/layout.tsx',
        'app/layout.js',
        'app/globals.css'
      ];

    case 'next-hybrid':
      return [
        'app/layout.tsx',
        'app/layout.js',
        'pages/_document.tsx',
        'pages/_document.js'
      ];

    case 'create-react-app':
      return [
        'public/index.html',
        'index.html'
      ];

    case 'html-static':
      return [
        'index.html',
        '*.html'
      ];

    default:
      return ['index.html', '*.html'];
  }
}

// 为 Vite 项目注入脚本插件
export function injectToViteConfig(filePath, remote, scriptTag) {
  try {
    let content = readFile(filePath);

    // 先移除之前的注入（如果存在）- 支持新旧两种格式
    // 移除新版标准标识
    content = content.replace(
      /\/\/ <!-- DEV-INJECT-START -->[\s\S]*?\/\/ <!-- DEV-INJECT-END -->/g,
      ''
    );
    // 移除旧版格式
    content = content.replace(
      /\/\/ dev-inject-plugin[\s\S]*?}\s*}\s*/g,
      ''
    );

    // 生成插件代码，传入原始 remote URL 而不是 scriptTag
    const pluginCode = generateVitePlugin(remote, scriptTag);

    // 查找 plugins 数组，并在其中插入插件
    const pluginsMatch = content.match(/(plugins:\s*\[)([\s\S]*?)(\])/);
    if (pluginsMatch) {
      const beforePlugins = pluginsMatch[1];
      const pluginsContent = pluginsMatch[2].trim();
      const afterPlugins = pluginsMatch[3];

      // 插入插件到 plugins 数组开头
      const newPlugins = beforePlugins + '\n    ' + pluginCode + ',\n    ' + pluginsContent + '\n  ' + afterPlugins;
      content = content.replace(pluginsMatch[0], newPlugins);
    } else {
      // 如果没有 plugins 数组，需要创建
      logError('未找到 plugins 配置，Vite 配置可能不标准');
      return false;
    }

    writeFile(filePath, content);
    logSuccess(`已向 ${filePath} 注入 Vite 插件`);
    return true;

  } catch (error) {
    logError(`Vite 插件注入失败: ${error.message}`);
    return false;
  }
}

// 生成 Vite 插件代码
function generateVitePlugin(remote, scriptTag) {
  // 确保脚本标签包含时间戳
  const separator = remote.includes('?') ? '&' : '?';
  const timestamp = Date.now();
  const scriptWithTimestamp = `<script src="${remote}${separator}t=${timestamp}"></script>`;

  return `// <!-- DEV-INJECT-START -->
    (function() {
      return {
        name: 'dev-inject',
        transformIndexHtml(html) {
          if (process.env.NODE_ENV === 'development') {
            return html.replace(
              '</head>',
              \`${scriptWithTimestamp}\\n</head>\`
            );
          }
          return html;
        }
      };
    })()
    // <!-- DEV-INJECT-END -->`;
}

// 为 Next.js 注入脚本到 _document
export function injectToNextDocument(filePath, scriptTag) {
  try {
    let content = readFile(filePath);

    // 检查是否是 _document.tsx/_document.js
    if (filePath.includes('_document')) {
      return injectToDocumentComponent(content, scriptTag, filePath);
    }

    // 如果是 _app.tsx/_app.js
    if (filePath.includes('_app')) {
      return injectToAppComponent(content, scriptTag, filePath);
    }

    throw new Error(`无法识别的 Next.js 文件类型: ${filePath}`);

  } catch (error) {
    logError(`Next.js 注入失败: ${error.message}`);
    return false;
  }
}

// 注入到 Next.js _document 组件
function injectToDocumentComponent(content, scriptTag, filePath) {
  const isTypeScript = filePath.endsWith('.tsx');

  // 先移除之前的注入
  content = removeNextDocumentInjection(content);

  // 查找 <Head> 组件
  const headRegex = /<Head[^>]*>([\s\S]*?)<\/Head>/;
  const headMatch = content.match(headRegex);

  if (headMatch) {
    // 在 <Head> 组件内注入 - 使用 DEV-INJECT-START/END 标识
    const beforeHead = headMatch[1];
    const newHead = beforeHead + '\n        {/* DEV-INJECT-START */}\n        {typeof window !== \'undefined\' && (\n          ' + scriptTag + '\n        )}\n        {/* DEV-INJECT-END */}';
    content = content.replace(headRegex, `<Head${headMatch[0].slice(5, -6)}${newHead}</Head>`);
  } else {
    // 如果没有 <Head> 组件，需要添加
    const importReactMatch = content.match(/import.*React.*from.*react/);
    if (importReactMatch) {
      const afterImport = content.indexOf(importReactMatch[0]) + importReactMatch[0].length;
      const headComponent = isTypeScript ? `
import Head from 'next/head';` : `
import Head from 'next/head';`;

      content = content.slice(0, afterImport) + headComponent + content.slice(afterImport);
    }

    // 在 Document 组件的 render 方法中添加 Head
    const renderMatch = content.match(/render\(\)\s*{[\s\S]*?return\s*\(/);
    if (renderMatch) {
      const insertPoint = content.indexOf(renderMatch[0]) + renderMatch[0].length;
      const headInsert = `
        <Head>
          {/* DEV-INJECT-START */}
          {typeof window !== 'undefined' && ${scriptTag.replace(/<script[^>]*>|<\/script>/g, '')}}
          {/* DEV-INJECT-END */}
        </Head>`;

      content = content.slice(0, insertPoint) + headInsert + content.slice(insertPoint);
    }
  }

  writeFile(filePath, content);
  return true;
}

// 注入到 Next.js _app 组件
function injectToAppComponent(content, scriptTag, filePath) {
  // 移除之前的注入
  content = removeNextAppInjection(content);

  // 在 _app 组件中注入，使用 useEffect
  const useEffectInsert = `
  {/* DEV-INJECT-START */}
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ${generateScriptLoader(scriptTag)}
    }
  }, []);
  {/* DEV-INJECT-END */}`;

  // 查找现有的 useEffect 或组件末尾
  const existingUseEffect = content.match(/useEffect\([^)]*\)\s*=>\s*{[\s\S]*?},\s*\[?\s*\]?\s*\);?/);

  if (existingUseEffect) {
    // 在现有 useEffect 中添加
    content = content.replace(
      existingUseEffect[0],
      existingUseEffect[0].replace('}, []);', '  \n' + useEffectInsert.replace(/useEffect\([^)]*\)\s*=>\s*{\n/, '').replace(/}, \[\];/, '') + '\n    }, [];')
    );
  } else {
    // 添加新的 useEffect
    const componentEndMatch = content.match(/export default.*|}\s*$/);
    if (componentEndMatch) {
      const insertPoint = content.lastIndexOf(componentEndMatch[0]);
      content = content.slice(0, insertPoint) + useEffectInsert + '\n\n' + content.slice(insertPoint);
    }
  }

  writeFile(filePath, content);
  return true;
}

// 为 Next.js App Router 注入
export function injectToNextAppLayout(filePath, scriptTag) {
  try {
    let content = readFile(filePath);

    // 移除之前的注入
    content = removeNextAppLayoutInjection(content);

    // 在 layout.tsx/js 中注入到 <head> 内
    const scriptLoader = generateScriptLoader(scriptTag, true);

    // 查找 <head> 标签
    const headRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
    const headMatch = content.match(headRegex);

    if (headMatch) {
      // 在 <head> 内注入
      const beforeHead = headMatch[1];
      const newHead = beforeHead + '\n      ' + scriptLoader;
      content = content.replace(headRegex, `<head${headMatch[0].slice(5, -6)}${newHead}</head>`);
    } else {
      // 如果没有 <head> 标签，在 <html> 标签后添加
      const htmlRegex = /<html[^>]*>/;
      const htmlMatch = content.match(htmlRegex);
      if (htmlMatch) {
        const insertPoint = content.indexOf(htmlMatch[0]) + htmlMatch[0].length;
        const headTag = '\n  <head>\n      ' + scriptLoader + '\n    </head>';
        content = content.slice(0, insertPoint) + headTag + content.slice(insertPoint);
      }
    }

    writeFile(filePath, content);
    return true;

  } catch (error) {
    logError(`Next.js App Router 注入失败: ${error.message}`);
    return false;
  }
}

// 生成脚本加载器 - 使用 DEV-INJECT 标识
function generateScriptLoader(scriptTag, isHead = false) {
  if (isHead) {
    // 对于 App Router layout，注入到 <head> 内
    return `{/* DEV-INJECT-START */}
        {process.env.NODE_ENV === 'development' && (
          ${scriptTag}
        )}
        {/* DEV-INJECT-END */}`;
  }
  // 旧版 useEffect 方式（保留向后兼容）
  return `useEffect(() => {
    if (typeof window !== 'undefined') {
      ${scriptTag.replace(/<script[^>]*>|<\/script>/g, '').trim()}
    }
  }, []);`;
}

// 移除 Next.js Document 注入
function removeNextDocumentInjection(content) {
  // 移除 DEV-INJECT-START 和 DEV-INJECT-END 之间的所有内容（包括中间的脚本）
  // 使用字符串匹配而不是正则
  const startMarker = '/* DEV-INJECT-START */';
  const endMarker = '/* DEV-INJECT-END */';

  let startIndex = content.indexOf(startMarker);
  while (startIndex !== -1) {
    // 找到结束标记的位置
    const endIndex = content.indexOf(endMarker, startIndex);

    if (endIndex !== -1) {
      // 找到这两行前后的换行符
      const startLineIndex = content.lastIndexOf('\n', startIndex - 1);
      const endLineEnd = content.indexOf('\n', endIndex + endMarker.length);

      if (startLineIndex !== -1 && endLineEnd !== -1) {
        // 移除整块内容
        content = content.slice(0, startLineIndex + 1) + content.slice(endLineEnd + 1);
      } else if (startIndex >= 0 && endIndex >= startIndex) {
        // 简单的字符串切片
        const endPos = endIndex + endMarker.length;
        const endLine = content.indexOf('\n', endPos);
        if (endLine !== -1) {
          content = content.slice(0, startIndex) + content.slice(endLine + 1);
        } else {
          content = content.slice(0, startIndex) + content.slice(endIndex + endMarker.length);
        }
      }
    }

    // 继续查找下一个
    startIndex = content.indexOf(startMarker);
  }

  // 清理多余的空白行
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return content;
}

// 移除 Next.js App 注入
function removeNextAppInjection(content) {
  // 移除 DEV-INJECT 相关的 useEffect（只保留新版标准标识）
  const patterns = [
    /\{\/\*\s*DEV-INJECT-START\s*\/\*\/[\s\S]*?\{\/\*\s*DEV-INJECT-END\s*\/\*\/\}/g,
    /useEffect\(\(\) => \{\s*if \(typeof window !== 'undefined'\) \{[\s\S]*?\}\s*\}, \[\]\);?/g
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content;
}

  // 移除 Next.js App Layout 注入
function removeNextAppLayoutInjection(content) {
  // 使用字符串匹配移除 DEV-INJECT-START/END 之间的内容
  const startMarker = '/* DEV-INJECT-START */';
  const endMarker = '/* DEV-INJECT-END */';

  let startIndex = content.indexOf(startMarker);
  while (startIndex !== -1) {
    const endIndex = content.indexOf(endMarker, startIndex);

    if (endIndex !== -1) {
      // 找到这两行前后的换行符
      const startLineIndex = content.lastIndexOf('\n', startIndex - 1);
      const endLineEnd = content.indexOf('\n', endIndex + endMarker.length);

      if (startLineIndex !== -1 && endLineEnd !== -1) {
        // 移除整块内容
        content = content.slice(0, startLineIndex + 1) + content.slice(endLineEnd + 1);
      } else {
        const endPos = endIndex + endMarker.length;
        const endLine = content.indexOf('\n', endPos);
        if (endLine !== -1) {
          content = content.slice(0, startIndex) + content.slice(endLine + 1);
        } else {
          content = content.slice(0, startIndex) + content.slice(endIndex + endMarker.length);
        }
      }
    }

    startIndex = content.indexOf(startMarker);
  }

  // 清理空的 head 标签
  content = content.replace(/<head>\s*<\/head>/g, '');

  // 清理多余的空白行
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return content;
}

// 移除 Vite 插件注入
function removeViteInjection(content) {
  // 移除新版标准标识的注入（优先）
  content = content.replace(
    /\/\/ <!-- DEV-INJECT-START -->[\s\S]*?\/\/ <!-- DEV-INJECT-END -->/g,
    ''
  );

  // 移除旧版格式的注入（向后兼容）
  content = content.replace(
    /\/\/ dev-inject-plugin[\s\S]*?}\s*}\s*/g,
    ''
  );

  // 清理多余的逗号和空白
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
  content = content.replace(/,\s*\[/g, ' [');

  return content;
}

// 智能卸载 - 智能移除不同框架的注入
export function smartUninstall(options = {}) {
  const { file, dryRun = false, verbose = false } = options;

  logInfo('开始移除注入的脚本...');

  // 检测项目类型
  const projectType = detectProjectType();
  logInfo(`检测到项目类型: ${projectType}`, verbose);

  // 查找入口文件
  const entryFiles = file ? [file] : findFrameworkEntry(projectType);

  if (entryFiles.length === 0) {
    logInfo('未找到需要处理的文件');
    return;
  }

  log(`找到 ${entryFiles.length} 个文件:`, verbose);
  entryFiles.forEach(f => log(`  - ${f}`, verbose));

  let successCount = 0;

  for (const entryFile of entryFiles) {
    try {
      if (projectType === 'next-pages' || projectType === 'next-hybrid') {
        if (entryFile.includes('_document')) {
          successCount += uninstallFromNextDocument(entryFile, dryRun, verbose);
        } else if (entryFile.includes('_app')) {
          successCount += uninstallFromNextApp(entryFile, dryRun, verbose);
        }
      } else if (projectType === 'next-app') {
        successCount += uninstallFromNextAppLayout(entryFile, dryRun, verbose);
      } else if (projectType === 'vite') {
        successCount += uninstallFromViteConfig(entryFile, dryRun, verbose);
      } else if (projectType === 'html-static' || projectType === 'create-react-app') {
        successCount += uninstallFromHTML(entryFile, dryRun, verbose);
      }
    } catch (error) {
      logError(`处理文件 ${entryFile} 失败: ${error.message}`);
    }
  }

  if (successCount > 0) {
    logSuccess(`成功清理 ${successCount} 个文件`);
  } else {
    logInfo('没有找到需要清理的注入脚本');
  }
}

// 从 HTML 文件卸载
function uninstallFromHTML(filePath, dryRun, verbose) {
  const content = readFile(filePath);
  const originalContent = content;
  const newContent = removeInjectedScripts(content);

  if (newContent === originalContent) {
    log(`文件 ${filePath} 无需清理`, verbose);
    return 0;
  }

  if (!dryRun) {
    writeFile(filePath, newContent);
    logSuccess(`已从 ${filePath} 移除注入的脚本`);
  } else {
    logInfo(`[DRY RUN] 将从 ${filePath} 移除注入的脚本`);
  }

  return 1;
}

// 从 Vite 配置卸载
function uninstallFromViteConfig(filePath, dryRun, verbose) {
  const content = readFile(filePath);
  const originalContent = content;
  const newContent = removeViteInjection(content);

  if (newContent === originalContent) {
    log(`文件 ${filePath} 无需清理`, verbose);
    return 0;
  }

  if (!dryRun) {
    writeFile(filePath, newContent);
    logSuccess(`已从 ${filePath} 移除注入的 Vite 插件`);
  } else {
    logInfo(`[DRY RUN] 将从 ${filePath} 移除注入的插件`);
  }

  return 1;
}

// 从 Next.js Document 卸载
function uninstallFromNextDocument(filePath, dryRun, verbose) {
  const content = readFile(filePath);
  const originalContent = content;
  const newContent = removeNextDocumentInjection(content);

  if (newContent === originalContent) {
    log(`文件 ${filePath} 无需清理`, verbose);
    return 0;
  }

  if (!dryRun) {
    writeFile(filePath, newContent);
    logSuccess(`已从 ${filePath} 移除注入的脚本`);
  } else {
    logInfo(`[DRY RUN] 将从 ${filePath} 移除注入的脚本`);
  }

  return 1;
}

// 从 Next.js App 卸载
function uninstallFromNextApp(filePath, dryRun, verbose) {
  const content = readFile(filePath);
  const originalContent = content;
  const newContent = removeNextAppInjection(content);

  if (newContent === originalContent) {
    log(`文件 ${filePath} 无需清理`, verbose);
    return 0;
  }

  if (!dryRun) {
    writeFile(filePath, newContent);
    logSuccess(`已从 ${filePath} 移除注入的脚本`);
  } else {
    logInfo(`[DRY RUN] 将从 ${filePath} 移除注入的脚本`);
  }

  return 1;
}

// 从 Next.js App Layout 卸载
function uninstallFromNextAppLayout(filePath, dryRun, verbose) {
  const content = readFile(filePath);
  const originalContent = content;
  const newContent = removeNextAppLayoutInjection(content);

  if (newContent === originalContent) {
    log(`文件 ${filePath} 无需清理`, verbose);
    return 0;
  }

  if (!dryRun) {
    writeFile(filePath, newContent);
    logSuccess(`已从 ${filePath} 移除注入的脚本`);
  } else {
    logInfo(`[DRY RUN] 将从 ${filePath} 移除注入的脚本`);
  }

  return 1;
}

// 智能注入 - 根据项目类型选择最佳注入方式
export function smartInject(options = {}) {
  const { remote, file, dryRun = false, verbose = false } = options;

  // 检测项目类型
  const projectType = detectProjectType();
  logInfo(`检测到项目类型: ${projectType}`, verbose);

  // 生成脚本标签
  const remoteType = parseRemoteType(remote);
  const scriptTag = generateScriptTag(remote, remoteType);

  log(`脚本类型: ${remoteType}`, verbose);
  log(`脚本标签: ${scriptTag}`, verbose);

  // 查找入口文件
  const entryFiles = file ? [file] : findFrameworkEntry(projectType);

  if (entryFiles.length === 0) {
    logError('未找到需要处理的文件');
    return false;
  }

  log(`找到 ${entryFiles.length} 个文件:`, verbose);
  entryFiles.forEach(f => log(`  - ${f}`, verbose));

  let successCount = 0;

  for (const entryFile of entryFiles) {
    try {
      // 处理 Next.js Pages Router
      if (projectType === 'next-pages' || projectType === 'next-hybrid') {
        if (entryFile.includes('_document')) {
          if (injectToNextDocument(entryFile, scriptTag)) {
            successCount++;
          }
        } else if (entryFile.includes('_app')) {
          if (injectToAppComponent(entryFile, scriptTag)) {
            successCount++;
          }
        }
      }
      // 处理 Next.js App Router
      else if (projectType === 'next-app') {
        if (injectToNextAppLayout(entryFile, scriptTag)) {
          successCount++;
        }
      }
      // 处理 Vite 项目
      else if (projectType === 'vite') {
        if (injectToViteConfig(entryFile, remote, scriptTag)) {
          successCount++;
        }
      }
      // 处理 HTML 和 create-react-app
      else if (projectType === 'html-static' || projectType === 'create-react-app') {
        let htmlContent = readFile(entryFile);
        const originalContent = htmlContent;
        const newContent = injectScriptToHtml(htmlContent, scriptTag);

        if (newContent !== originalContent) {
          if (!dryRun) {
            writeFile(entryFile, newContent);
            logSuccess(`已注入脚本到 ${entryFile}`);
          } else {
            logInfo(`[DRY RUN] 将注入脚本到 ${entryFile}`);
          }
          successCount++;
        } else {
          log(`文件 ${entryFile} 已包含注入内容`, verbose);
        }
      }
    } catch (error) {
      logError(`处理文件 ${entryFile} 失败: ${error.message}`);
    }
  }

  if (successCount > 0) {
    logSuccess(`成功处理 ${successCount} 个文件`);
    logInfo(`项目类型: ${projectType}`);
    logInfo(`脚本地址: ${remote}`);

    if (projectType.startsWith('next-')) {
      logInfo('💡 Next.js 项目: 脚本已注入到组件中，需要重启开发服务器');
    } else if (projectType === 'vite') {
      logInfo('💡 Vite 项目: 脚本已注入到配置文件，需要重启开发服务器');
    }
  } else {
    logError('没有成功处理任何文件');
  }

  return successCount > 0;
}
