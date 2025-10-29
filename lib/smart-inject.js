import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * 检测项目类型
 */
export function detectProjectType(startDir = process.cwd()) {
  const indicators = {
    'next-app': ['app/layout.tsx', 'app/layout.js'],
    'next-pages': ['pages/_document.tsx', 'pages/_document.js'],
    vite: ['vite.config.js', 'vite.config.ts'],
    'create-react-app': ['public/index.html'],
    'html-static': ['index.html', '.html'],
    unknown: [],
  };

  // 特殊处理 Next.js 混合模式
  const hasAppDir = existsSync(join(startDir, 'app'));
  const hasPagesDir = existsSync(join(startDir, 'pages'));
  const hasNextConfig = existsSync(join(startDir, 'next.config.js'));

  if (hasNextConfig) {
    if (hasAppDir && hasPagesDir) {
      return 'next-hybrid';
    } else if (hasAppDir) {
      return 'next-app';
    } else if (hasPagesDir) {
      return 'next-pages';
    }
  }

  // 检测其他框架
  for (const [type, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (existsSync(join(startDir, file))) {
        return type;
      }
    }
  }

  return 'unknown';
}

/**
 * 为 Vite 项目注入插件
 */
export function injectToVite(options = {}) {
  const { remote, dryRun = false, verbose = false } = options;

  const startDir = process.cwd();

  // 查找 vite.config 文件
  const possibleConfigs = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
  ];
  let configPath = null;

  for (const config of possibleConfigs) {
    if (existsSync(join(startDir, config))) {
      configPath = join(startDir, config);
      break;
    }
  }

  if (!configPath) {
    throw new Error('未找到 vite.config 文件');
  }

  // 读取现有配置
  let content = readFileSync(configPath, 'utf8');

  // 检查是否已经注入
  if (content.includes('dev-inject-plugin')) {
    if (verbose) console.log('Vite 配置中已存在 dev-inject 插件');
    return true;
  }

  // 生成插件代码
  const pluginCode = generateVitePlugin(remote);

  // 查找 plugins 数组并插入
  const pluginsMatch = content.match(/plugins:\s*\[([^\]]*)\]/s);

  if (pluginsMatch) {
    // 在现有插件数组中添加
    const beforePlugins = pluginsMatch[1];
    const newPlugins = beforePlugins.trim()
      ? `${beforePlugins.trim()},\n    ${pluginCode}`
      : pluginCode;

    content = content.replace(
      pluginsMatch[0],
      `plugins: [\n    ${newPlugins}\n  ]`
    );
  } else {
    // 如果没有 plugins 数组，需要添加
    const exportMatch = content.match(
      /export\s+default\s+defineConfig\s*\(([^)]*)\)/s
    );

    if (exportMatch) {
      const configObject = exportMatch[1];
      content = content.replace(
        exportMatch[0],
        `export default defineConfig({\n    ${configObject},\n    plugins: [${pluginCode}]\n  })`
      );
    } else {
      throw new Error('无法解析 vite.config 文件结构');
    }
  }

  if (dryRun) {
    console.log(`[DRY RUN] 将修改 ${configPath}`);
    console.log('注入的插件代码:', pluginCode);
    return true;
  }

  // 写入修改后的配置
  writeFileSync(configPath, content);
  console.log(`✅ 已为 Vite 项目注入 dev-inject 插件`);

  return true;
}

/**
 * 生成 Vite 插件代码
 */
