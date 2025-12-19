import { 
  getMaxStackSize as getItemMaxStackSize,
  getMaxDurability,  // 🔧 新增
  hasDurability      // 🔧 新增
} from "../data/RecipeData.js";
import { logger } from "../utils/logger.js";

/**
 * 背包组件（重构版 - 基于格子系统）
 * 管理玩家的物品、装备、快捷栏
 * 🔧 新设计：背包和快捷栏都使用独立格子，不再自动合并物品
 */
export class Inventory {
  /**
   * @param {number} backpackCapacity - 背包容量
   * @param {number} hotbarCapacity - 快捷栏容量
   */
  constructor(backpackCapacity = 40, hotbarCapacity = 6) {
    /** @type {number} 背包容量 */
    this.backpackCapacity = backpackCapacity;

    /** @type {number} 快捷栏容量 */
    this.hotbarCapacity = hotbarCapacity;

    /**
     * 🔧 背包槽位（40个独立格子）
     * @type {Array<{itemId: string, count: number}|null>}
     */
    this.backpackSlots = new Array(backpackCapacity).fill(null);

    /**
     * 🔧 快捷栏槽位（5个独立格子）
     * @type {Array<{itemId: string, count: number}|null>}
     */
    this.hotbarSlots = new Array(hotbarCapacity).fill(null);

    /** @type {number} 当前选中的快捷栏索引 */
    this.selectedHotbarIndex = 0;

    /** @type {Object.<string, string|null>} 装备槽（仅防具，不包含主副手） */
    this.equipment = {
      head: null,
      chest: null,
      legs: null,
      feet: null,
    };

    /** @type {Object.<string, number>} 🔧 装备耐久度存储 */
    this.equipmentDurability = {};

    logger.info("背包初始化完成（新格子系统）");
  }

  /**
   * 🔧 获取所有物品汇总（动态计算，向后兼容）
   * @returns {Object.<string, number>}
   */
  get items() {
    const result = {};

    // 汇总背包格子
    this.backpackSlots.forEach((slot) => {
      if (slot) {
        result[slot.itemId] = (result[slot.itemId] || 0) + slot.count;
      }
    });

    // 汇总快捷栏格子
    this.hotbarSlots.forEach((slot) => {
      if (slot) {
        result[slot.itemId] = (result[slot.itemId] || 0) + slot.count;
      }
    });

    return result;
  }

  /**
   * 🔧 获取物品的最大堆叠数量
   * @param {string} itemId - 物品ID
   * @returns {number}
   */
  getMaxStackSize(itemId) {
    return getItemMaxStackSize(itemId);
  }

/**
 * 🔧 添加物品（智能分配到格子，支持耐久度）
 * @param {string} itemId - 物品ID
 * @param {number} count - 数量
 * @param {number|null} durability - 耐久度（可选，默认为最大耐久度）
 * @returns {boolean} 是否成功
 */
addItem(itemId, count = 1, durability = null) {
  if (count <= 0) {
    logger.warn(`添加物品数量无效: ${count}`);
    return false;
  }

  const maxStack = this.getMaxStackSize(itemId);
  const maxDur = getMaxDurability(itemId);
  let remaining = count;

  // 🔧 如果物品有耐久度，设置初始耐久度
  const itemDurability = durability !== null ? durability : maxDur;

  // 🔧 有耐久度的物品不堆叠（每个独立存储）
  if (maxDur !== null) {
    // 每个工具/武器单独占一格
    for (let i = 0; i < remaining; i++) {
      // 找空格子
      const emptyIndex = this.backpackSlots.findIndex(slot => slot === null);
      if (emptyIndex === -1) {
        logger.warn(`背包已满，无法添加:  ${itemId}`);
        return false;
      }
      
      this.backpackSlots[emptyIndex] = {
        itemId,
        count: 1,
        durability: itemDurability  // 🔧 存储耐久度
      };
      logger.debug(`放入背包格子${emptyIndex}:  ${itemId} (耐久:  ${itemDurability}/${maxDur})`);
    }
    
    return true;
  }

  // 无耐久度的物品：正常堆叠逻辑（保持原有逻辑）
  // 1.先尝试堆叠到背包已有的同类格子
  for (let i = 0; i < this.backpackSlots.length; i++) {
    const slot = this.backpackSlots[i];
    if (slot && slot.itemId === itemId && slot.count < maxStack) {
      const canAdd = Math.min(remaining, maxStack - slot.count);
      slot.count += canAdd;
      remaining -= canAdd;
      logger.debug(`堆叠到背包格子${i}: +${canAdd}, 剩余${remaining}`);
      if (remaining === 0) {
        return true;
      }
    }
  }

  // 2.找背包空格子
  for (let i = 0; i < this.backpackSlots.length; i++) {
    if (! this.backpackSlots[i]) {
      const toAdd = Math.min(remaining, maxStack);
      this.backpackSlots[i] = { itemId, count: toAdd };
      remaining -= toAdd;
      logger.debug(`放入背包格子${i}: ${itemId} x${toAdd}`);
      if (remaining === 0) {
        return true;
      }
    }
  }

  // 3.如果还有剩余，说明背包满了
  if (remaining > 0) {
    logger.warn(`背包已满，无法添加全部物品。已添加${count - remaining}，剩余${remaining}`);
    return false;
  }

  return true;
}
 



