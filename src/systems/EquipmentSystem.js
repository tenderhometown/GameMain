import { logger } from "../utils/logger.js";
import {
  getItem,
  isEquippable as checkEquippable,
  getEquipSlot as getItemEquipSlot,
  getItemEffects,
  getMaxDurability,  // 🔧 新增
  hasDurability,     // 🔧 新增
  getGatherDamage as getItemGatherDamage,  // 🔧 新增
  getAttackConfig,        // 🔧 新增
  BARE_HAND_ATTACK,       // 🔧 新增
} from "../data/RecipeData.js";

/**
 * 装备系统（重构版 - 使用物品数据库）
 * 管理装备槽位、物品效果、装备/卸下逻辑
 * 🔧 新设计：仅管理防具装备，工具/武器通过快捷栏使用
 */
export class EquipmentSystem {
  /**
   * @param {import('../components/Inventory.js').Inventory} inventory - 背包实例
   */
  constructor(inventory) {
    /** @type {import('../components/Inventory.js').Inventory} */
    this.inventory = inventory;

    /**
     * 🔧 槽位类型映射（仅防具）
     * 定义每种类型可以装备到哪些具体槽位
     * 注意：手持类（工具/武器）不再装备，直接使用快捷栏选中
     */
    this.slotTypeMapping = {
      // 护甲类只能装备到对应部位
      head:["head"],
      chest:["chest"],
      legs:["legs"],
      feet:["feet"],
    };

    logger.info("装备系统初始化完成（使用物品数据库）");
  }

  /**
   * 检查物品是否可装备
   * @param {string} itemId - 物品ID
   * @returns {boolean}
   */
  isEquippable(itemId) {
    return checkEquippable(itemId);
  }

  /**
   * 获取物品的槽位类型
   * @param {string} itemId - 物品ID
   * @returns {string|null}
   */
  getItemSlot(itemId) {
    return getItemEquipSlot(itemId);
  }

  /**
   * 🔧 检查物品是否可以装备到指定槽位（使用数据库）
   * @param {string} itemId - 物品ID
   * @param {string} targetSlot - 目标槽位名称（head, chest, legs, feet）
   * @returns {boolean}
   */
  canEquipToSlot(itemId, targetSlot) {
    // 🔧 从数据库获取物品信息
    const item = getItem(itemId);
    
    if (!item || ! item.equippable) {
      // 物品不存在或不可装备
      logger.debug(`物品 ${itemId} 不可装备`);
      return false;
    }

    const slotType = item.equipSlot; // 'hand', 'head', 'chest' 等
    const allowedSlots = this.slotTypeMapping[slotType];

    if (!allowedSlots) {
      logger.warn(`未知的槽位类型:${slotType}`);
      return false;
    }

    // 检查目标槽位是否在允许列表中
    const canEquip = allowedSlots.includes(targetSlot);

    logger.debug(
      `验证装备:${itemId}(${slotType}) → ${targetSlot}:${
        canEquip ? "✅" :"❌"
      }`
    );

    return canEquip;
  }



