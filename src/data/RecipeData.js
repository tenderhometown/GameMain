/**
 * 物品数据库（重构版 - Factorio 风格）
 * 游戏中所有物品的统一数据源
 * 🔧 配方直接集成在物品数据内
 * 🔧 采用 Factorio 风格：type 自动映射到分类
 */

// ========== 空手攻击配置（默认值）==========
export const BARE_HAND_ATTACK = {
  attackType:'melee',
  detectShape:'sector',
  attackRange:1.5,
  attackAngle:90,
  attackCooldown:0.8,
  maxTargets:1,
  penetration:0,
  penetrationDamageDecay:0,
  knockback:0.5,
  damage:5,
};

// ========== 分类元数据（Factorio 风格）==========
const CATEGORY_META = {
  resource:{
    name:'资源',
    icon:'🌿',
    order:'a',
    description:'基础原始资源'
  },
  material:{
    name:'材料',
    icon:'🧱',
    order:'b',
    description:'用于制作的材料'
  },
  tool:{
    name:'工具',
    icon:'🔧',
    order:'c',
    description:'采集工具'
  },
  weapon:{
    name:'武器',
    icon:'⚔️',
    order:'d',
    description:'战斗武器'
  },
  armor:{
    name:'装备',
    icon:'🛡️',
    order:'e',
    description:'防护装备'
  },
  facility:{
    name:'建筑',
    icon:'🏗️',
    order:'f',
    description:'建筑设施'
  }
};

/**
 * 物品数据库
 */
