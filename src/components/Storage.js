import { logger } from '../utils/logger.js';

/**
 * 📦 存储组件
 * 用于箱子等存储建筑
 */
export class Storage {
  /**
   * @param {number} slots - 存储格子数量
   * @param {string} id - 唯一ID
   */
  constructor(slots = 30, id = null) {
    this.id = id || `storage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.maxSlots = slots;
    this.items = new Array(slots).fill(null);
    
    logger.debug(`📦 创建存储: ${this.id}, 容量: ${slots}`);
  }

  /**
   * 获取所有物品
   * @returns {Array}
   */
  getItems() {
    return [...this.items];
  }

  /**
   * 获取指定格子的物品
   * @param {number} index - 格子索引
   * @returns {Object|null}
   */
  getItem(index) {
    if (index < 0 || index >= this.maxSlots) return null;
    return this.items[index] ? { ...this.items[index] } : null;
  }

  /**
   * 设置指定格子的物品
   * @param {number} index - 格子索引
   * @param {Object|null} item - 物品 {itemId, count}
   * @returns {boolean}
   */
  setItem(index, item) {
    if (index < 0 || index >= this.maxSlots) return false;
    this.items[index] = item ? { ...item } : null;
    return true;
  }

  /**
   * 添加物品到存储
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {{success: boolean, remaining: number}}
   */
  addItem(itemId, count) {
    let remaining = count;
    const maxStack = 99;

    // 先尝试堆叠到已有物品
    for (let i = 0; i < this.maxSlots && remaining > 0; i++) {
      if (this.items[i] && this.items[i].itemId === itemId) {
        const canAdd = maxStack - this.items[i].count;
        const toAdd = Math.min(canAdd, remaining);
        this.items[i].count += toAdd;
        remaining -= toAdd;
      }
    }

    // 再放到空格子
    for (let i = 0; i < this.maxSlots && remaining > 0; i++) {
      if (!this.items[i]) {
        const toAdd = Math.min(maxStack, remaining);
        this.items[i] = { itemId, count: toAdd };
        remaining -= toAdd;
      }
    }

    return {
      success: remaining < count,
      remaining
    };
  }

  /**
   * 从存储移除物品
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {boolean}
   */
  removeItem(itemId, count) {
    let toRemove = count;

    // 检查总数
    const total = this.countItem(itemId);
    if (total < count) return false;

    // 从后往前移除
    for (let i = this.maxSlots - 1; i >= 0 && toRemove > 0; i--) {
      if (this.items[i] && this.items[i].itemId === itemId) {
        const remove = Math.min(this.items[i].count, toRemove);
        this.items[i].count -= remove;
        toRemove -= remove;
        
        if (this.items[i].count <= 0) {
          this.items[i] = null;
        }
      }
    }

    return true;
  }

  /**
   * 统计物品数量
   * @param {string} itemId - 物品ID
   * @returns {number}
   */
  countItem(itemId) {
    return this.items.reduce((sum, item) => {
      if (item && item.itemId === itemId) {
        return sum + item.count;
      }
      return sum;
    }, 0);
  }

  /**
   * 检查是否有物品
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {boolean}
   */
  hasItem(itemId, count = 1) {
    return this.countItem(itemId) >= count;
  }

  /**
   * 获取空格子数量
   * @returns {number}
   */
  getEmptySlots() {
    return this.items.filter(item => !item).length;
  }

  /**
   * 是否已满
   * @returns {boolean}
   */
  isFull() {
    return this.getEmptySlots() === 0;
  }

  /**
   * 清空存储
   */
  clear() {
    this.items = new Array(this.maxSlots).fill(null);
  }

  /**
   * 序列化（存档用）
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      maxSlots: this.maxSlots,
      items: this.items.map(item => item ? { ...item } : null)
    };
  }

  /**
   * 反序列化（读档用）
   * @param {Object} data
   * @returns {Storage}
   */
  static deserialize(data) {
    const storage = new Storage(data.maxSlots, data.id);
    storage.items = data.items.map(item => item ? { ...item } : null);
    return storage;
  }
}
