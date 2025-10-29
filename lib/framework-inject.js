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

    // 检查是否已经存在 dev-inject 插件
    if (content.includes('dev-inject') || content.includes('name: \'dev-inject\'')) {
      logInfo('Vite 配置已存在 dev-inject 插件');
      return false;
    }

    // 移除之前的注入（如果存在）
    content = content.replace(
      /\/\/ dev-inject plugin[\s\S]*?\/\/ end dev-inject/g,
      ''
    );

    // 生成插件代码
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
  return `// dev-inject plugin
    (function() {
      return {
        name: 'dev-inject',
        transformIndexHtml(html) {
          if (process.env.NODE_ENV === 'development') {
            return html.replace(
              '</head>',
              \`${scriptTag}\\n</head>\`
            );
          }
          return html;
        }
      };
    })()`;
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

  // 移除之前的注入
  content = removeNextDocumentInjection(content);

  // 查找 <Head> 组件
  const headRegex = /<Head[^>]*>([\s\S]*?)<\/Head>/;
  const headMatch = content.match(headRegex);

  if (headMatch) {
    // 在 <Head> 组件内注入
    const beforeHead = headMatch[1];
    const newHead = beforeHead + '\n          {/* dev-inject script */}\n          ' + scriptTag;
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
          {/* dev-inject script */}
          {typeof window !== 'undefined' && ${scriptTag.replace(/<script[^>]*>|<\/script>/g, '')}}
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
  /* dev-inject script */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ${generateScriptLoader(scriptTag)}
    }
  }, []);`;

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

    const isTypeScript = filePath.endsWith('.tsx');

    // 在 layout.tsx/js 中注入
    const scriptLoader = generateScriptLoader(scriptTag);

    // 查找现有的 useEffect 或组件末尾
    const existingUseEffect = content.match(/useEffect\([^)]*\)\s*=>\s*{[\s\S]*?},\s*\[?\s*\]?\s*\);?/);

    if (existingUseEffect) {
      // 在现有 useEffect 中添加
      content = content.replace(
        existingUseEffect[0],
        existingUseEffect[0].replace('}, []);', '  \n' + scriptLoader.replace(/useEffect\([^)]*\)\s*=>\s*{\n/, '').replace(/}, \[\];/, '') + '\n    }, [];')
      );
    } else {
      // 添加新的 useEffect 在组件开始处
      const componentStartMatch = content.match(/export default function.*{|const.*=.*\(\)\s*=>\s*{/);
      if (componentStartMatch) {
        const insertPoint = content.indexOf(componentStartMatch[0]) + componentStartMatch[0].length;
        content = content.slice(0, insertPoint) + '\n  ' + scriptLoader + '\n' + content.slice(insertPoint);
      }
    }

    writeFile(filePath, content);
    return true;

  } catch (error) {
    logError(`Next.js App Router 注入失败: ${error.message}`);
    return false;
  }
}

// 生成脚本加载器
function generateScriptLoader(scriptTag) {
  return `useEffect(() => {
    if (typeof window !== 'undefined') {
      ${scriptTag.replace(/<script[^>]*>|<\/script>/g, '').trim()}
    }
  }, []);`;
}

// 移除 Next.js Document 注入
function removeNextDocumentInjection(content) {
  // 移除 dev-inject 相关的注释和脚本
  const patterns = [
    /\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?(?=<\/Head>)/g,
    /{typeof window !== 'undefined' && [\s\S]*?}}[\s\S]*?<\/Head>/g,
    /\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?<\/script>/g
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content;
}

// 移除 Next.js App 注入
function removeNextAppInjection(content) {
  // 移除 dev-inject 相关的 useEffect
  const patterns = [
    /\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?useEffect\([^)]*\)\s*=>\s*{[\s\S]*?},\s*\[?\s*\]?\s*\);?/g,
    /useEffect\(\(\) => \{\s*if \(typeof window !== 'undefined'\) \{[\s\S]*?\}\s*\}, \[\]\);?/g
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content;
}

// 移除 Next.js App Layout 注入
function removeNextAppLayoutInjection(content) {
  // 移除多行 dev-inject 注入模式
  // 模式1: 单行的 JSX 模式
  content = content.replace(/{\s*\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?}/g, '');

  // 模式2: 多行的 process.env 模式
  content = content.replace(/\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?process\.env\.NODE_ENV === 'development' &&[\s\S]*?script[^]*?\/>/g, '');

  // 模式3: 直接移除 script 标签及其前导注释
  content = content.replace(/\/\*\s*dev-inject script\s*\/\*\/[\s\S]*?<script[^>]*>[\s\S]*?<\/script>/g, '');

  // 清理空的 head 标签
  content = content.replace(/<head>\s*<\/head>/g, '');

  // 清理多余的空白行
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return content;
}

// 移除 Vite 插件注入
function removeViteInjection(content) {
  // 移除插件代码和注释（匹配所有 flow形式的内容）
  content = content.replace(
    /\/\/ dev-inject-plugin[\s\S]*?name:\s*['"]dev-inject-plugin['"]/g,
    ''
  );

  // 移除完整的插件对象（匹配从注释到 } 的完整插件）
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
