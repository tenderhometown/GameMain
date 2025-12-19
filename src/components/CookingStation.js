import { logger } from '../utils/logger.js';
import { getItem } from '../data/RecipeData.js';

/**
 * 🔥 烹饪站组件
 * 管理篝火等烹饪设施的烹饪逻辑
 * 支持后台烹饪（关闭界面仍继续）
 * 需要燃料才能烹饪
 */
export class CookingStation {
  /**
   * @param {string} id - 唯一ID
   */
  constructor(id = null) {
    this.id = id || `cooking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 燃料槽（放入燃料）
    this.fuelSlot = null;  // { itemId, count }
    
    // 食物槽（单个食物）
    this.foodSlot = null;  // { itemId, count }
    
    // 输出槽
    this.outputSlot = null;  // { itemId, count }
    
    // 燃料剩余燃烧时间（毫秒）
    this.fuelBurnTime = 0;
    
    // 当前燃料最大燃烧时间（用于显示进度）
    this.maxFuelBurnTime = 0;
    
    // 当前正在燃烧的燃料类型（用于UI显示）
    this.burningFuelId = null;
    
    // 烹饪进度（毫秒）
    this.cookingProgress = 0;
    
    // 烹饪时间（毫秒）
    this.cookingTime = 10000; // 10秒烹饪
    
    // 上次更新时间
    this.lastUpdateTime = Date.now();
    
    // 烹饪配方映射（原料 -> { output, time }）
    this.recipes = {
      raw_meat: { output: 'cooked_meat', time: 10000 },
      berry: { output: 'roasted_berry', time: 5000 },
    };
    
    // 燃料映射（燃料ID -> 燃烧时间毫秒）
    this.fuels = {
      wood: 30000,       // 木头 30秒
      stick: 10000,      // 树枝 10秒
      coal: 60000,       // 煤炭 60秒（如果有的话）
    };
    
    logger.debug(`🔥 创建烹饪站: ${this.id}`);
  }

  /**
   * 更新烹饪进度（每帧调用或定时调用）
   * @param {number} deltaTime - 经过的时间（毫秒）
   */
  update(deltaTime = null) {
    const now = Date.now();
    const dt = deltaTime !== null ? deltaTime : (now - this.lastUpdateTime);
    this.lastUpdateTime = now;
    
    // 如果没有食物或没有配方，不处理
    if (!this.foodSlot) {
      this.cookingProgress = 0;
      return;
    }
    
    const recipe = this.recipes[this.foodSlot.itemId];
    if (!recipe) {
      return;
    }
    
    // 【重要】先检查输出槽是否可以放入，避免浪费燃料
    if (this.outputSlot && this.outputSlot.itemId !== recipe.output) {
      // 输出槽有不同物品，暂停（不消耗燃料）
      return;
    }
    if (this.outputSlot && this.outputSlot.count >= 99) {
      // 输出槽满了（不消耗燃料）
      return;
    }
    
    // 检查是否有燃料
    if (this.fuelBurnTime <= 0) {
      // 燃烧结束，清除燃烧燃料标记
      this.burningFuelId = null;
      // 尝试消耗一个燃料
      if (!this.consumeFuel()) {
        // 没有燃料，暂停烹饪
        return;
      }
    }
    
    // 燃烧燃料
    this.fuelBurnTime -= dt;
    
    // 增加烹饪进度
    this.cookingProgress += dt;
    
    // 检查是否完成
    if (this.cookingProgress >= recipe.time) {
      this.completeCooking();
    }
  }

  /**
   * 消耗一个燃料
   * @returns {boolean} 是否成功消耗
   */
  consumeFuel() {
    if (!this.fuelSlot) return false;
    
    const burnTime = this.fuels[this.fuelSlot.itemId];
    if (!burnTime) return false;
    
    // 记录正在燃烧的燃料类型
    this.burningFuelId = this.fuelSlot.itemId;
    
    // 消耗一个燃料
    this.fuelSlot.count -= 1;
    if (this.fuelSlot.count <= 0) {
      this.fuelSlot = null;
    }
    
    // 设置燃烧时间
    this.fuelBurnTime = burnTime;
    this.maxFuelBurnTime = burnTime;
    
    logger.debug(`🔥 消耗燃料，燃烧时间: ${burnTime}ms`);
    return true;
  }

  /**
   * 完成烹饪
   */
  completeCooking() {
    if (!this.foodSlot) return;
    
    const recipe = this.recipes[this.foodSlot.itemId];
    if (!recipe) return;
    
    // 放入输出槽
    if (!this.outputSlot) {
      this.outputSlot = { itemId: recipe.output, count: 1 };
    } else if (this.outputSlot.itemId === recipe.output && this.outputSlot.count < 99) {
      this.outputSlot.count += 1;
    } else {
      // 无法放入，不完成
      return;
    }
    
    // 消耗一个食物
    this.foodSlot.count -= 1;
    if (this.foodSlot.count <= 0) {
      this.foodSlot = null;
    }
    
    // 重置烹饪进度
    this.cookingProgress = 0;
    
    logger.debug(`🔥 烹饪完成: ${recipe.output}`);
  }

  /**
   * 放入燃料
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {{success: boolean, added: number}}
   */
  addFuel(itemId, count) {
    if (!this.fuels[itemId]) {
      return { success: false, added: 0, reason: '此物品不能作为燃料' };
    }
    
    if (!this.fuelSlot) {
      this.fuelSlot = { itemId, count };
      return { success: true, added: count };
    }
    
    if (this.fuelSlot.itemId === itemId) {
      const canAdd = 99 - this.fuelSlot.count;
      const toAdd = Math.min(canAdd, count);
      this.fuelSlot.count += toAdd;
      return { success: toAdd > 0, added: toAdd, remaining: count - toAdd };
    }
    
    return { success: false, added: 0, reason: '燃料槽已有其他燃料' };
  }

  /**
   * 放入食物
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {{success: boolean, added: number}}
   */
  addFood(itemId, count) {
    if (!this.recipes[itemId]) {
      return { success: false, added: 0, reason: '此物品无法烹饪' };
    }
    
    if (!this.foodSlot) {
      this.foodSlot = { itemId, count };
      return { success: true, added: count };
    }
    
    if (this.foodSlot.itemId === itemId) {
      const canAdd = 99 - this.foodSlot.count;
      const toAdd = Math.min(canAdd, count);
      this.foodSlot.count += toAdd;
      return { success: toAdd > 0, added: toAdd, remaining: count - toAdd };
    }
    
    return { success: false, added: 0, reason: '食物槽已有其他食物' };
  }

  /**
   * 取走燃料
   * @returns {{itemId: string, count: number}|null}
   */
  takeFuel() {
    const fuel = this.fuelSlot;
    this.fuelSlot = null;
    return fuel;
  }

  /**
   * 取走食物
   * @returns {{itemId: string, count: number}|null}
   */
  takeFood() {
    const food = this.foodSlot;
    this.foodSlot = null;
    this.cookingProgress = 0;
    return food;
  }

  /**
   * 取走输出
   * @returns {{itemId: string, count: number}|null}
   */
  takeOutput() {
    const output = this.outputSlot;
    this.outputSlot = null;
    return output;
  }

  /**
   * 检查物品是否可烹饪
   * @param {string} itemId - 物品ID
   * @returns {boolean}
   */
  canCook(itemId) {
    return !!this.recipes[itemId];
  }

  /**
   * 检查物品是否是燃料
   * @param {string} itemId - 物品ID
   * @returns {boolean}
   */
  isFuel(itemId) {
    return !!this.fuels[itemId];
  }

  /**
   * 获取烹饪剩余时间（秒）
   * @returns {number}
   */
  getRemainingTime() {
    if (!this.foodSlot) return 0;
    
    const recipe = this.recipes[this.foodSlot.itemId];
    if (!recipe) return 0;
    
    return Math.max(0, (recipe.time - this.cookingProgress) / 1000);
  }

  /**
   * 获取烹饪进度百分比
   * @returns {number} 0-100
   */
  getCookingPercent() {
    if (!this.foodSlot) return 0;
    
    const recipe = this.recipes[this.foodSlot.itemId];
    if (!recipe) return 0;
    
    return Math.min(100, (this.cookingProgress / recipe.time) * 100);
  }

  /**
   * 获取燃料剩余百分比
   * @returns {number} 0-100
   */
  getFuelPercent() {
    if (this.maxFuelBurnTime <= 0) return 0;
    return Math.max(0, (this.fuelBurnTime / this.maxFuelBurnTime) * 100);
  }

  /**
   * 是否正在烹饪
   * @returns {boolean}
   */
  isCooking() {
    return this.foodSlot !== null && this.cookingProgress > 0 && this.fuelBurnTime > 0;
  }

  /**
   * 是否有燃料在燃烧
   * @returns {boolean}
   */
  isBurning() {
    return this.fuelBurnTime > 0;
  }

  /**
   * 获取状态
   * @returns {Object}
   */
  getState() {
    return {
      fuelSlot: this.fuelSlot ? { ...this.fuelSlot } : null,
      foodSlot: this.foodSlot ? { ...this.foodSlot } : null,
      outputSlot: this.outputSlot ? { ...this.outputSlot } : null,
      fuelBurnTime: this.fuelBurnTime,
      maxFuelBurnTime: this.maxFuelBurnTime,
      cookingProgress: this.cookingProgress,
      isCooking: this.isCooking(),
      isBurning: this.isBurning()
    };
  }
}
