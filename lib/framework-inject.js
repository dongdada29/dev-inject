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
    const fs = require('fs');
    const path = require('path');

    for (const [type, files] of Object.entries(indicators)) {
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
  const fs = require('fs');
  const path = require('path');

  switch (projectType) {
    case 'vite':
      return [
        'index.html',
        'public/index.html',
        'src/index.html',
        'index.html'
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
    /\/\*\s*dev-inject script\s*\*\/[\s\S]*?(?=<\/Head>)/g,
    /{typeof window !== 'undefined' && [\s\S]*?}}[\s\S]*?<\/Head>/g,
    /\/\*\s*dev-inject script\s*\*\/[\s\S]*?<\/script>/g
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
    /\/\*\s*dev-inject script\s*\*\/[\s\S]*?useEffect\([^)]*\)\s*=>\s*{[\s\S]*?},\s*\[?\s*\]?\s*\);?/g,
    /useEffect\(\(\) => \{\s*if \(typeof window !== 'undefined'\) \{[\s\S]*?\}\s*\}, \[\]\);?/g
  ];

  patterns.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  return content;
}

// 移除 Next.js App Layout 注入
function removeNextAppLayoutInjection(content) {
  return removeNextAppInjection(content);
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

  let successCount = 0;

  for (const entryFile of entryFiles) {
    try {
      if (projectType === 'next-pages' || projectType === 'next-hybrid') {
        if (entryFile.includes('_document')) {
          if (dryRun) {
            logInfo(`[DRY RUN] 将注入脚本到 Next.js _document: ${entryFile}`);
            successCount++;
            continue;
          }

          if (injectToNextDocument(entryFile, scriptTag)) {
            logSuccess(`已注入脚本到 Next.js _document: ${entryFile}`);
            successCount++;
          }
        } else if (entryFile.includes('_app')) {
          if (dryRun) {
            logInfo(`[DRY RUN] 将注入脚本到 Next.js _app: ${entryFile}`);
            successCount++;
            continue;
          }

          if (injectToAppComponent(entryFile, scriptTag)) {
            logSuccess(`已注入脚本到 Next.js _app: ${entryFile}`);
            successCount++;
          }
        }
      } else if (projectType === 'next-app') {
        if (dryRun) {
          logInfo(`[DRY RUN] 将注入脚本到 Next.js App Layout: ${entryFile}`);
          successCount++;
          continue;
        }

        if (injectToNextAppLayout(entryFile, scriptTag)) {
          logSuccess(`已注入脚本到 Next.js App Layout: ${entryFile}`);
          successCount++;
        }
      } else {
        // 传统 HTML 注入方式
        const htmlFiles = lookupFiles().filter(f =>
          entryFile === '*' || f.endsWith(entryFile) || f.includes(entryFile)
        );

        for (const htmlFile of htmlFiles) {
          if (dryRun) {
            logInfo(`[DRY RUN] 将注入脚本到 ${htmlFile}`);
            successCount++;
            continue;
          }

          let htmlContent = readFile(htmlFile);
          htmlContent = removeInjectedScripts(htmlContent);
          const newContent = injectScriptToHtml(htmlContent, scriptTag);

          if (newContent !== htmlContent) {
            writeFile(htmlFile, newContent);
            logSuccess(`已注入脚本到 ${htmlFile}`);
            successCount++;
          }
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
    }
  } else {
    logError('没有成功处理任何文件');
  }

  return successCount > 0;
}
