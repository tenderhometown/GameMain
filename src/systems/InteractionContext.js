import { logger } from '../utils/logger.js';

/**
 * 交互优先级枚举
 */
export const InteractionPriority = {
  BUILDING: 100,      // 建筑物（床、箱子、篝火等）
  ENEMY: 50,          // 敌人/NPC
  RESOURCE: 10,       // 资源（树木、石头）
};

/**
 * E键交互上下文系统
 * 负责扫描玩家周围的可交互对象，并根据优先级决定显示哪个交互提示
 */
export class InteractionContext {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
    this.cameraController = null;  // 🔧 相机控制器引用
    
    // 可交互对象列表
    this.interactables = [];
    
    // 当前最佳交互目标
    this.currentTarget = null;
    
    // 交互范围（从玩家角度）
    this.interactionRange = 3.5;
    
    logger.info('✨ InteractionContext 已初始化');
  }

  /**
   * 设置玩家引用
   * @param {Object} player - 玩家对象
   */
  setPlayer(player) {
    this.player = player;
  }

  /**
   * 🔧 设置相机控制器引用
   * @param {Object} cameraController - 相机控制器
   */
  setCameraController(cameraController) {
    this.cameraController = cameraController;
  }

  /**
   * 注册可交互对象
   * @param {Object} interactable - 可交互对象
   * @param {Mesh} interactable.mesh - Babylon.js网格对象
   * @param {number} interactable.priority - 优先级
   * @param {string} interactable.promptText - 提示文本
   * @param {Function} interactable.onInteract - 交互回调函数
   */
  registerInteractable(interactable) {
    if (!interactable.mesh || !interactable.onInteract) {
      logger.warn('注册可交互对象失败：缺少必要属性');
      return;
    }

    this.interactables.push(interactable);
    logger.debug(`已注册可交互对象: ${interactable.promptText || 'Unknown'}`);
  }

  /**
   * 取消注册可交互对象
   * @param {Mesh} mesh - 网格对象
   */
  unregisterInteractable(mesh) {
    const index = this.interactables.findIndex(i => i.mesh === mesh);
    if (index !== -1) {
      this.interactables.splice(index, 1);
      logger.debug('已取消注册可交互对象');
    }
  }

  /**
   * 更新（每帧调用）
   * @param {number} deltaTime - 帧时间（秒）
   */
  update(deltaTime) {
    if (!this.player) return;

    // 使用射线检测可交互对象
    this.raycastInteractables();
  }

  /**
   * 使用射线检测可交互对象
   */
  raycastInteractables() {
    if (!this.player) return;

    // 🔧 使用相机控制器的射线（支持第一/第三人称）
    const ray = this.cameraController 
      ? this.cameraController.getInteractionRay()
      : this.scene.activeCamera.getForwardRay(this.interactionRange);
    
    // 射线检测
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
      // 检查是否是已注册的可交互对象
      return this.interactables.some(i => i.mesh === mesh);
    });

    // 清除当前目标
    this.currentTarget = null;

    if (pickInfo && pickInfo.hit) {
      // 找到对应的可交互对象
      const interactable = this.interactables.find(i => i.mesh === pickInfo.pickedMesh);
      
      if (interactable) {
        // 🔧 使用玩家到目标的距离判断（而不是射线距离）
        const playerPos = this.player.getPosition();
        const targetPos = pickInfo.pickedPoint;
        const distanceFromPlayer = playerPos.subtract(targetPos).length();
        
        // 检查距离和是否可交互
        if (distanceFromPlayer <= this.interactionRange && 
            (!interactable.canInteract || interactable.canInteract())) {
          this.currentTarget = interactable;
        }
      }
    }
  }

  /**
   * 执行交互
   */
  executeInteraction() {
    if (!this.currentTarget) {
      logger.debug('没有可交互的目标');
      return;
    }

    if (this.currentTarget.onInteract) {
      logger.debug(`执行交互: ${this.currentTarget.promptText || 'Unknown'}`);
      this.currentTarget.onInteract();
    }
  }

  /**
   * 获取当前目标
   * @returns {Object|null}
   */
  getCurrentTarget() {
    return this.currentTarget;
  }

  /**
   * 检查是否有可交互目标
   * @returns {boolean}
   */
  hasInteractableTarget() {
    return this.currentTarget !== null;
  }

  /**
   * 获取交互提示文本
   * @returns {string}
   */
  getPromptText() {
    if (!this.currentTarget) return '';
    return this.currentTarget.promptText || '[E] 交互';
  }

  /**
   * 清理
   */
  dispose() {
    this.interactables = [];
    this.currentTarget = null;
    this.player = null;
    logger.info('InteractionContext 已清理');
  }
}
