import { logger } from '../utils/logger.js';

/**
 * UI状态管理器（单例）
 * 统一管理所有UI面板的打开/关闭状态
 * 解决多个UI面板之间的状态冲突问题
 */
class UIStateManager {
  constructor() {
    // UI状态
    this.states = {
      inventoryOpen: false,    // 背包界面 (Tab)
      storageOpen: false,      // 存储界面 (箱子)
      cookingOpen: false,      // 烹饪界面 (篝火)
      craftingOpen: false,     // 制作界面 (工作台)
      buildingMode: false,     // 建造模式
    };

    // 监听UI事件来同步状态
    this.setupEventListeners();

    logger.info('✨ UIStateManager 已初始化');
  }

  /**
   * 设置事件监听器，同步UI状态
   */
  setupEventListeners() {
    // 监听UI打开/关闭事件
    document.addEventListener('uiStateChanged', (e) => {
      const { uiType, isOpen } = e.detail;
      switch(uiType) {
        case 'inventory':
          this.states.inventoryOpen = isOpen;
          break;
        case 'storage':
          this.states.storageOpen = isOpen;
          break;
        case 'cooking':
          this.states.cookingOpen = isOpen;
          break;
        case 'crafting':
          this.states.craftingOpen = isOpen;
          break;
        case 'building':
          this.states.buildingMode = isOpen;
          break;
      }
    });
    
    // 监听建造模式变化事件
    document.addEventListener('buildModeChanged', (e) => {
      const { isBuilding } = e.detail;
      this.states.buildingMode = isBuilding;
    });
  }

  /**
   * 检查是否有任何UI打开
   * @returns {boolean}
   */
  hasAnyUIOpen() {
    return Object.values(this.states).some(state => state === true);
  }

  /**
   * 检查是否有交互UI打开（存储、烹饪等）
   * @returns {boolean}
   */
  hasInteractionUIOpen() {
    return this.states.storageOpen || this.states.cookingOpen || this.states.craftingOpen;
  }

  /**
   * 检查是否应该阻止游戏输入
   * @returns {boolean}
   */
  shouldBlockGameInput() {
    // 背包、存储、烹饪、制作界面打开时阻止游戏输入
    // 但建造模式不应该阻止！
    return this.states.inventoryOpen || 
           this.states.storageOpen || 
           this.states.cookingOpen || 
           this.states.craftingOpen;
  }

  /**
   * 获取当前UI状态（调试用）
   */
  getStates() {
    return { ...this.states };
  }
}

// 导出单例
export const uiStateManager = new UIStateManager();