  equip(itemId) {
  // 1.从数据库获取物品信息
  const item = getItem(itemId);
  
  if (!item || !item.equippable) {
    logger.warn(`物品 ${itemId} 不可装备`);
    return false;
  }

  // 2.拒绝手持类物品（工具/武器应该放在快捷栏）
  const slotType = item.equipSlot;
  if (slotType === 'hand') {
    logger.warn(`${item.name} 是工具/武器，请将其放入快捷栏使用`);
    return false;
  }

  // 3.检查背包是否有这个物品
  if (this.inventory.getItemCount(itemId) <= 0) {
    logger.warn(`背包中没有 ${itemId}`);
    return false;
  }

  // 4.获取槽位类型并选择第一个可用槽位
  const allowedSlots = this.slotTypeMapping[slotType];

  if (!allowedSlots || allowedSlots.length === 0) {
    logger.warn(`物品 ${itemId} 没有可用的装备槽位`);
    return false;
  }

  const targetSlot = allowedSlots[0];

  // 4.如果槽位有旧装备，先卸下（放回背包，包含耐久度）
  const oldItem = this.inventory.equipment[targetSlot];
  if (oldItem) {
    logger.debug(`替换装备:${oldItem} → ${itemId}`);
    
    // 🔧 获取旧装备的耐久度
    const oldDurability = this.inventory.getEquipmentDurability(targetSlot);
    const durToSave = oldDurability ?  oldDurability.current :null;
    
    // 旧装备回背包（带耐久度）
    this.inventory.addItem(oldItem, 1, durToSave);
  }

  // 🔧 5.找到背包中的物品并获取其耐久度
  let itemDurability = null;
  const backpackSlots = this.inventory.getBackpackSlots();
  
  for (let i = 0; i < backpackSlots.length; i++) {
    const slot = backpackSlots[i];
    if (slot && slot.itemId === itemId) {
      itemDurability = slot.durability || getMaxDurability(itemId);
      break;
    }
  }

  // 6.从背包移除物品
  this.inventory.removeItem(itemId, 1);

  // 7.装备到槽位
  this.inventory.equipItem(targetSlot, itemId);
  
  // 🔧 8.设置装备耐久度
  if (itemDurability !== null) {
    this.inventory.setEquipmentDurability(targetSlot, itemDurability);
  }

  logger.info(`✅ 装备成功:${itemId} → ${targetSlot} (耐久:${itemDurability})`);
  return true;
}

/**
 * 🔧 使用当前手持工具（消耗耐久度）- 从快捷栏
 * @param {number} amount - 消耗量（默认1）
 * @returns {{success:boolean, broken:boolean, remaining:number, itemId:string}}
 */
useCurrentHandTool(amount = 1) {
  const slot = this.inventory.getCurrentHandSlot();
  if (!slot) {
    return { success: false, broken: false, remaining: 0, itemId: null };
  }

  const itemId = slot.itemId;
  const item = getItem(itemId);
  
  // 检查是否有耐久度
  if (!hasDurability(itemId)) {
    return { success: true, broken: false, remaining: -1, itemId };
  }

  // 初始化耐久度
  if (slot.durability === undefined) {
    slot.durability = getMaxDurability(itemId);
  }

  // 消耗耐久度
  slot.durability -= amount;
  const remaining = slot.durability;

  if (slot.durability <= 0) {
    // 工具损坏，从快捷栏移除
    const index = this.inventory.selectedHotbarIndex;
    this.inventory.hotbarSlots[index] = null;
    
    // 触发装备损坏事件
    document.dispatchEvent(new CustomEvent('equipmentBroken', {
      detail:{
        slotName: 'hotbar',
        itemId,
        timestamp:Date.now()
      }
    }));
    
    logger.info(`⚠️ 工具损坏:${itemId}`);
    return { success: true, broken: true, remaining: 0, itemId };
  }

  return { success: true, broken: false, remaining, itemId };
}

/**
 * 🔧 获取当前手持物品的耐久度
 * @returns {number}
 */
getCurrentHandDurability() {
  const slot = this.inventory.getCurrentHandSlot();
  return slot?.durability || 0;
}

/**
 * 🔧 获取当前手持物品的攻击配置（从快捷栏）
 * @returns {Object} 攻击配置
 */
getCurrentAttackConfig() {
  const handItem = this.inventory.getCurrentHandItem();
  
  if (!handItem) {
    // 空手
    return BARE_HAND_ATTACK;
  }
  
  return getAttackConfig(handItem);
}

/**
 * 🔧 获取当前手持武器的攻击伤害（从快捷栏）
 * @returns {number}
 */
getAttackDamage() {
  const handItem = this.inventory.getCurrentHandItem();
  
  if (!handItem) {
    return BARE_HAND_ATTACK.damage;
  }
  
  const effects = getItemEffects(handItem);
  return effects.damage || BARE_HAND_ATTACK.damage;
}




  /**
   * 卸下装备
   * @param {string} slotName - 装备槽名称
   * @returns {boolean} 是否成功
   */
  unequip(slotName) {
    const itemId = this.inventory.equipment[slotName];

    if (!itemId) {
      logger.warn(`槽位 ${slotName} 没有装备`);
      return false;
    }

    // 检查背包是否已满
    const capacityInfo = this.inventory.getCapacityInfo();
    if (capacityInfo.used >= capacityInfo.total) {
      logger.warn("❌ 背包已满，无法卸下装备");
      return false;
    }

    // 放回背包
    this.inventory.addItem(itemId, 1);

    // 清空槽位
    this.inventory.unequipItem(slotName);

    logger.info(`✅ 卸下成功:${itemId} 从 ${slotName}`);
    return true;
  }

  /**
   * 获取当前所有装备的总效果（包括手持武器）
   * @returns {Object} 效果对象
   */
  getCurrentEffects() {
    const totalEffects = {
      woodGatherSpeed:1.0,
      stoneGatherSpeed:1.0,
      damage:0,
      defense:0,
    };

    // 1. 遍历所有装备槽（护甲等）
    for (const [slotName, itemId] of Object.entries(this.inventory.equipment)) {
      if (itemId) {
        const effects = getItemEffects(itemId);

        // 累加效果
        for (const [key, value] of Object.entries(effects)) {
          if (key.includes("Speed")) {
            // 速度类效果：乘法
            totalEffects[key] = (totalEffects[key] || 1.0) * value;
          } else {
            // 其他效果：加法
            totalEffects[key] = (totalEffects[key] || 0) + value;
          }
        }
      }
    }

    // 2. 🔧 加上手持武器的效果（从快捷栏）
    const handItemId = this.getCurrentHandItemId();
    if (handItemId) {
      const handEffects = getItemEffects(handItemId);
      
      for (const [key, value] of Object.entries(handEffects)) {
        if (key.includes("Speed")) {
          totalEffects[key] = (totalEffects[key] || 1.0) * value;
        } else {
          totalEffects[key] = (totalEffects[key] || 0) + value;
        }
      }
    }

    return totalEffects;
  }

