import { Color3 } from '@babylonjs/core/Maths/math.color';

/**
 * 建筑物数据
 * 定义所有可建造的建筑物
 */

export const BUILDINGS = {
  // ========== 基础结构 ==========
  wooden_floor: {
    id: 'wooden_floor',
    name: '木地板',
    icon: '🟫',
    category: 'foundation',
    description: '基础地板，可在上面建造其他建筑',
    size: { x: 2, y: 0.2, z: 2 },
    color: new Color3(0.55, 0.35, 0.2),
    recipe: { wood: 3 },
  },

  wooden_wall: {
    id: 'wooden_wall',
    name: '木墙',
    icon: '🧱',
    category: 'structure',
    description: '基础墙壁，用于围建房屋',
    size: { x: 2, y: 3, z: 0.2 },
    color: new Color3(0.5, 0.32, 0.18),
    recipe: { wood: 5 },
  },

  wooden_door: {
    id: 'wooden_door',
    name: '木门',
    icon: '🚪',
    category: 'structure',
    description: '可开关的门',
    size: { x: 1, y: 2.5, z: 0.2 },
    color: new Color3(0.45, 0.28, 0.15),
    recipe: { wood: 8 },
    interactable: true,
    interactType: 'door',
  },

  wooden_fence: {
    id: 'wooden_fence',
    name: '木栅栏',
    icon: '🪵',
    category: 'defense',
    description: '简单的防御围栏',
    size: { x: 2, y: 1.5, z: 0.15 },
    color: new Color3(0.5, 0.35, 0.2),
    recipe: { wood: 3 },
  },

  // ========== 设施 ==========
  workbench: {
    id: 'workbench',
    name: '工作台',
    icon: '🔨',
    category: 'facility',
    description: '制作台，解锁更多配方',
    size: { x: 1.5, y: 1, z: 1 },
    color: new Color3(0.6, 0.4, 0.25),
    recipe: { wood: 10, stone: 5 },
    interactable: true,
    interactType: 'workbench',
  },

  campfire: {
    id: 'campfire',
    name: '篝火',
    icon: '🔥',
    category: 'facility',
    description: '用于烹饪食物和照明',
    size: { x: 1, y: 0.5, z: 1 },
    color: new Color3(0.3, 0.2, 0.15),
    recipe: { wood: 5, stone: 3 },
    interactable: true,
    interactType: 'campfire',
  },

  chest: {
    id: 'chest',
    name: '箱子',
    icon: '📦',
    category: 'facility',
    description: '存储30格物品',
    size: { x: 1, y: 0.8, z: 0.6 },
    color: new Color3(0.5, 0.35, 0.2),
    recipe: { wood: 12 },
    interactable: true,
    interactType: 'storage',
    storageSlots: 30,
  },

  bed: {
    id: 'bed',
    name: '床',
    icon: '🛏️',
    category: 'facility',
    description: '用于休息和跳过夜晚',
    size: { x: 1, y: 0.6, z: 2 },
    color: new Color3(0.6, 0.3, 0.3),
    recipe: { wood: 15, fiber: 20 },
    interactable: true,
    interactType: 'sleep',
  },

  // ========== 防御 ==========
  spike_trap: {
    id: 'spike_trap',
    name: '尖刺陷阱',
    icon: '⚠️',
    category: 'defense',
    description: '对踩到的敌人造成伤害',
    size: { x: 1, y: 0.3, z: 1 },
    color: new Color3(0.4, 0.35, 0.3),
    recipe: { wood: 5, stone: 3 },
    trapDamage: 15,
  },
};

/**
 * 获取建筑信息
 * @param {string} buildingId - 建筑ID
 * @returns {Object|null}
 */
export function getBuilding(buildingId) {
  return BUILDINGS[buildingId] || null;
}

/**
 * 获取分类的建筑列表
 * @param {string} category - 分类（foundation, structure, facility, defense）
 * @returns {Array}
 */
export function getBuildingsByCategory(category) {
  return Object.values(BUILDINGS).filter(b => b.category === category);
}

/**
 * 获取所有建筑分类
 * @returns {Array}
 */
export function getBuildingCategories() {
  return [
    { id: 'foundation', name: '地基', icon: '🏗️' },
    { id: 'structure', name: '结构', icon: '🧱' },
    { id: 'facility', name: '设施', icon: '🔨' },
    { id: 'defense', name: '防御', icon: '🛡️' },
  ];
}

/**
 * 检查是否有足够材料建造
 * @param {string} buildingId - 建筑ID
 * @param {import('../components/Inventory.js').Inventory} inventory - 背包
 * @returns {boolean}
 */
export function canAffordBuilding(buildingId, inventory) {
  const building = BUILDINGS[buildingId];
  if (!building || !building.recipe) return true;
  
  for (const [itemId, count] of Object.entries(building.recipe)) {
    if (!inventory.hasItem(itemId, count)) {
      return false;
    }
  }
  
  return true;
}
