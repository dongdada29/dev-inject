import fs from 'fs';
import path from 'path';
import { lookupFiles } from './utils.js';

/**
 * 文件查找工具类 - 支持多种后缀名尝试机制
 */
export class FileFinder {
  /**
   * 查找具有多种后缀名的文件
   * @param {string} basePath - 基础路径（不包含后缀）
   * @param {string[]} extensions - 后缀名数组，按优先级排序
   * @param {string} startDir - 起始目录
   * @returns {string|null} 找到的文件路径或 null
   */
  static findWithExtensions(basePath, extensions = ['.tsx', '.ts', '.jsx', '.js'], startDir = process.cwd()) {
    for (const ext of extensions) {
      const fullPath = path.join(startDir, basePath + ext);
      if (fs.existsSync(fullPath)) {
        return basePath + ext;
      }
    }
    return null;
  }

  /**
   * 查找多个候选文件
   * @param {string[]} candidates - 候选文件路径数组
   * @param {string} startDir - 起始目录
   * @returns {string[]} 找到的文件路径数组
   */
  static findMultiple(candidates, startDir = process.cwd()) {
    const foundFiles = [];
    for (const candidate of candidates) {
      if (candidate === '*.html') {
        // 特殊处理：查找所有 HTML 文件
        const htmlFiles = lookupFiles(startDir);
        foundFiles.push(...htmlFiles);
      } else if (fs.existsSync(path.join(startDir, candidate))) {
        foundFiles.push(candidate);
      }
    }
    return foundFiles;
  }

  /**
   * 查找框架特定的入口文件
   * @param {string} projectType - 项目类型
   * @param {string} startDir - 起始目录
   * @returns {string[]} 找到的文件路径数组
   */
  static findFrameworkEntry(projectType, startDir = process.cwd()) {
    const foundFiles = [];

    switch (projectType) {
      case 'vite':
        // 尝试查找 vite.config 文件
        const viteConfig = this.findWithExtensions('vite.config', ['.js', '.ts', '.mjs'], startDir);
        if (viteConfig) {
          foundFiles.push(viteConfig);
        }
        break;

      case 'next-pages':
        // 尝试查找 _document 文件
        const documentFile = this.findWithExtensions('pages/_document', ['.tsx', '.jsx', '.ts', '.js'], startDir);
        if (documentFile) {
          foundFiles.push(documentFile);
        }

        // 尝试查找 _app 文件
        const appFile = this.findWithExtensions('pages/_app', ['.tsx', '.jsx', '.ts', '.js'], startDir);
        if (appFile) {
          foundFiles.push(appFile);
        }
        break;

      case 'next-app':
        // 尝试查找 layout 文件
        const layoutFile = this.findWithExtensions('app/layout', ['.tsx', '.jsx', '.ts', '.js'], startDir);
        if (layoutFile) {
          foundFiles.push(layoutFile);
        }

        // 尝试查找 globals.css
        const globalsCss = 'app/globals.css';
        if (fs.existsSync(path.join(startDir, globalsCss))) {
          foundFiles.push(globalsCss);
        }
        break;

      case 'next-hybrid':
        // 尝试查找 app/layout 文件
        const appLayoutFile = this.findWithExtensions('app/layout', ['.tsx', '.jsx', '.ts', '.js'], startDir);
        if (appLayoutFile) {
          foundFiles.push(appLayoutFile);
        }

        // 尝试查找 pages/_document 文件
        const pagesDocumentFile = this.findWithExtensions('pages/_document', ['.tsx', '.jsx', '.ts', '.js'], startDir);
        if (pagesDocumentFile) {
          foundFiles.push(pagesDocumentFile);
        }
        break;

      case 'create-react-app':
        // 尝试查找 HTML 文件
        const htmlFiles = ['public/index.html', 'index.html'];
        foundFiles.push(...this.findMultiple(htmlFiles, startDir));
        break;

      case 'html-static':
        // 尝试查找 HTML 文件
        const staticHtmlFiles = ['index.html', '*.html'];
        foundFiles.push(...this.findMultiple(staticHtmlFiles, startDir));
        break;

      default:
        // 默认查找 HTML 文件
        const defaultHtmlFiles = ['index.html', '*.html'];
        foundFiles.push(...this.findMultiple(defaultHtmlFiles, startDir));
        break;
    }

    return foundFiles;
  }
}

// 导出便捷方法
export function findFrameworkEntry(projectType, startDir = process.cwd()) {
  return FileFinder.findFrameworkEntry(projectType, startDir);
}