  /**
   * 🔧 移除物品（从所有格子中查找并移除）
   * @param {string} itemId - 物品ID
   * @param {number} count - 数量
   * @returns {boolean} 是否成功
   */
  removeItem(itemId, count = 1) {
    if (count <= 0) {
      logger.warn(`移除物品数量无效: ${count}`);
      return false;
    }

    // 检查是否有足够的物品
    const totalCount = this.getItemCount(itemId);
    if (totalCount < count) {
      logger.warn(
        `物品 ${itemId} 数量不足，当前: ${totalCount}, 需要: ${count}`
      );
      return false;
    }

    let remaining = count;

    // 从背包格子中移除
    for (let i = 0; i < this.backpackSlots.length; i++) {
      const slot = this.backpackSlots[i];
      if (slot && slot.itemId === itemId) {
        const toRemove = Math.min(remaining, slot.count);
        slot.count -= toRemove;
        remaining -= toRemove;

        if (slot.count === 0) {
          this.backpackSlots[i] = null;
          logger.debug(`背包格子${i}已清空`);
        }

        if (remaining === 0) {
          return true;
        }
      }
    }

    // 从快捷栏格子中移除
    for (let i = 0; i < this.hotbarSlots.length; i++) {
      const slot = this.hotbarSlots[i];
      if (slot && slot.itemId === itemId) {
        const toRemove = Math.min(remaining, slot.count);
        slot.count -= toRemove;
        remaining -= toRemove;

        if (slot.count === 0) {
          this.hotbarSlots[i] = null;
          logger.debug(`快捷栏格子${i}已清空`);
        }

        if (remaining === 0) {
          return true;
        }
      }
    }

    return remaining === 0;
  }

  /**
   * 获取物品总数量
   * @param {string} itemId - 物品ID
   * @returns {number}
   */
  getItemCount(itemId) {
    return this.items[itemId] || 0;
  }

  /**
   * 检查是否有物品
   * @param {string} itemId - 物品ID
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.getItemCount(itemId) > 0;
  }

  /**
   * 获取所有物品（向后兼容）
   * @returns {Object.<string, number>}
   */
  getAllItems() {
    return this.items;
  }

  /**
   * 🔧 获取背包所有格子
   * @returns {Array<{itemId: string, count: number}|null>}
   */
  getBackpackSlots() {
    return this.backpackSlots;
  }

  /**
   * 🔧 获取快捷栏所有格子
   * @returns {Array<{itemId: string, count: number}|null>}
   */
  getHotbarSlots() {
    return this.hotbarSlots;
  }

  /**
   * 🔧 设置背包格子
   * @param {number} slotIndex - 格子索引
   * @param {{itemId: string, count: number}|null} slotData - 格子数据
   */
  setBackpackSlot(slotIndex, slotData) {
    if (slotIndex < 0 || slotIndex >= this.backpackSlots.length) {
      logger.warn(`无效的背包格子索引: ${slotIndex}`);
      return;
    }
    this.backpackSlots[slotIndex] = slotData;
  }

  /**
   * 🔧 设置快捷栏格子
   * @param {number} slotIndex - 格子索引
   * @param {{itemId: string, count: number}|null} slotData - 格子数据
   */
  setHotbarSlot(slotIndex, slotData) {
    if (slotIndex < 0 || slotIndex >= this.hotbarSlots.length) {
      logger.warn(`无效的快捷栏格子索引: ${slotIndex}`);
      return;
    }
    this.hotbarSlots[slotIndex] = slotData;
  }