  /**
   * 获取指定资源类型的采集速度加成
   * @param {string} resourceType - 资源类型（'wood' | 'stone'）
   * @returns {number} 采集速度倍率
   */
  getGatherSpeed(resourceType) {
    const effects = this.getCurrentEffects();

    if (resourceType === "wood") {
      return effects.woodGatherSpeed;
    } else if (resourceType === "stone") {
      return effects.stoneGatherSpeed;
    }

    return 1.0; // 默认无加成
  }

  /**
   * 获取物品效果描述（用于UI显示）
   * @param {string} itemId - 物品ID
   * @returns {string[]} 效果描述数组
   */
  getItemEffectDescription(itemId) {
    const effects = getItemEffects(itemId); // 🔧 从数据库读取
    if (! effects || Object.keys(effects).length === 0) return [];

    const descriptions = [];

    // 木材采集速度
    if (effects.woodGatherSpeed && effects.woodGatherSpeed > 1.0) {
      const bonus = ((effects.woodGatherSpeed - 1) * 100).toFixed(0);
      descriptions.push(`木材采集速度 +${bonus}%`);
    }

    // 石头采集速度
    if (effects.stoneGatherSpeed && effects.stoneGatherSpeed > 1.0) {
      const bonus = ((effects.stoneGatherSpeed - 1) * 100).toFixed(0);
      descriptions.push(`石头采集速度 +${bonus}%`);
    }

    // 攻击伤害
    if (effects.damage && effects.damage > 0) {
      descriptions.push(`攻击伤害 +${effects.damage}`);
    }

    // 防御
    if (effects.defense && effects.defense > 0) {
      descriptions.push(`防御 +${effects.defense}`);
    }

    return descriptions;
  }

  /**
   * 🔧 获取物品完整信息（从数据库）
   * @param {string} itemId - 物品ID
   * @returns {Object|null}
   */
  getItemInfo(itemId) {
    return getItem(itemId);
  }

  /**
   * 获取槽位当前装备的物品ID
   * @param {string} slotName - 槽位名称
   * @returns {string|null}
   */
  getEquippedItem(slotName) {
    return this.inventory.equipment[slotName] || null;
  }

  /**
   * 检查槽位是否为空
   * @param {string} slotName - 槽位名称
   * @returns {boolean}
   */
  isSlotEmpty(slotName) {
    return !this.inventory.equipment[slotName];
  }

  /**
   * 获取所有已装备的物品
   * @returns {Object.<string, string>} 槽位 → 物品ID 映射
   */
  getAllEquippedItems() {
    const equipped = {};
    for (const [slotName, itemId] of Object.entries(this.inventory.equipment)) {
      if (itemId) {
        equipped[slotName] = itemId;
      }
    }
    return equipped;
  }

  /**
   * 卸下所有装备
   * @returns {boolean} 是否成功
   */
  unequipAll() {
    const slots = Object.keys(this.inventory.equipment);
    let success = true;

    for (const slotName of slots) {
      if (this.inventory.equipment[slotName]) {
        if (!this.unequip(slotName)) {
          success = false;
          logger.warn(`无法卸下 ${slotName} 的装备（可能背包已满）`);
        }
      }
    }

    return success;
  }

/**
 * 🔧 获取当前手持工具的采集伤害（从快捷栏）
 * @param {string} resourceType - 资源类型（'wood', 'stone'等）
 * @returns {number} 采集伤害
 */
getGatherDamage(resourceType = 'default') {
  const handItem = this.inventory.getCurrentHandItem();
  
  if (!handItem) {
    // 空手采集：基础伤害
    const bareHandDamage = {
      wood:3,    // 空手砍树很慢
      stone:1,   // 空手挖石头更慢
      default:2,
    };
    return bareHandDamage[resourceType] || bareHandDamage.default;
  }
  
  // 使用工具
  const damage = getItemGatherDamage(handItem, resourceType);
  
  if (damage === 0) {
    // 工具没有采集伤害属性，使用默认
    return 5;
  }
  
  return damage;
}

/**
 * 🔧 检查当前是否手持工具（从快捷栏）
 * @returns {boolean}
 */
hasToolEquipped() {
  const handItem = this.inventory.getCurrentHandItem();
  if (!handItem) return false;
  
  const item = getItem(handItem);
  return item && (item.type === 'tool' || item.type === 'weapon');
}

/**
 * 🔧 获取当前手持物品的ID（从快捷栏）
 * @returns {string|null}
 */
getCurrentHandItemId() {
  return this.inventory.getCurrentHandItem();
}

  /**
   * 获取装备系统状态（用于调试）
   * @returns {Object}
   */
  getSystemStatus() {
    return {
      equipment:this.inventory.equipment,
      effects:this.getCurrentEffects(),
      equippedCount:Object.values(this.inventory.equipment).filter((id) => id)
        .length,
      slotTypeMapping:this.slotTypeMapping,
    };
  }

  /**
   * 重置装备系统（用于测试）
   */
  reset() {
    for (const slotName in this.inventory.equipment) {
      this.inventory.equipment[slotName] = null;
    }
    logger.info("装备系统已重置");
  }

  /**
   * 清理装备系统资源
   */
  dispose() {
    this.inventory = null;
    this.slotTypeMapping = null;
    logger.info('装备系统已清理');
  }
}