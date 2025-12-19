/**
 * 简单的日志工具
 * 用于开发阶段的调试信息输出
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.DEBUG;
  }

  /**
   * 输出调试信息
   * @param {string} message - 日志消息
   * @param {*} data - 额外数据
   */
  debug(message, data) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  }

  /**
   * 输出普通信息
   * @param {string} message - 日志消息
   * @param {*} data - 额外数据
   */
  info(message, data) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(`[INFO] ${message}`, data || '');
    }
  }

  /**
   * 输出警告信息
   * @param {string} message - 日志消息
   * @param {*} data - 额外数据
   */
  warn(message, data) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }

  /**
   * 输出错误信息
   * @param {string} message - 日志消息
   * @param {*} error - 错误对象
   */
  error(message, error) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  }
}

// 导出单例
export const logger = new Logger();