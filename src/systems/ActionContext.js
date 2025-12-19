import { logger } from '../utils/logger.js';

/**
 * 鼠标左键行为上下文系统
 * 根据当前游戏状态（建造模式、战斗、采集等）决定鼠标左键的行为
 */
export class ActionContext {
  constructor(scene) {
    this.scene = scene;
    
    // 系统引用（由MainScene设置）
    this.player = null;
    this.uiStateManager = null;
    this.buildingSystem = null;
    this.combatSystem = null;
    this.resourceSystem = null;
    this.equipmentSystem = null;
    this.pickingSystem = null;
    this.inventory = null;
    this.mainScene = null;  // MainScene引用（用于获取建造状态）
    this.cameraController = null;  // 🔧 相机控制器（用于获取正确的射线）
    
    // 当前行为类型
    this.currentAction = null;  // 'building' | 'combat' | 'harvest' | 'idle'
    
    logger.info('✨ ActionContext 已初始化');
  }

  /**
   * 设置系统引用
   * @param {Object} systems - 系统对象
   */
  setSystems(systems) {
    this.player = systems.player;
    this.uiStateManager = systems.uiStateManager;
    this.buildingSystem = systems.buildingSystem;
    this.combatSystem = systems.combatSystem;
    this.resourceSystem = systems.resourceSystem;
    this.equipmentSystem = systems.equipmentSystem;
    this.pickingSystem = systems.pickingSystem;
    this.inventory = systems.inventory;
    this.mainScene = systems.mainScene;
    this.cameraController = systems.cameraController;  // 🔧 添加相机控制器
  }

  /**
   * 更新（每帧调用）
   * 判断当前应该执行的动作类型
   */
  update(deltaTime) {
    if (!this.player || this.player.isDead) {
      this.currentAction = null;
      return;
    }

    // 如果UI打开，不判断行为
    if (this.uiStateManager && this.uiStateManager.shouldBlockGameInput()) {
      this.currentAction = null;
      return;
    }

    // 优先级1: 建造模式
    if (this.buildingSystem && this.buildingSystem.isBuilding) {
      this.currentAction = 'building';
      return;
    }

    // 优先级2: 战斗（准星对准敌人）
    if (this.combatSystem && this.pickingSystem && this.cameraController && this.player) {
      const ray = this.cameraController.getInteractionRay();
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
        return this.combatSystem.attackableTargets.has(mesh);
      });