  /**
   * 🔧 交换两个背包格子
   * @param {number} index1 - 格子1索引
   * @param {number} index2 - 格子2索引
   */
  swapBackpackSlots(index1, index2) {
    if (
      index1 < 0 ||
      index1 >= this.backpackSlots.length ||
      index2 < 0 ||
      index2 >= this.backpackSlots.length
    ) {
      logger.warn(`无效的背包格子索引: ${index1} 或 ${index2}`);
      return;
    }

    [this.backpackSlots[index1], this.backpackSlots[index2]] = [
      this.backpackSlots[index2],
      this.backpackSlots[index1],
    ];

    logger.debug(`交换背包格子: [${index1}] ⇄ [${index2}]`);
  }

  /**
   * 🔧 交换两个快捷栏格子
   * @param {number} index1 - 格子1索引
   * @param {number} index2 - 格子2索引
   */
  swapHotbarSlots(index1, index2) {
    if (
      index1 < 0 ||
      index1 >= this.hotbarSlots.length ||
      index2 < 0 ||
      index2 >= this.hotbarSlots.length
    ) {
      logger.warn(`无效的快捷栏格子索引: ${index1} 或 ${index2}`);
      return;
    }

    [this.hotbarSlots[index1], this.hotbarSlots[index2]] = [
      this.hotbarSlots[index2],
      this.hotbarSlots[index1],
    ];

    logger.debug(`交换快捷栏格子: [${index1}] ⇄ [${index2}]`);
  }

  // === 装备系统（保持不变）===

  equipItem(slotName, itemId) {
    if (!this.equipment.hasOwnProperty(slotName)) {
      logger.warn(`无效的装备槽位: ${slotName}`);
      return;
    }
    this.equipment[slotName] = itemId;
    logger.debug(`装备: ${itemId} → ${slotName}`);
  }

  unequipItem(slotName) {
    if (!this.equipment.hasOwnProperty(slotName)) {
      logger.warn(`无效的装备槽位: ${slotName}`);
      return;
    }
    this.equipment[slotName] = null;
    logger.debug(`卸下装备: ${slotName}`);
  }

  getEquippedItem(slotName) {
    return this.equipment[slotName] || null;
  }

  getAllEquipment() {
    return this.equipment;
  }

  setEquipmentSlot(slotName, itemId) {
    if (!this.equipment.hasOwnProperty(slotName)) {
      logger.warn(`无效的装备槽位: ${slotName}`);
      return false;
    }
    this.equipment[slotName] = itemId;
    logger.debug(`设置装备槽[${slotName}]: ${itemId}`);
    return true;
  }

  // === 快捷栏选择（保持不变）===

  selectHotbarSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.hotbarSlots.length) {
      logger.warn(`无效的快捷栏索引: ${slotIndex}`);
      return;
    }
    this.selectedHotbarIndex = slotIndex;
    logger.debug(`选择快捷栏: ${slotIndex + 1}`);
  }

  getSelectedHotbarIndex() {
    return this.selectedHotbarIndex;
  }
  
  getSelectedHotbarSlot() {
    return this.hotbarSlots[this.selectedHotbarIndex];
  }

  getSelectedHotbarItem() {
    const slot = this.hotbarSlots[this.selectedHotbarIndex];
    return slot ? slot.itemId : null;
  }

  /**
   * 获取当前手持物品ID（用于采集、战斗等）
   * @returns {string|null}
   */
  getCurrentHandItem() {
    return this.getSelectedHotbarItem();
  }

  /**
   * 获取当前手持物品的完整槽位数据（包含count、durability等）
   * @returns {{itemId: string, count: number, durability?: number}|null}
   */
  getCurrentHandSlot() {
    return this.hotbarSlots[this.selectedHotbarIndex];
  }

  // === 向后兼容的方法 ===

  getHotbar() {
    // 返回物品ID数组（向后兼容）
    return this.hotbarSlots.map((slot) => (slot ? slot.itemId : null));
  }

  getHotbarSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.hotbarSlots.length) {
      return null;
    }
    return this.hotbarSlots[slotIndex];
  }
  
  getHotbarItemId(slotIndex) {
    const slot = this.getHotbarSlot(slotIndex);
    return slot ? slot.itemId : null;
  }

  // === 清空方法 ===

  clear() {
    this.backpackSlots = new Array(this.backpackCapacity).fill(null);
    logger.info("背包已清空");
  }

  clearEquipment() {
    for (const slotName in this.equipment) {
      this.equipment[slotName] = null;
    }
    logger.info("装备已清空");
  }

  clearHotbar() {
    this.hotbarSlots = new Array(this.hotbarCapacity).fill(null);
    this.selectedHotbarIndex = 0;
    logger.info("快捷栏已清空");
  }

  reset() {
    this.clear();
    this.clearEquipment();
    this.clearHotbar();
    logger.info("背包已重置");
  }


