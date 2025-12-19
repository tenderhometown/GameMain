import { RECIPES, ITEM_NAMES } from '../data/RecipeData.js';
import { logger } from '../utils/logger.js';

/**
 * 合成系统
 * 处理配方检查和物品合成逻辑
 */
export class CraftingSystem {
  /**
   * @param {import('../components/Inventory.js').Inventory} inventory - 背包实例
   */
  constructor(inventory) {
    this.inventory = inventory;
    
    /** @type {Array} 所有配方 */
    this.recipes = RECIPES;
    
    logger.info('合成系统初始化完成');
  }

  /**
   * 获取所有配方
   * @returns {Array}
   */
  getAllRecipes() {
    return this.recipes;
  }

  /**
   * 根据 ID 获取配方
   * @param {string} recipeId - 配方 ID
   * @returns {Object|null}
   */
  getRecipe(recipeId) {
    return this.recipes.find(r => r.id === recipeId) || null;
  }

  /**
   * 检查是否有足够的材料合成
   * @param {string} recipeId - 配方 ID
   * @returns {boolean}
   */
  canCraft(recipeId) {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      logger.warn(`配方不存在: ${recipeId}`);
      return false;
    }

    // 检查每个输入材料
    for (const [itemId, requiredAmount] of Object.entries(recipe.inputs)) {
      const currentAmount = this.inventory.getItemCount(itemId);
      
      if (currentAmount < requiredAmount) {
        return false;  // 材料不足
      }
    }

    return true;  // 材料充足
  }

  /**
   * 获取缺少的材料列表
   * @param {string} recipeId - 配方 ID
   * @returns {Object} { itemId: 缺少数量 }
   */
  getMissingMaterials(recipeId) {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return {};

    const missing = {};

    for (const [itemId, requiredAmount] of Object.entries(recipe.inputs)) {
      const currentAmount = this.inventory.getItemCount(itemId);
      const lackAmount = requiredAmount - currentAmount;

      if (lackAmount > 0) {
        missing[itemId] = lackAmount;
      }
    }

    return missing;
  }

  /**
   * 执行合成
   * @param {string} recipeId - 配方 ID
   * @returns {boolean} 是否合成成功
   */
  craft(recipeId) {
    const recipe = this.getRecipe(recipeId);
    
    if (!recipe) {
      logger.error(`配方不存在: ${recipeId}`);
      return false;
    }

    // 检查材料
    if (!this.canCraft(recipeId)) {
      logger.warn(`材料不足，无法合成: ${recipe.name}`);
      return false;
    }

    // 扣除输入材料
    for (const [itemId, amount] of Object.entries(recipe.inputs)) {
      this.inventory.removeItem(itemId, amount);
    }

    // 添加输出物品
    for (const [itemId, amount] of Object.entries(recipe.outputs)) {
      this.inventory.addItem(itemId, amount);
    }

    logger.info(`✓ 合成成功: ${recipe.name}`);
    return true;
  }

  /**
   * 获取可合成的配方列表（材料足够）
   * @returns {Array}
   */
  getCraftableRecipes() {
    return this.recipes.filter(recipe => this.canCraft(recipe.id));
  }

  /**
   * 按分类获取配方
   * @param {string} category - 分类名称
   * @returns {Array}
   */
  getRecipesByCategory(category) {
    return this.recipes.filter(r => r.category === category);
  }

  /**
   * 获取所有分类
   * @returns {Array<string>}
   */
  getAllCategories() {
    const categories = new Set(this.recipes.map(r => r.category));
    return Array.from(categories);
  }

  /**
   * 清理合成系统资源
   */
  dispose() {
    this.inventory = null;
    this.recipes = null;
    logger.info('合成系统已清理');
  }
}