      if (pickInfo && pickInfo.hit) {
        // 🔧 使用玩家到目标的距离（统一逻辑）
        const playerPos = this.player.getPosition();
        const distanceFromPlayer = playerPos.subtract(pickInfo.pickedPoint).length();
        
        if (distanceFromPlayer <= 3.0) {  // 战斗距离固定3米
          this.currentAction = 'combat';
          return;
        }
      }
    }

    // 优先级3: 采集资源（准星对准资源）
    if (this.resourceSystem && this.pickingSystem && this.cameraController && this.player) {
      const ray = this.cameraController.getInteractionRay();
      const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
        const interactable = this.pickingSystem.getInteractable(mesh);
        return interactable !== null;
      });

      if (pickInfo && pickInfo.hit) {
        // 🔧 使用玩家到目标的距离（统一逻辑）
        const playerPos = this.player.getPosition();
        const distanceFromPlayer = playerPos.subtract(pickInfo.pickedPoint).length();
        
        if (distanceFromPlayer <= 3.5) {  // 采集距离固定3.5米
          this.currentAction = 'harvest';
          return;
        }
      }
    }

    // 默认：空闲
    this.currentAction = 'idle';
  }

  /**
   * 执行当前动作
   */
  executeAction() {
    if (!this.currentAction || this.currentAction === 'idle') {
      return;
    }

    switch (this.currentAction) {
      case 'building':
        this.executeBuildingAction();
        break;
      case 'combat':
        this.executeCombatAction();
        break;
      case 'harvest':
        this.executeHarvestAction();
        break;
      default:
        logger.warn(`未知的动作类型: ${this.currentAction}`);
    }
  }

  /**
   * 执行建造动作
   */
  executeBuildingAction() {
    if (!this.buildingSystem || !this.buildingSystem.canPlace) {
      return;
    }

    // 获取建造状态（从MainScene）
    const isPlacingFromHeldItem = this.mainScene?._isPlacingFromHeldItem || false;
    const heldItemId = this.mainScene?._heldItemId || null;
    const heldItemSlot = this.mainScene?._heldItemSlot || -1;

    let result;
    
    // 根据是否从手持物品放置，使用不同的放置方式
    if (isPlacingFromHeldItem && this.inventory) {
      result = this.buildingSystem.placeBuilding(
        this.inventory, 
        true, 
        heldItemId, 
        heldItemSlot
      );
      
      // 放置成功后检查物品是否用完 
      if (result.success && this.mainScene) {
        const newSlot = this.inventory.getHotbarSlot(heldItemSlot);
        if (!newSlot || newSlot.count <= 0) {
          // 物品用完，退出建造模式
          this.buildingSystem.exitBuildMode();
          this.mainScene._isPlacingFromHeldItem = false;
          this.mainScene._heldItemId = null;
          this.mainScene._heldItemSlot = -1;
        }
      }
    } else {
      // 传统建造菜单模式
      result = this.buildingSystem.placeBuilding(this.inventory);
    }
    
    // 显示消息
    if (this.mainScene) {
      if (result.success) {
        this.mainScene.showMessage(result.message);
      } else {
        this.mainScene.showMessage(`❌ ${result.message}`);
      }
    }
  }

  /**
   * 执行战斗动作
   */
  executeCombatAction() {
    if (!this.combatSystem || !this.combatSystem.canAttack()) {
      return;
    }

    const result = this.combatSystem.attack(this.player, this.equipmentSystem);

    if (!result.success) {
      return;
    }

    // 命中处理
    if (result.hit && result.targets.length > 0) {
      // 显示伤害数字（通过MainScene的回调）
      for (const target of result.targets) {
        // 这里需要通过事件或回调通知MainScene显示伤害数字
        document.dispatchEvent(new CustomEvent('damageDealt', {
          detail: {
            damage: target.damage,
            position: target.position,
            isCritical: false,
            killed: target.killed,
            targetName: target.target.name
          }
        }));
      }

      // 消耗武器耐久
      if (result.weaponId && this.equipmentSystem) {
        const durabilityResult = this.equipmentSystem.useCurrentHandTool(1);
        
        if (durabilityResult.broken) {
          document.dispatchEvent(new CustomEvent('toolBroken', {
            detail: { itemId: durabilityResult.itemId }
          }));
        }
      }

      logger.debug(`攻击命中 ${result.targets.length} 个目标`);
    } else {
      logger.debug('攻击空挥');
    }
  }

  /**
   * 执行采集动作
   */
  executeHarvestAction() {
    if (!this.resourceSystem || !this.resourceSystem.canAttack()) {
      return;
    }

    // 获取目标
    const ray = this.cameraController 
      ? this.cameraController.getInteractionRay()  // 🔧 使用相机控制器的射线
      : this.scene.activeCamera.getForwardRay();   // 降级方案
      
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
      const interactable = this.pickingSystem.getInteractable(mesh);
      return interactable !== null;
    });

    if (!pickInfo || !pickInfo.hit) {
      return;
    }

    const mesh = pickInfo.pickedMesh;
    const interactable = this.pickingSystem.getInteractable(mesh);
    
    if (!interactable) {
      return;
    }

    // 获取资源类型和采集伤害
    const resourceType = interactable.getResourceType();
    const damage = this.equipmentSystem.getGatherDamage(resourceType);

    // 攻击资源
    const result = this.resourceSystem.attackResource(mesh, damage, this.inventory);

    if (!result.hit) {
      return;
    }

    // 消耗工具耐久
    const durabilityResult = this.equipmentSystem.useCurrentHandTool(1);

    // 触发采集事件
    document.dispatchEvent(new CustomEvent('resourceHarvested', {
      detail: {
        mesh: mesh,
        damage: damage,
        destroyed: result.destroyed,
        rewards: result.rewards,
        remainingHp: result.remainingHp,
        maxHp: result.maxHp,
        toolBroken: durabilityResult.broken,
        toolRemaining: durabilityResult.remaining,
        toolId: durabilityResult.itemId
      }
    }));

    logger.debug(`采集资源: ${resourceType}, 伤害: ${damage}`);
  }

  /**
   * 获取当前动作类型
   * @returns {string|null}
   */
  getCurrentAction() {
    return this.currentAction;
  }

  /**
   * 清理
   */
  dispose() {
    this.player = null;
    this.uiStateManager = null;
    this.buildingSystem = null;
    this.combatSystem = null;
    this.resourceSystem = null;
    this.equipmentSystem = null;
    this.pickingSystem = null;
    this.inventory = null;
    this.currentAction = null;
    logger.info('ActionContext 已清理');
  }
}