export const ITEMS = {
  // ========== 基础资源（不可合成）==========
  wood:{
    id:'wood',
    name:'木材',
    icon:'🪵',
    type:'resource',
    description:'基础建筑材料，通过砍伐树木获得',
    stackSize:64,
  },
  stone:{
    id:'stone',
    name:'石头',
    icon:'🪨',
    type:'resource',
    description:'坚硬的石材，通过采集岩石获得',
    stackSize:64,
  },
  fiber:{
    id:'fiber',
    name:'纤维',
    icon:'🌾',
    type:'resource',
    description:'柔软的纤维，通过采集植物获得',
    stackSize:64,
  },
  berry:{
    id:'berry',
    name:'浆果',
    icon:'🫐',
    type:'resource',
    description:'浆果，一种好吃的东西，你可能需要找到浆果丛才能收获到',
    stackSize:64,
    edible:true,
    hungerRestore:5,
  },
  roasted_berry:{
    id:'roasted_berry',
    name:'烤浆果',
    icon:'🍇',
    type:'material',
    description:'烘烤过的浆果，香甜可口，恢复效果更好',
    stackSize:64,
    edible:true,
    hungerRestore:10,
    buffOnConsume:'well_fed',
    recipe:{
      inputs:{ berry:2, wood:1 },
      cookingOnly:true,  // 仅在烹饪界面可制作
    },
  },
  raw_meat:{
    id:'raw_meat',
    name:'生肉',
    icon:'🥩',
    type:'resource',
    description:'生肉可是一种不错的蛋白质物品，当然做熟了更好吃。生吃有10%几率中毒！',
    stackSize:64,
    edible:true,
    hungerRestore:10,
    poisonChance:0.1,
  },
  cooked_meat:{
    id:'cooked_meat',
    name:'熟肉',
    icon:'🍖',
    type:'material',
    description:'烹饪过的肉类，美味且营养丰富，还能恢复少量生命',
    stackSize:64,
    edible:true,
    hungerRestore:30,
    healthRestore:5,
    buffOnConsume:'well_fed',
    recipe:{
      inputs:{ raw_meat:1, wood:1 },
      cookingOnly:true,  // 仅在烹饪界面可制作
    },
  },
  iron_ore:{
    id:'iron_ore',
    name:'铁矿石',
    icon:'⚙️',
    type:'resource',
    description:'铁矿石，一种不错的好东西，冶炼之后似乎能做更多工具',
    stackSize:64,
  },
  copper_ore:{
    id:'copper_ore',
    name:'铜矿石',
    icon:'🟠',
    type:'resource',
    description:'铜矿石，虽然没有铁矿石更好，但是也是不错的',
    stackSize:64,
  },
  coal:{
    id:'coal',
    name:'煤炭',
    icon:'⚫',
    type:'resource',
    description:'煤炭，一种用来引火的矿物',
    stackSize:64,
  },
  leather:{
    id:'leather',
    name:'皮革',
    icon:'🟫',
    type:'resource',
    description:'皮革，动物能掉落，可以制作防具',
    stackSize:64,
  },

  // ========== 材料（可合成）==========
  wooden_stick:{
    id:'wooden_stick',
    name:'木棒',
    icon:'🥢',
    type:'material',
    description:'基础材料，用于制作工具和武器',
    stackSize:64,
    recipe:{
      inputs:{ wood:2 },
    },
  },
  rope:{
    id:'rope',
    name:'绳子',
    icon:'🪢',
    type:'material',
    description:'基础材料，用于制作工具和武器',
    stackSize:64,
    recipe:{
      inputs:{ fiber:5 },
    },
  },
  iron_ingot:{
    id:'iron_ingot',
    name:'铁锭',
    icon:'⬜',
    type:'material',
    description:'基础材料，用于制作工具和武器',
    stackSize:64,
    recipe:{
      inputs:{ iron_ore:1 },
    },
  },
  copper_ingot:{
    id:'copper_ingot',
    name:'铜锭',
    icon:'🟧',
    type:'material',
    description:'基础材料，用于制作工具和武器',
    stackSize:64,
    recipe:{
      inputs:{ copper_ore:1 },
    },
  },

  // ========== 工具（可合成 + 可装备 + 可攻击）==========
  stone_axe:{
    id:'stone_axe',
    name:'石斧',
    icon:'🪓',
    type:'tool',
    description:'采集工具，提高木材采集速度，也可用于战斗',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      woodGatherSpeed:1.5,
      damage:8,
    },
    gatherDamage:{
      wood:15,
      stone:5,
      default:8,
    },
    // 🔧 新增：攻击配置
    attackConfig:{
      attackType:'melee',
      detectShape:'sector',
      attackRange:2.0,
      attackAngle:90,
      attackCooldown:0.7,
      maxTargets:2,
      penetration:0,
      penetrationDamageDecay:0,
      knockback:2.0,
    },
    recipe:{
      inputs:{ wooden_stick:2, stone:3, fiber:1 },
    },
  },

  wood_pickaxe:{
    id:'wood_pickaxe',
    name:'木镐',
    icon:'⛏️',
    type:'tool',
    description:'基础挖掘工具',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      stoneGatherSpeed:1.5,
      damage:4,
    },
    gatherDamage:{
      wood:5,
      stone:12,
      default:6,
    },
    // 🔧 新增：攻击配置
    attackConfig:{
      attackType:'melee',
      detectShape:'sector',
      attackRange:1.8,
      attackAngle:60,
      attackCooldown:0.8,
      maxTargets:1,
      penetration:0,
      penetrationDamageDecay:0,
      knockback:1.0,
    },
    recipe:{
      inputs:{ wooden_stick:2, wood:3, fiber:1 },
    },
  },

  stone_pickaxe:{
    id:'stone_pickaxe',
    name:'石镐',
    icon:'⛏️',
    type:'tool',
    description:'高效挖掘工具，提高石头采集速度',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      stoneGatherSpeed:2.0,
      damage:6,
    },
    gatherDamage:{
      wood:6,
      stone:20,
      default:10,
    },
    // 🔧 新增：攻击配置
    attackConfig:{
      attackType:'melee',
      detectShape:'sector',
      attackRange:1.8,
      attackAngle:60,
      attackCooldown:0.75,
      maxTargets:1,
      penetration:0,
      penetrationDamageDecay:0,
      knockback:1.5,
    },
    recipe:{
      inputs:{ wooden_stick:2, stone:3, fiber:1 },
    },
  },

  // ========== 武器（可合成 + 可装备）==========
  wooden_sword:{
    id:'wooden_sword',
    name:'木剑',
    icon:'🗡️',
    type:'weapon',
    description:'基础武器，攻击速度快',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      damage:10,
    },
    // 🔧 新增：攻击配置
    attackConfig:{
      attackType:'melee',
      detectShape:'sector',
      attackRange:2.5,
      attackAngle:120,
      attackCooldown:0.5,
      maxTargets:3,
      penetration:0,
      penetrationDamageDecay:0,
      knockback:1.5,
    },
    recipe:{
      inputs:{ wooden_stick:1, wood:2, fiber:1 },
    },
  },

  stone_sword:{
    id:'stone_sword',
    name:'石剑',
    icon:'⚔️',
    type:'weapon',
    description:'进阶武器，伤害更高',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      damage:20,
    },
    // 🔧 新增：攻击配置
    attackConfig:{
      attackType:'melee',
      detectShape:'sector',
      attackRange:2.5,
      attackAngle:120,
      attackCooldown:0.55,
      maxTargets:3,
      penetration:0,
      penetrationDamageDecay:0,
      knockback:2.0,
    },
    recipe:{
      inputs:{ wooden_stick:1, stone:2, fiber:1 },
    },
  },

  wooden_spear:{
    id:'wooden_spear',
    name:'木矛',
    icon:'🔱',
    type:'weapon',
    description:'长柄武器，攻击距离远，可穿透多个目标',
    stackSize:1,
    maxDurability:100,
    equippable:true,
    equipSlot:'hand',
    effects:{
      damage:15,
    },
    // 🔧 新增：攻击配置（射线穿透）
    attackConfig:{
      attackType:'melee',
      detectShape:'ray',
      attackRange:3.5,
      attackAngle:15,
      attackCooldown:0.8,
      maxTargets:0,
      penetration:2,
      penetrationDamageDecay:0.3,
      knockback:3.0,
    },
    recipe:{
      inputs:{ wood:4, wooden_stick:2, fiber:1 },
    },
  },

  // ========== 装备（可装备）==========
  leather_helmet:{
    id:'leather_helmet',
    name:'皮革头盔',
    icon:'🪖',
    type:'armor',
    description:'基础头部防护',
    stackSize:1,
    equippable:true,
    equipSlot:'head',
    effects:{
      defense:2,
    },
    recipe:{
      inputs:{ leather:5 },
    },
  },

  leather_chestplate:{
    id:'leather_chestplate',
    name:'皮革胸甲',
    icon:'🦺',
    type:'armor',
    description:'基础身体防护',
    stackSize:1,
    equippable:true,
    equipSlot:'chest',
    effects:{
      defense:3,
    },
    recipe:{
      inputs:{ leather:8 },
    },
  },

  leather_leggings:{
    id:'leather_leggings',
    name:'皮革护腿',
    icon:'👖',
    type:'armor',
    description:'基础腿部防护',
    stackSize:1,
    equippable:true,
    equipSlot:'legs',
    effects:{
      defense:2,
    },
    recipe:{
      inputs:{ leather:6 },
    },
  },

  leather_boots:{
    id:'leather_boots',
    name:'皮革靴子',
    icon:'👢',
    type:'armor',
    description:'基础脚部防护',
    stackSize:1,
    equippable:true,
    equipSlot:'feet',
    effects:{
      defense:1,
    },
    recipe:{
      inputs:{ leather:4 },
    },
  },

  // ========== 设施（可合成 + 可放置）==========
  campfire:{
    id:'campfire',
    name:'篝火',
    icon:'🔥',
    type:'facility',
    description:'用于烹饪食物和照明，手持后左键放置',
    stackSize:16,
    placeable: true,  // 🏗️ 可放置
    placeType: 'campfire',  // 对应 BuildingData 中的ID
    recipe:{
      inputs:{ wood:5, stone:3 },
    },
  },

  workbench:{
    id:'workbench',
    name:'工作台',
    icon:'🔨',
    type:'facility',
    description:'制作台，解锁更多配方，手持后左键放置',
    stackSize:16,
    placeable: true,  // 🏗️ 可放置
    placeType: 'workbench',  // 对应 BuildingData 中的ID
    recipe:{
      inputs:{ wood:10},
    },
  },

  chest:{
    id:'chest',
    name:'箱子',
    icon:'📦',
    type:'facility',
    description:'存储30格物品，手持后左键放置',
    stackSize:16,
    placeable: true,  // 🏗️ 可放置
    placeType: 'chest',  // 对应 BuildingData 中的ID
    recipe:{
      inputs:{ wood:12 },
    },
  },

  bed:{
    id:'bed',
    name:'床',
    icon:'🛏️',
    type:'facility',
    description:'用于休息和跳过夜晚，手持后左键放置',
    stackSize:16,
    placeable: true,  // 🏗️ 可放置
    placeType: 'bed',  // 对应 BuildingData 中的ID
    recipe:{
      inputs:{ wood:15},
    },
  },
};