// === 🔧 耐久度系统 ===

/**
 * 🔧 消耗装备耐久度（仅用于防具）
 * @param {string} slotName - 装备槽名称（head, chest, legs, feet）
 * @param {number} amount - 消耗量（默认1）
 * @returns {{success: boolean, broken: boolean, remaining: number}} 结果
 */
consumeEquipmentDurability(slotName, amount = 1) {
  const itemId = this.equipment[slotName];
  
  if (!itemId) {
    return { success: false, broken: false, remaining: 0, message: '槽位为空' };
  }

  const maxDur = getMaxDurability(itemId);
  if (maxDur === null) {
    // 物品没有耐久度，不消耗
    return { success: true, broken: false, remaining: -1, message: '无耐久度' };
  }

  // 🔧 查找装备的耐久度（存储在哪里？）
  // 装备槽目前只存 itemId，我们需要单独存储装备耐久度
  if (!this.equipmentDurability) {
    this.equipmentDurability = {};
  }

  // 初始化耐久度（如果没有）
  if (this.equipmentDurability[slotName] === undefined) {
    this.equipmentDurability[slotName] = maxDur;
  }

  // 消耗耐久度
  this.equipmentDurability[slotName] -= amount;
  const remaining = this.equipmentDurability[slotName];

  logger.debug(`装备耐久消耗: ${itemId} -${amount}, 剩余 ${remaining}/${maxDur}`);

  // 检查是否损坏
  if (remaining <= 0) {
    // 🔧 装备损坏！
    logger.info(`⚠️ ${itemId} 已损坏！`);
    
    // 清空装备槽
    this.equipment[slotName] = null;
    delete this.equipmentDurability[slotName];
    
    return { 
      success: true, 
      broken: true, 
      remaining: 0, 
      itemId,
      message: `${itemId} 已损坏` 
    };
  }

  return { 
    success:  true, 
    broken: false, 
    remaining, 
    maxDurability: maxDur,
    itemId 
  };
}

/**
 * 🔧 获取装备当前耐久度
 * @param {string} slotName - 装备槽名称
 * @returns {{current: number, max: number}|null}
 */
getEquipmentDurability(slotName) {
  const itemId = this.equipment[slotName];
  
  if (!itemId) {
    return null;
  }

  const maxDur = getMaxDurability(itemId);
  if (maxDur === null) {
    return null;  // 物品没有耐久度
  }

  if (!this.equipmentDurability) {
    this.equipmentDurability = {};
  }

  // 初始化耐久度（如果没有）
  if (this.equipmentDurability[slotName] === undefined) {
    this.equipmentDurability[slotName] = maxDur;
  }

  return {
    current: this.equipmentDurability[slotName],
    max: maxDur,
    percent: (this.equipmentDurability[slotName] / maxDur * 100).toFixed(0)
  };
}

/**
 * 🔧 设置装备耐久度（用于装备时同步）
 * @param {string} slotName - 装备槽名称
 * @param {number} durability - 耐久度
 */
setEquipmentDurability(slotName, durability) {
  if (!this.equipmentDurability) {
    this.equipmentDurability = {};
  }
  this.equipmentDurability[slotName] = durability;
}





  // === 状态查询 ===

  getCapacityInfo() {
    const used = this.backpackSlots.filter((slot) => slot !== null).length;
    return {
      used,
      total: this.backpackCapacity,
      percentage: ((used / this.backpackCapacity) * 100).toFixed(1),
    };
  }

  isFull() {
    return !this.backpackSlots.some((slot) => slot === null);
  }

  getStatus() {
    return {
      backpackSlots: this.backpackSlots,
      hotbarSlots: this.hotbarSlots,
      equipment: this.equipment,
      selectedHotbarIndex: this.selectedHotbarIndex,
      items: this.items,
      capacity: this.getCapacityInfo(),
    };
  }
}