function generateVitePlugin(remote) {
  const remoteType = remote.startsWith('http') ? 'url' : 'path';
  const scriptContent = generateScriptContent(remote, remoteType);

  // 确保脚本标签包含时间戳
  const separator = remote.includes('?') ? '&' : '?';
  const timestamp = Date.now();
  const scriptWithTimestamp = remoteType === 'url'
    ? `<script src="${remote}${separator}t=${timestamp}"></script>`
    : scriptContent;

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

/**
 * 生成脚本内容
 */
function generateScriptContent(remote, remoteType) {
  if (remoteType === 'url') {
    return `    <!-- DEV-INJECT-START -->
    <script src="${remote}"></script>
    <!-- DEV-INJECT-END -->`;
  } else {
    return `    <!-- DEV-INJECT-START -->
    <script>
      // 开发期监控脚本 - 仅在 dev 模式加载
      (function() {
        console.log('[dev-inject] 开发脚本已加载');

        // 加载监控脚本
        const script = document.createElement('script');
        script.src = '${remote}';
        script.onload = function() {
          console.log('[dev-inject] 监控脚本加载完成');
        };
        script.onerror = function() {
          console.error('[dev-inject] 监控脚本加载失败');
        };
        document.head.appendChild(script);
      })();
    </script>
    <!-- DEV-INJECT-END -->`;
  }
}

/**
 * 为 Next.js App Router 注入
 */
export function injectToNextApp(options = {}) {
  const { remote, dryRun = false, verbose = false } = options;

  const startDir = process.cwd();

  const layoutPaths = ['app/layout.tsx', 'app/layout.js'];

  let layoutPath = null;
  for (const layout of layoutPaths) {
    if (existsSync(join(startDir, layout))) {
      layoutPath = join(startDir, layout);
      break;
    }
  }

  if (!layoutPath) {
    throw new Error(
      '未找到 Next.js App Layout 文件 (app/layout.tsx 或 app/layout.js)'
    );
  }

  let content = readFileSync(layoutPath, 'utf8');

  // 检查是否已经注入
  if (content.includes('dev-inject-script')) {
    if (verbose) console.log('Next.js Layout 中已存在 dev-inject 脚本');
    return true;
  }

  // 生成 Next.js 脚本注入代码
  const scriptInjection = generateNextScriptInjection(remote);

  // 查找 <head> 标签并注入
  const headRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
  const headMatch = content.match(headRegex);

  if (headMatch) {
    // 在 <head> 内注入
    const beforeHead = headMatch[1];
    const newHead = beforeHead + '\n      ' + scriptInjection;
    content = content.replace(headRegex, `<head${headMatch[0].slice(5, -6)}${newHead}</head>`);
  } else {
    // 如果没有 <head> 标签，查找 <html> 标签后添加
    const htmlRegex = /<html[^>]*>/;
    const htmlMatch = content.match(htmlRegex);
    if (htmlMatch) {
      const insertPoint = content.indexOf(htmlMatch[0]) + htmlMatch[0].length;
      const headTag = '\n  <head>\n      ' + scriptInjection + '\n    </head>';
      content = content.slice(0, insertPoint) + headTag + content.slice(insertPoint);
    } else {
      throw new Error('无法解析 Next.js Layout 组件结构');
    }
  }

  if (dryRun) {
    console.log(`[DRY RUN] 将修改 ${layoutPath}`);
    return true;
  }

  writeFileSync(layoutPath, content);
  console.log(`✅ 已为 Next.js App Router 注入 dev-inject 脚本`);

  return true;
}

/**
 * 生成 Next.js 脚本注入代码
 */
function generateNextScriptInjection(remote) {
  const remoteType = remote.startsWith('http') ? 'url' : 'path';
  const separator = remote.includes('?') ? '&' : '?';
  const timestamp = Date.now();

  if (remoteType === 'url') {
    return `
      {/* DEV-INJECT-START */}
      {process.env.NODE_ENV === 'development' && (
        <script src="${remote}${separator}t=${timestamp}" />
      )}
      {/* DEV-INJECT-END */}`;
  } else {
    return `
      {/* DEV-INJECT-START */}
      {process.env.NODE_ENV === 'development' && (
        <script dangerouslySetInnerHTML={{
          __html: \`
            // 开发期监控脚本
            (function() {
              console.log('[dev-inject] 开发脚本已加载');
              const script = document.createElement('script');
              script.src = '${remote}';
              script.onload = function() {
                console.log('[dev-inject] 监控脚本加载完成');
              };
              script.onerror = function() {
                console.error('[dev-inject] 监控脚本加载失败');
              };
              document.head.appendChild(script);
            })();
          \`
        }} />
      )}
      {/* DEV-INJECT-END */}`;
  }
}

/**
 * 为 Next.js Pages Router 注入
 */
export function injectToNextPages(options = {}) {
  const { remote, dryRun = false, verbose = false } = options;

  const startDir = process.cwd();

  // 优先使用 _document.tsx
  const documentPaths = ['pages/_document.tsx', 'pages/_document.js'];

  let documentPath = null;
  for (const doc of documentPaths) {
    if (existsSync(join(startDir, doc))) {
      documentPath = join(startDir, doc);
      break;
    }
  }

  if (!documentPath) {
    throw new Error('未找到 Next.js _document 文件');
  }

  let content = readFileSync(documentPath, 'utf8');

  // 检查是否已经注入
  if (content.includes('dev-inject-script')) {
    if (verbose) console.log('Next.js _document 中已存在 dev-inject 脚本');
    return true;
  }

  // 生成 _document 注入代码
  const scriptInjection = generateNextDocumentInjection(remote);

  // 查找 Head 组件并注入
  const headMatch = content.match(/<Head[^>]*>([\s\S]*?)<\/Head>/);

  if (headMatch) {
    // 在现有 Head 组件中添加
    const headContent = headMatch[1];
    const newHeadContent = headContent + scriptInjection;
    content = content.replace(
      headMatch[0],
      `<Head>${newHeadContent}
      </Head>`
    );
  } else {
    throw new Error(
      '未找到 Head 组件，请确保 _document 文件中包含 <Head> 组件'
    );
  }

  if (dryRun) {
    console.log(`[DRY RUN] 将修改 ${documentPath}`);
    return true;
  }

  writeFileSync(documentPath, content);
  console.log(`✅ 已为 Next.js Pages Router 注入 dev-inject 脚本`);

  return true;
}

/**
 * 生成 Next.js _document 注入代码
 */
function generateNextDocumentInjection(remote) {
  const remoteType = remote.startsWith('http') ? 'url' : 'path';
  const separator = remote.includes('?') ? '&' : '?';
  const timestamp = Date.now();

  return `
        {/* DEV-INJECT-START */}
        {process.env.NODE_ENV === 'development' && (
          <script src="${remote}${separator}t=${timestamp}"></script>
        )}
        {/* DEV-INJECT-END */}`;
}

/**
 * 智能注入 - 根据项目类型选择最佳注入方式
 */
export function smartInject(options = {}) {
  const { remote, dryRun = false, verbose = false } = options;

  const projectType = detectProjectType();
  console.log(`🔍 检测到项目类型: ${projectType}`);

  try {
    switch (projectType) {
      case 'vite':
        return injectToVite({ remote, dryRun, verbose });

      case 'next-app':
        return injectToNextApp({ remote, dryRun, verbose });

      case 'next-pages':
        return injectToNextPages({ remote, dryRun, verbose });

      case 'next-hybrid':
        console.log('🔄 检测到 Next.js 混合模式，优先注入到 App Layout');
        try {
          return injectToNextApp({ remote, dryRun, verbose });
        } catch (error) {
          console.log('⚠️  App Layout 注入失败，尝试注入到 _document');
          return injectToNextPages({ remote, dryRun, verbose });
        }

      default:
        throw new Error(`不支持的项目类型: ${projectType}`);
    }
  } catch (error) {
    console.error(`❌ 注入失败: ${error.message}`);
    return false;
  }
}

/**
 * 移除注入
 */
export function removeInjection(options = {}) {
  const { dryRun = false, verbose = false } = options;

  const projectType = detectProjectType();
  console.log(`🔍 检测到项目类型: ${projectType}`);

  try {
    switch (projectType) {
      case 'vite':
        return removeFromVite({ dryRun, verbose });

      case 'next-app':
        return removeFromNextApp({ dryRun, verbose });

      case 'next-pages':
        return removeFromNextPages({ dryRun, verbose });

      case 'next-hybrid':
        console.log('🔄 检测到 Next.js 混合模式，清理所有注入');
        removeFromNextApp({ dryRun, verbose });
        removeFromNextPages({ dryRun, verbose });
        return true;

      default:
        console.log(`❓ 未知项目类型: ${projectType}`);
        return false;
    }
  } catch (error) {
    console.error(`❌ 移除失败: ${error.message}`);
    return false;
  }
}

// 移除函数实现...
function removeFromVite(options = {}) {
  const { dryRun = false, verbose = false } = options;

  const startDir = process.cwd();

  const possibleConfigs = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
  ];
  let configPath = null;

  for (const config of possibleConfigs) {
    if (existsSync(join(startDir, config))) {
      configPath = join(startDir, config);
      break;
    }
  }

  if (!configPath) {
    throw new Error('未找到 vite.config 文件');
  }

  let content = readFileSync(configPath, 'utf8');

  // 移除 dev-inject 插件
  const pluginRegex = /\/\/ dev-inject-plugin[\s\S]*?}/g;
  content = content.replace(pluginRegex, '');

  // 清理多余的逗号和空行
  content = content.replace(/,\s*\n\s*\]/g, '\n  ]');
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (dryRun) {
    console.log(`[DRY RUN] 将清理 ${configPath}`);
    return true;
  }

  writeFileSync(configPath, content);
  console.log(`✅ 已从 Vite 配置中移除 dev-inject 插件`);

  return true;
}

// 其他移除函数的实现类似...