// ========== 辅助函数 ==========

/**
 * 获取物品信息
 */
export function getItem(itemId) {
  return ITEMS[itemId] || null;
}

/**
 * 获取物品的最大耐久度
 */
export function getMaxDurability(itemId) {
  return ITEMS[itemId]?.maxDurability || null;
}

/**
 * 检查物品是否有耐久度
 */
export function hasDurability(itemId) {
  return ITEMS[itemId]?.maxDurability !== undefined;
}

/**
 * 获取物品的采集伤害
 */
export function getGatherDamage(itemId, resourceType = 'default') {
  const item = ITEMS[itemId];
  if (!item || !item.gatherDamage) {
    return 0;
  }
  return item.gatherDamage[resourceType] || item.gatherDamage.default || 0;
}

/**
 * 🔧 新增：获取物品的攻击配置
 * @param {string} itemId - 物品ID
 * @returns {Object} 攻击配置（如果没有则返回空手配置）
 */
export function getAttackConfig(itemId) {
  const item = ITEMS[itemId];
  if (! item || !item.attackConfig) {
    return BARE_HAND_ATTACK;
  }
  return item.attackConfig;
}

/**
 * 🔧 新增：检查物品是否可以攻击
 * @param {string} itemId - 物品ID
 * @returns {boolean}
 */
