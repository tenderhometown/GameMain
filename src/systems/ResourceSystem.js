import { logger } from '../utils/logger.js';

/**
 * 🔧 资源系统（重构版 - HP攻击采集）
 * 管理资源采集逻辑
 */
export class ResourceSystem {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   */
  constructor(scene) {
    this.scene = scene;

    /** @type {Map<import('@babylonjs/core/Meshes/mesh').Mesh, Object>} */
    this.interactables = new Map();

    // 🔧 攻击冷却配置
    this.attackCooldown = 0.4;  // 攻击间隔（秒）
    this.lastAttackTime = 0;

    logger.info('资源系统初始化完成（HP攻击版）');
  }

  /**
   * 注册可交互物体
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 网格对象
   * @param {Object} interactable - 交互对象
   */
  registerInteractable(mesh, interactable) {
    this.interactables.set(mesh, interactable);
  }

  /**
   * 🔧 攻击资源（新方法）
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 目标资源
   * @param {number} damage - 造成的伤害
   * @param {import('../components/Inventory.js').Inventory} inventory - 背包（用于给予奖励）
   * @returns {{hit: boolean, destroyed: boolean, remainingHp:  number, maxHp: number, rewards: Object|null}}
   */
  attackResource(mesh, damage, inventory) {
    // 检查攻击冷却
    const currentTime = Date.now() / 1000;
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return { hit:  false, destroyed: false, remainingHp: 0, maxHp: 0, rewards: null, onCooldown: true };
    }
    this.lastAttackTime = currentTime;

    // 获取可交互组件
    const interactable = this.interactables.get(mesh) || mesh.metadata?.interactable;

    if (!interactable || !interactable.isInteractable) {
      logger.warn('物体不可攻击');
      return { hit: false, destroyed: false, remainingHp: 0, maxHp: 0, rewards:  null };
    }

    // 造成伤害
    const result = interactable.takeDamage(damage);

    logger.debug(`攻击 ${interactable.displayName}:  -${damage} HP, 剩余 ${result.remainingHp}/${result.maxHp}`);

    // 检查是否被摧毁
    if (result.destroyed) {
      // 给予奖励
      const rewards = interactable.getRewards();
      for (const [itemId, amount] of Object.entries(rewards)) {
        inventory.addItem(itemId, amount);
      }

      // 触发UI刷新事件
      document.dispatchEvent(new CustomEvent('inventoryChanged', {
        detail: { 
          source: 'harvest',
          timestamp: Date.now(),
          rewards: rewards
        }
      }));

      // 如果有树冠，一起删除
      if (mesh.metadata?.crown) {
        mesh.metadata.crown.dispose();
      }

      // 移除物体
      mesh.dispose();
      this.interactables.delete(mesh);

      logger.info(`✓ ${interactable.displayName} 被摧毁，获得奖励: `, rewards);

      return { 
        hit: true, 
        destroyed: true, 
        remainingHp: 0, 
        maxHp: result.maxHp, 
        rewards: rewards 
      };
    }

    // 未摧毁，只是造成伤害
    return { 
      hit: true, 
      destroyed: false, 
      remainingHp: result.remainingHp, 
      maxHp: result.maxHp, 
      rewards: null 
    };
  }

  /**
   * 🔧 获取攻击冷却进度
   * @returns {number} 0-1，1表示可以攻击
   */
  getAttackCooldownProgress() {
    const currentTime = Date.now() / 1000;
    const elapsed = currentTime - this.lastAttackTime;
    return Math.min(elapsed / this.attackCooldown, 1.0);
  }

  /**
   * 🔧 检查是否可以攻击
   * @returns {boolean}
   */
  canAttack() {
    const currentTime = Date.now() / 1000;
    return (currentTime - this.lastAttackTime) >= this.attackCooldown;
  }

  /**
   * 清理资源系统
   */
  dispose() {
    this.interactables.clear();
    logger.info('资源系统已清理');
  }
}