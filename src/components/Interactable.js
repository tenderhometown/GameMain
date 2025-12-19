import { logger } from '../utils/logger.js';
import { InteractionPriority } from '../systems/InteractionContext.js';

/**
 * 🔧 可交互组件（重构版 - 支持HP系统 + 标准交互接口）
 * 附加到可以被玩家交互的物体上
 * 
 * ✅ 实现标准交互接口：
 * - canInteract() - 是否可以交互
 * - getPrompt() - 获取交互提示文本
 * - interact() - 执行交互行为
 * - getPriority() - 获取交互优先级
 * - getRange() - 获取交互范围
 */
export class Interactable {
  /**
   * @param {Object} config - 配置
   * @param {string} config.type - 交互类型（'tree', 'rock', 'storage', 'cooking', 'bed' 等）
   * @param {string} config.resourceType - 资源类型（'wood', 'stone'）用于计算工具效率
   * @param {Object} config.rewards - 采集获得的资源
   * @param {string} config.displayName - 显示名称
   * @param {number} config.maxHp - 最大HP
   * @param {number} config.interactionRange - 交互范围（米）
   * @param {number} config.priority - 交互优先级
   * @param {Function} [config.onDestroy] - 被摧毁时的回调
   * @param {Function} [config.onInteract] - 交互时的回调
   */
  constructor(config) {
    this.type = config.type;
    this.resourceType = config.resourceType || config.type; // 🔧 资源类型
    this.rewards = config.rewards || {};
    this.displayName = config.displayName || '未知物体';
    this.onDestroy = config.onDestroy || null;
    this.onInteract = config.onInteract || null; // ✨ 新增：交互回调
    
    // 🔧 HP系统
    this.maxHp = config.maxHp || 100;
    this.currentHp = this.maxHp;
    
    // ✨ 新增：交互配置
    this.interactionRange = config.interactionRange || 3.0;
    this.priority = config.priority || InteractionPriority.MEDIUM;
    
    this.isInteractable = true;
  }

  // ========== 标准交互接口（InteractionContext要求） ==========

  /**
   * ✨ 检查是否可以交互
   * @returns {boolean}
   */
  canInteract() {
    return this.isInteractable;
  }

  /**
   * ✨ 执行交互行为
   * 对于资源类型（树木、石头），不执行任何操作（由ActionContext处理采集）
   * 对于建筑类型（箱子、篝火），触发回调
   */
  interact() {
    if (!this.canInteract()) {
      return;
    }

    // 如果有自定义交互回调，执行它
    if (this.onInteract) {
      logger.debug(`执行交互: ${this.displayName}`);
      this.onInteract();
    } else {
      logger.debug(`${this.displayName} 没有定义交互行为`);
    }
  }

  /**
   * ✨ 获取交互优先级
   * @returns {number}
   */
  getPriority() {
    return this.priority;
  }

  /**
   * ✨ 获取交互范围
   * @returns {number}
   */
  getRange() {
    return this.interactionRange;
  }

  // ========== HP系统（资源采集） ==========

  /**
   * 🔧 受到攻击（采集伤害）
   * @param {number} damage - 伤害值
   * @returns {{destroyed: boolean, remainingHp: number, maxHp: number}}
   */
  takeDamage(damage) {
    if (! this.isInteractable) {
      return { destroyed: false, remainingHp: this.currentHp, maxHp: this.maxHp };
    }

    this.currentHp -= damage;
    
    logger.debug(`${this.displayName} 受到 ${damage} 点伤害，剩余HP: ${this.currentHp}/${this.maxHp}`);

    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.isInteractable = false;
      
      return { 
        destroyed: true, 
        remainingHp: 0, 
        maxHp:  this.maxHp 
      };
    }

    return { 
      destroyed: false, 
      remainingHp: this.currentHp, 
      maxHp: this.maxHp 
    };
  }

  /**
   * 🔧 获取HP百分比
   * @returns {number} 0-100
   */
  getHpPercent() {
    return (this.currentHp / this.maxHp) * 100;
  }

  /**
   * ✨ 获取交互提示文本
   * 资源类型：显示"采集"（左键）
   * 建筑类型：显示"交互"（E键）
   * @returns {string}
   */
  getPrompt() {
    // 如果是资源类型（树木、石头），不显示提示（由ActionContext处理）
    if (this.resourceType && (this.resourceType === 'wood' || this.resourceType === 'stone')) {
      return ''; // 资源采集不通过E键，而是鼠标左键
    }

    // 建筑类型（箱子、篝火、床等），显示E键提示
    const actionMap = {
      'storage': '📦 打开箱子 [E]',
      'cooking': '🔥 使用篝火 [E]',
      'bed': '🛏️ 睡觉 [E]',
      'workbench': '🔨 使用工作台 [E]',
    };

    return actionMap[this.type] || `按 E 交互 ${this.displayName}`;
  }

  /**
   * 获取奖励资源
   * @returns {Object}
   */
  getRewards() {
    return { ...this.rewards };
  }

  /**
   * 🔧 获取资源类型
   * @returns {string}
   */
  getResourceType() {
    return this.resourceType;
  }
}