export function canAttack(itemId) {
  const item = ITEMS[itemId];
  return item && (item.type === 'weapon' || item.type === 'tool');
}

/**
 * 🏗️ 新增：检查物品是否可放置
 * @param {string} itemId - 物品ID
 * @returns {boolean}
 */
export function isPlaceable(itemId) {
  const item = ITEMS[itemId];
  return item?.placeable === true;
}

/**
 * 🏗️ 新增：获取物品的放置类型（对应BuildingData中的ID）
 * @param {string} itemId - 物品ID
 * @returns {string|null}
 */
export function getPlaceType(itemId) {
  const item = ITEMS[itemId];
  return item?.placeType || null;
}

/**
 * 获取所有分类（自动提取）
 */
export function getCategoryList() {
  const usedTypes = new Set();

  Object.values(ITEMS).forEach(item => {
    if (item.recipe) {
      usedTypes.add(item.type);
    }
  });

  return Array.from(usedTypes).map(typeId => {
    const meta = CATEGORY_META[typeId] || {};

    return {
      id:typeId,
      name:meta.name || typeId,
      icon:meta.icon || '📦',
      order:meta.order || 'z',
      description:meta.description || ''
    };
  }).sort((a, b) => a.order.localeCompare(b.order));
}

/**
 * 获取单个分类信息
 */
