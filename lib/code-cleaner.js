/**
 * 代码清理工具类 - 清理多余的空白字符和逗号
 */
export class CodeCleaner {
  /**
   * 清理多余的空白行
   * @param {string} content - 要清理的内容
   * @param {boolean} preserveDoubleNewline - 是否保留双换行（默认 true）
   * @returns {string} 清理后的内容
   */
  static cleanBlankLines(content, preserveDoubleNewline = true) {
    if (preserveDoubleNewline) {
      // 保留单行空白，清理多余的连续空白行
      return content.replace(/\n\s*\n\s*\n+/g, '\n\n');
    } else {
      // 清理所有多余空白行，只保留单个换行
      return content.replace(/\n\s*\n+/g, '\n');
    }
  }

  /**
   * 清理行尾的空白字符
   * @param {string} content - 要清理的内容
   * @returns {string} 清理后的内容
   */
  static cleanTrailingSpaces(content) {
    return content.replace(/[ \t]+$/gm, '');
  }

  /**
   * 清理多余的逗号
   * @param {string} content - 要清理的内容
   * @returns {string} 清理后的内容
   */
  static cleanCommas(content) {
    // 1. 清理单独的逗号行（整行都是逗号和空白）
    content = content.replace(/^\s*,\s*\n/gm, '');
    // 2. 清理行首的逗号和空白
    content = content.replace(/^\s*,\s+/gm, '');
    // 3. 清理连续的多个逗号
    content = content.replace(/,\s*,\s*/g, ',');
    return content;
  }

  /**
   * 清理空的标签对
   * @param {string} content - 要清理的内容
   * @param {string} tagName - 标签名
   * @returns {string} 清理后的内容
   */
  static cleanEmptyTags(content, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>\\s*</${tagName}>`, 'g');
    return content.replace(regex, '');
  }

  /**
   * 清理标签中间的空白行
   * @param {string} content - 要清理的内容
   * @param {string} tagName - 标签名（可以是正则表达式）
   * @returns {string} 清理后的内容
   */
  static cleanTagWhitespace(content, tagName) {
    // 清理如 <Head>\n\n\n</Head> -> <Head>\n</Head>
    content = content.replace(
      new RegExp(`(<${tagName}[^>]*>)\\s*\\n\\s*\\n(\\s*</${tagName}>)`, 'g'),
      '$1\n$2'
    );
    return content;
  }

  /**
   * 综合清理：清理所有常见的代码格式问题
   * @param {string} content - 要清理的内容
   * @param {object} options - 清理选项
   * @returns {string} 清理后的内容
   */
  static cleanAll(content, options = {}) {
    const {
      blankLines = true,
      trailingSpaces = true,
      commas = false,
      emptyTags = true,
      tagWhitespace = true
    } = options;

    if (blankLines) {
      content = this.cleanBlankLines(content);
    }

    if (trailingSpaces) {
      content = this.cleanTrailingSpaces(content);
    }

    if (commas) {
      content = this.cleanCommas(content);
    }

    if (emptyTags) {
      ['head', 'Head'].forEach(tag => {
        content = this.cleanEmptyTags(content, tag);
      });
    }

    if (tagWhitespace) {
      ['Head', 'head'].forEach(tag => {
        content = this.cleanTagWhitespace(content, tag);
      });
    }

    return content;
  }
}