export function getCategory(categoryId) {
  const meta = CATEGORY_META[categoryId] || {};

  return {
    id:categoryId,
    name:meta.name || categoryId,
    icon:meta.icon || '📦',
    order:meta.order || 'z',
    description:meta.description || ''
  };
}

/**
 * 获取所有可合成的配方（不包含烹饪专用配方）
 */
export function getAllRecipes() {
  return Object.values(ITEMS)
    .filter(item => item.recipe && !item.recipe.cookingOnly)
    .map(item => {
      const category = item.type;

      return {
        id:item.id,
        result:item.id,
        count:1,
        materials:item.recipe.inputs,
        inputs:item.recipe.inputs,
        outputs:{ [item.id]:1 },
        category:category,
        name:item.name,
        icon:item.icon,
        description:item.description,
      };
    });
}

/**
 * 根据分类获取配方
 */
export function getRecipesByCategory(category) {
  return getAllRecipes().filter(r => r.category === category);
}

/**
 * 获取所有分类
 */
export function getAllCategories() {
  const categories = new Set(
    Object.values(ITEMS)
      .filter(item => item.recipe)
      .map(item => item.type)
  );
  return Array.from(categories);
}

/**
 * 获取配方信息
 */
export function getRecipe(recipeId) {
  const item = ITEMS[recipeId];
  if (!item || !item.recipe) return null;

  return {
    id:item.id,
    result:item.id,
    count:1,
    materials:item.recipe.inputs,
    inputs:item.recipe.inputs,
    outputs:{ [item.id]:1 },
    category:item.type,
    name:item.name,
    icon:item.icon,
    description:item.description,
  };
}

/**
 * 获取物品的最大堆叠数量
 */
export function getMaxStackSize(itemId) {
  return ITEMS[itemId]?.stackSize || 64;
}

/**
 * 检查物品是否可装备
 */
export function isEquippable(itemId) {
  return ITEMS[itemId]?.equippable || false;
}

/**
 * 获取物品的装备槽位类型
 */
export function getEquipSlot(itemId) {
  return ITEMS[itemId]?.equipSlot || null;
}

/**
 * 获取物品的效果
 */
export function getItemEffects(itemId) {
  return ITEMS[itemId]?.effects || {};
}

/**
 * 检查物品是否可食用
 */
export function isEdible(itemId) {
  return ITEMS[itemId]?.edible || false;
}

/**
 * 获取物品恢复的饥饿值
 */
export function getHungerRestore(itemId) {
  return ITEMS[itemId]?.hungerRestore || 0;
}

/**
 * 检查物品是否可烹饪
 */
export function isCookable(itemId) {
  return ITEMS[itemId]?.recipe?.cookingOnly || false;
}

/**
 * 检查物品是否可作为燃料
 */
export function isFuelItem(itemId) {
  // 木材、木板、木棍可以作为燃料
  return ['wood', 'plank', 'stick'].includes(itemId);
}

/**
 * 格式化物品效果（用于tooltip显示）
 */
export function formatEffects(effects) {
  if (!effects || Object.keys(effects).length === 0) return [];
  
  const formatted = [];
  const effectLabels = {
    damage: '攻击力',
    defense: '防御力',
    woodGatherSpeed: '采木速度',
    stoneGatherSpeed: '采石速度',
    moveSpeed: '移动速度',
    attackSpeed: '攻击速度',
    critChance: '暴击几率',
    critDamage: '暴击伤害',
  };

  for (const [key, value] of Object.entries(effects)) {
    const label = effectLabels[key] || key;
    const prefix = value > 0 ? '+' : '';
    const suffix = key.includes('Speed') || key.includes('Chance') ? '%' : '';
    formatted.push(`${label} ${prefix}${value}${suffix}`);
  }

  return formatted;
}

/**
 * 格式化配方信息（用于tooltip显示）
 */
export function formatRecipe(recipe) {
  if (!recipe || !recipe.inputs) return null;
  
  const materials = [];
  for (const [itemId, count] of Object.entries(recipe.inputs)) {
    const item = ITEMS[itemId];
    if (item) {
      materials.push(`${item.icon}${item.name}×${count}`);
    }
  }
  
  return {
    text: materials.join(' + '),
    cookingOnly: recipe.cookingOnly || false
  };
}

/**
 * 获取tooltip提示文本（操作提示）
 */
export function getTooltipHints(itemId) {
  const item = ITEMS[itemId];
  if (!item) return [];
  
  const hints = [];
  
  if (item.equippable) {
    hints.push('双击装备');
  }
  if (item.edible) {
    hints.push('右键食用');
  }
  if (item.placeable) {
    hints.push('右键放置');
  }
  
  return hints;
}

/**
 * 获取tooltip徽章（用于特殊标记）
 */
export function getTooltipBadges(itemId, context = 'default') {
  const item = ITEMS[itemId];
  if (!item) return [];
  
  const badges = [];
  
  // 在烹饪界面显示特殊徽章
  if (context === 'cooking') {
    if (isCookable(itemId)) {
      badges.push({ text: '可烹饪', type: 'cookable' });
    }
    if (isFuelItem(itemId)) {
      badges.push({ text: '可燃料', type: 'fuel' });
    }
  }
  
  // 通用徽章
  if (item.placeable) {
    badges.push({ text: '可放置', type: 'placeable' });
  }
  if (item.equippable) {
    badges.push({ text: '可装备', type: 'equippable' });
  }
  
  return badges;
}

/**
 * 获取tooltip完整数据（统一数据源）
 * @param {string} itemId - 物品ID
 * @param {Object} itemSlot - 物品槽位数据（包含count, durability等）
 * @param {string} context - 上下文（'hotbar', 'inventory', 'storage', 'cooking'）
 * @returns {Object} tooltip数据对象
 */
export function getTooltipData(itemId, itemSlot = {}, context = 'default') {
  const item = ITEMS[itemId];
  if (!item) return null;
  
  const data = {
    // 基础信息
    id: item.id,
    name: item.name,
    icon: item.icon,
    type: item.type,
    typeName: CATEGORY_META[item.type]?.name || item.type,
    description: item.description || '',
    count: itemSlot.count || 1,
    stackSize: item.stackSize || 64,
    
    // 耐久度
    hasDurability: !!item.maxDurability,
    durability: itemSlot.durability,
    maxDurability: item.maxDurability,
    durabilityPercent: item.maxDurability ? 
      ((itemSlot.durability || item.maxDurability) / item.maxDurability * 100) : 0,
    
    // 效果
    effects: formatEffects(item.effects),
    hasEffects: item.effects && Object.keys(item.effects).length > 0,
    
    // 食物属性
    isEdible: item.edible || false,
    hungerRestore: item.hungerRestore || 0,
    healthRestore: item.healthRestore || 0,
    poisonChance: item.poisonChance || 0,
    buffOnConsume: item.buffOnConsume || null,
    
    // 烹饪属性
    isCookable: isCookable(itemId),
    isFuel: isFuelItem(itemId),
    
    // 配方
    hasRecipe: !!item.recipe,
    recipe: item.recipe ? formatRecipe(item.recipe) : null,
    
    // 其他属性
    isPlaceable: item.placeable || false,
    isEquippable: item.equippable || false,
    equipSlot: item.equipSlot || null,
    
    // 提示和徽章
    hints: getTooltipHints(itemId),
    badges: getTooltipBadges(itemId, context),
  };
  
  return data;
}

// ========== 向后兼容 ==========

export const ITEM_ICONS = Object.fromEntries(
  Object.entries(ITEMS).map(([id, item]) => [id, item.icon])
);

export const ITEM_NAMES = Object.fromEntries(
  Object.entries(ITEMS).map(([id, item]) => [id, item.name])
);

export const CATEGORY_NAMES = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([id, meta]) => [id, meta.name])
);

export const RECIPES = getAllRecipes();
