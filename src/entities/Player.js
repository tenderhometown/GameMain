import { Inventory } from '../components/Inventory.js';
import '@babylonjs/core/Culling/ray';
import { Ray } from '@babylonjs/core/Culling/ray';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { logger } from '../utils/logger.js';
import { buffSystem } from '../systems/BuffSystem.js';

/**
 * 玩家角色类
 * 包含完整的属性系统（HP、体力、饥饿度）
 */
export class Player {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @param {import('../systems/PhysicsSystem.js').PhysicsSystem} physicsSystem - 物理系统
   * @param {import('../systems/BabylonInputSystem.js').BabylonInputSystem} inputSystem - 输入系统
   */
  constructor(scene, physicsSystem, inputSystem) {
    /** @type {import('@babylonjs/core/scene').Scene} */
    this.scene = scene;

    /** @type {import('../systems/PhysicsSystem.js').PhysicsSystem} */
    this.physicsSystem = physicsSystem;

    /** @type {import('../systems/BabylonInputSystem.js').BabylonInputSystem} */
    this.inputSystem = inputSystem;

    /** @type {import('@babylonjs/core/Meshes/mesh').Mesh | null} */
    this.mesh = null;

    /** @type {import('@babylonjs/core/Physics/v2/physicsAggregate').PhysicsAggregate | null} */
    this.physicsAggregate = null;

    // ========== 角色属性系统 ==========
    this.stats = {
      // 生命值
      maxHp: 100,
      currentHp: 100,

      // 体力
      maxStamina: 100,
      currentStamina: 100,

      // 饥饿度
      maxHunger: 100,
      currentHunger: 100,

      // 基础属性
      baseAttack: 5,
      baseDefense: 0,
    };

    // ========== 属性变化配置 ==========
    this.statsConfig = {
      // 饥饿度消耗（每秒）
      hungerDecayRate: 60 / 60,         // 每分钟消耗1点
      hungerSprintMultiplier: 2,       // 奔跑时消耗翻倍

      // HP恢复/损失（每秒）
      hpRegenRate: 0.1,                // 饱食状态下恢复
      hpStarveRate: 1,               // 饥饿状态下损失

      // 体力
      staminaRegenRate: 10,            // 每秒恢复
      staminaSprintCost: 5,            // 奔跑每秒消耗

      // 饥饿阈值
      wellFedThreshold: 80,            // 80以上为饱食
      hungryThreshold: 0,             // 0以下为饥饿
    };

    // ========== 移动参数配置 ==========
    this.movementConfig = {
      // 速度
      walkSpeed: 5.0,
      sprintSpeed: 8.0,
      backwardSpeed: 3.0,
      strafeSpeed: 4.0,

      // 跳跃
      jumpForce: 11.0,
      jumpCooldown: 0,
      airControlFactor: 0,

      // 体力消耗/恢复（使用 stats 中的值）
      sprintStaminaCost: 5,
      staminaRegen: 10,
    };

    // ========== 状态变量 ==========
    // 跳跃冷却计时器
    this.jumpCooldownTimer = 0;

    // 当前速度（用于平滑加速）
    this.currentVelocity = Vector3.Zero();

    // 地面检测
    this.isGrounded = false;
    this.groundMesh = null;

    // 死亡状态
    this.isDead = false;

    // 出生点位置（用于复活）
    this.spawnPoint = null;

    // 装备系统引用
    this.equipmentSystem = null;

    // ========== 玩家尺寸 ==========
    this.height = 1.8;
    this.radius = 0.4;

    // ========== 背包系统 ==========
    this.inventory = new Inventory();

    // ========== 交互系统 ==========
    this.interactionRange = 5.0;
  }

  // ========== 初始化方法 ==========

  /**
   * 创建玩家
   * @param {Vector3} position - 初始位置
   */
  create(position = new Vector3(0, 5, 0)) {
    // 创建胶囊体网格（代表玩家）
    this.mesh = MeshBuilder.CreateCapsule(
      'player',
      {
        radius: this.radius,
        height: this.height,
        subdivisions: 16,
      },
      this.scene
    );

    // 设置初始位置
    this.mesh.position = position.clone();

    // 创建玩家材质（蓝色）
    const material = new StandardMaterial('playerMaterial', this.scene);
    material.diffuseColor = new Color3(0.2, 0.5, 1.0);
    material.specularColor = new Color3(0.3, 0.3, 0.3);
    this.mesh.material = material;

    // 添加物理属性
    this.physicsAggregate = this.physicsSystem.createPhysicsAggregate(
      this.mesh,
      PhysicsShapeType.CAPSULE,
      {
        mass: 1,
        restitution: 0,
        friction: 0.5,
      }
    );

    // 锁定旋转（防止玩家倒下）
    const body = this.physicsAggregate.body;
    body.setAngularDamping(1);
    body.disablePreStep = false;

    // 锁定X和Z轴旋转
    body.setMassProperties({
      inertia: new Vector3(0, 1, 0),
    });

    // 设置出生点
    this.spawnPoint = position.clone();

    logger.info('玩家创建完成', { position:  position.asArray() });
  }

  /**
   * 设置装备系统引用
   * @param {import('../systems/EquipmentSystem.js').EquipmentSystem} equipmentSystem
   */
  setEquipmentSystem(equipmentSystem) {
    this.equipmentSystem = equipmentSystem;
    logger.info('✅ 玩家已关联装备系统');
  }

  /**
   * 设置出生点
   * @param {Vector3} position
   */
  setSpawnPoint(position) {
    this.spawnPoint = position.clone();
    logger.info('✅ 出生点已设置', { position: position.asArray() });
  }

  // ========== 更新方法 ==========
  // 注意：统一使用 this.stats.currentStamina，不再使用 this.stamina

  /**
   * 更新玩家（每帧调用）
   * @param {number} deltaTime - 帧间隔时间（秒）
   */
  update(deltaTime) {
    if (!this.mesh || !this.physicsAggregate) return;

    // 如果已死亡，不更新移动
    if (this.isDead) return;

    // 检查是否在地面
    this.checkGrounded();

    // 处理移动
    this.handleMovement(deltaTime);

    // 处理跳跃
    this.handleJump(deltaTime);

    // 获取奔跑状态（用于属性更新）
    const input = this.inputSystem.getMovementInput();
    const isMoving = input.x !== 0 || input.z !== 0;
    const isSprinting = this.inputSystem.isSprintPressed() && this.stats.currentStamina > 0 && isMoving;

    // 更新角色属性
    this.updateStats(deltaTime, isSprinting);

    // 更新 Buff 系统
    this.updateBuffs(deltaTime);
  }

  /**
   * 更新 Buff 系统（每帧调用）
   * @param {number} deltaTime - 帧时间（秒）
   */
  updateBuffs(deltaTime) {
    // 更新 Buff 计时器，并处理 DoT/HoT 效果
    const tickEffects = buffSystem.update(deltaTime);

    // 应用 Buff 的 Tick 效果（伤害/治疗）
    for (const effect of tickEffects) {
      if (effect.type === 'damage') {
        // DoT 伤害（跳过防御计算）
        this.stats.currentHp = Math.max(0, this.stats.currentHp - effect.value);
        logger.debug(`💀 Buff伤害: ${effect.buffId} -${effect.value} HP`);

        // 触发伤害事件
        document.dispatchEvent(new CustomEvent('playerDamaged', {
          detail: {
            damage: effect.value,
            currentHp: this.stats.currentHp,
            maxHp: this.stats.maxHp,
            source: `buff:${effect.buffId}`
          }
        }));

        // 检查死亡
        if (this.stats.currentHp <= 0) {
          this.die();
        }
      } else if (effect.type === 'heal') {
        // HoT 治疗
        const oldHp = this.stats.currentHp;
        this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + effect.value);
        const actualHeal = this.stats.currentHp - oldHp;

        if (actualHeal > 0) {
          logger.debug(`💚 Buff治疗: ${effect.buffId} +${actualHeal} HP`);

          // 触发治疗事件
          document.dispatchEvent(new CustomEvent('playerHealed', {
            detail: {
              heal: actualHeal,
              currentHp: this.stats.currentHp,
              maxHp: this.stats.maxHp
            }
          }));
        }
      }
    }
  }

  /**
   * 获取当前激活的 Buff 列表
   * @returns {Array} 激活的 Buff 数组
   */
  getActiveBuffs() {
    return buffSystem.getActiveBuffs();
  }

  /**
   * 获取 Buff 系统的属性修正值
   * @param {string} statName - 属性名称（如 'attackMultiplier'）
   * @returns {number} 修正值
   */
  getBuffModifier(statName) {
    return buffSystem.getModifier(statName);
  }

  /**
   * 更新角色属性（每帧调用）
   * @param {number} deltaTime - 帧时间（秒）
   * @param {boolean} isSprinting - 是否在奔跑
   */
  updateStats(deltaTime, isSprinting) {
    if (this.isDead) return;

    const config = this.statsConfig;
    const stats = this.stats;

    // 1.更新饥饿度
    let hungerDecay = config.hungerDecayRate * deltaTime;
    if (isSprinting) {
      hungerDecay *= config.hungerSprintMultiplier;
    }
    stats.currentHunger = Math.max(0, stats.currentHunger - hungerDecay);

    // 2.根据饥饿状态更新HP
    if (stats.currentHunger >= config.wellFedThreshold) {
      // 饱食状态：缓慢恢复HP
      stats.currentHp = Math.min(
        stats.maxHp,
        stats.currentHp + config.hpRegenRate * deltaTime
      );
    } else if (stats.currentHunger <= config.hungryThreshold) {
      // 饥饿状态：缓慢损失HP
      stats.currentHp = Math.max(
        0,
        stats.currentHp - config.hpStarveRate * deltaTime
      );
    }

    // 3.检查死亡
    if (stats.currentHp <= 0) {
      this.die();
    }
  }

  /**
   * 检查是否在地面上（使用射线检测）
   */
  checkGrounded() {
    if (!this.mesh || !this.scene) return;

    // 从玩家脚底向下发射射线
    const rayOrigin = this.mesh.position.clone();
    const rayDirection = new Vector3(0, -1, 0);
    const rayLength = this.height * 0.6;

    // 创建射线
    const ray = new Ray(rayOrigin, rayDirection, rayLength);

    // 执行射线检测
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
      return mesh !== this.mesh && mesh.isPickable;
    });

    // 如果射线击中了地面
    if (pickInfo && pickInfo.hit && pickInfo.distance < rayLength) {
      this.isGrounded = true;
      this.groundMesh = pickInfo.pickedMesh;
    } else {
      this.isGrounded = false;
      this.groundMesh = null;
    }
  }

  /**
   * 处理移动
   * @param {number} deltaTime - 帧间隔时间
   */
  handleMovement(deltaTime) {
    if (!this.mesh || !this.physicsAggregate) return;

    const body = this.physicsAggregate.body;
    const config = this.movementConfig;

    // 1.获取输入
    const input = this.inputSystem.getMovementInput();
    const isMoving = input.x !== 0 || input.z !== 0;
    const isSprinting = this.inputSystem.isSprintPressed() && this.stats.currentStamina > 0 && isMoving;

    // 2.更新体力
    this.updateStamina(deltaTime, isSprinting);

    // 3.计算目标速度
    const targetSpeed = isSprinting ? config.sprintSpeed : config.walkSpeed;

    // 4.获取相机方向
    const camera = this.scene.activeCamera;
    const forward = camera.getForwardRay().direction;
    forward.y = 0;
    forward.normalize();

    const right = Vector3.Cross(forward, Vector3.Up());

    // 5.计算目标速度向量
    let targetVelocity;

    if (isMoving) {
      const moveDirection = forward.scale(input.z).subtract(right.scale(input.x));
      moveDirection.normalize();
      targetVelocity = moveDirection.scale(targetSpeed);
    } else {
      targetVelocity = Vector3.Zero();
    }

    // 6.根据是否在地面调整lerp值
    const currentHorizontalVel = new Vector3(
      this.currentVelocity.x,
      0,
      this.currentVelocity.z
    );

    let lerpFactor;
    if (this.isGrounded) {
      // 地面：正常控制
      lerpFactor = isMoving ? 0.85 : 0.90;
    } else {
      // 空中：控制力降低
      if (isMoving) {
        lerpFactor = 0.85 * config.airControlFactor;
      } else {
        lerpFactor = 0.02;
      }
    }

    const newHorizontalVel = Vector3.Lerp(
      currentHorizontalVel,
      targetVelocity,
      lerpFactor
    );

    // 7.保存当前速度
    this.currentVelocity.x = newHorizontalVel.x;
    this.currentVelocity.z = newHorizontalVel.z;

    // 8.应用到物理引擎
    const currentPhysicsVel = body.getLinearVelocity();
    body.setLinearVelocity(new Vector3(
      newHorizontalVel.x,
      currentPhysicsVel.y,
      newHorizontalVel.z
    ));
  }

  /**
   * 处理跳跃
   * @param {number} deltaTime - 帧时间
   */
  handleJump(deltaTime) {
    // 1.更新跳跃冷却
    if (this.jumpCooldownTimer > 0) {
      this.jumpCooldownTimer -= deltaTime;
    }

    // 2.检查是否可以跳跃
    if (this.inputSystem.isJumpPressed() &&
      this.isGrounded &&
      this.jumpCooldownTimer <= 0) {

      const body = this.physicsAggregate.body;
      const currentVelocity = body.getLinearVelocity();

      // 跳跃时保持水平速度
      body.setLinearVelocity(new Vector3(
        currentVelocity.x,
        this.movementConfig.jumpForce,
        currentVelocity.z
      ));

      // 设置状态
      this.isGrounded = false;

      // 启动冷却
      this.jumpCooldownTimer = this.movementConfig.jumpCooldown;

    }
  }

  /**
   * 更新体力
   * @param {number} deltaTime - 帧时间
   * @param {boolean} isSprinting - 是否在奔跑
   */
  updateStamina(deltaTime, isSprinting) {
    const config = this.movementConfig;
    const stats = this.stats;

    if (isSprinting) {
      // 奔跑消耗体力
      stats.currentStamina = Math.max(0, stats.currentStamina - config.sprintStaminaCost * deltaTime);
    } else {
      // 恢复体力
      stats.currentStamina = Math.min(stats.maxStamina, stats.currentStamina + config.staminaRegen * deltaTime);
    }
  }

  // ========== 伤害与治疗 ==========

  /**
   * 受到伤害
   * @param {number} rawDamage - 原始伤害
   * @param {string} source - 伤害来源
   * @returns {{actualDamage: number, isDead: boolean}}
   */
  takeDamage(rawDamage, source = 'unknown') {
    if (this.isDead) {
      return { actualDamage: 0, isDead: true };
    }

    // 获取防御力
    let defense = this.stats.baseDefense;
    if (this.equipmentSystem) {
      const effects = this.equipmentSystem.getCurrentEffects();
      defense += effects.defense || 0;
    }

    // 计算实际伤害（最少1点）
    const actualDamage = Math.max(1, rawDamage - defense);

    // 扣除HP
    this.stats.currentHp = Math.max(0, this.stats.currentHp - actualDamage);

    logger.info(`💔 玩家受到伤害`, {
      rawDamage,
      defense,
      actualDamage,
      remainingHp: this.stats.currentHp,
      source
    });

    // 触发受伤事件（用于UI反馈）
    document.dispatchEvent(new CustomEvent('playerDamaged', {
      detail:  {
        damage: actualDamage,
        currentHp: this.stats.currentHp,
        maxHp: this.stats.maxHp,
        source
      }
    }));

    // 检查死亡
    if (this.stats.currentHp <= 0) {
      this.die();
      return { actualDamage, isDead: true };
    }

    return { actualDamage, isDead: false };
  }

  /**
   * 治疗
   * @param {number} amount - 治疗量
   * @returns {number} 实际恢复量
   */
  heal(amount) {
    if (this.isDead) return 0;

    const oldHp = this.stats.currentHp;
    this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + amount);
    const actualHeal = this.stats.currentHp - oldHp;

    if (actualHeal > 0) {
      logger.info(`💚 玩家恢复HP:  +${actualHeal}`, {
        currentHp: this.stats.currentHp,
        maxHp: this.stats.maxHp
      });

      // 触发治疗事件
      document.dispatchEvent(new CustomEvent('playerHealed', {
        detail: {
          heal: actualHeal,
          currentHp: this.stats.currentHp,
          maxHp: this.stats.maxHp
        }
      }));
    }

    return actualHeal;
  }

  /**
   * 恢复饥饿度（吃食物）
   * @param {number} amount - 恢复量
   * @returns {number} 实际恢复量
   */
  eat(amount) {
    if (this.isDead) return 0;

    const oldHunger = this.stats.currentHunger;
    this.stats.currentHunger = Math.min(this.stats.maxHunger, this.stats.currentHunger + amount);
    const actualEat = this.stats.currentHunger - oldHunger;

    if (actualEat > 0) {
      logger.info(`🍖 玩家进食: +${actualEat} 饥饿度`, {
        currentHunger: this.stats.currentHunger,
        maxHunger: this.stats.maxHunger
      });

      // 触发进食事件
      document.dispatchEvent(new CustomEvent('playerAte', {
        detail: {
          amount: actualEat,
          currentHunger: this.stats.currentHunger,
          maxHunger: this.stats.maxHunger
        }
      }));
    }

    return actualEat;
  }

  // ========== 死亡与复活 ==========

  /**
   * 死亡处理
   */
  die() {
    if (this.isDead) return;

    this.isDead = true;
    logger.warn('💀 玩家死亡！');

    // 清除所有Buff
    buffSystem.clearAllBuffs();

    // 解锁鼠标（允许点击复活按钮）
    if (this.inputSystem) {
      this.inputSystem.unlockPointer();
    }

    // 掉落50%背包物品
    const inventory = this.getInventory();
    const slots = inventory.getBackpackSlots();
    let droppedCount = 0;

    for (let i = 0; i < slots.length; i++) {
      if (slots[i] && Math.random() < 0.5) {
        logger.debug(`掉落物品:  ${slots[i].itemId} x${slots[i].count}`);
        slots[i] = null;
        droppedCount++;
      }
    }

    logger.info(`📦 掉落了 ${droppedCount} 格物品`);

    // 触发死亡事件
    document.dispatchEvent(new CustomEvent('playerDied', {
      detail: {
        droppedItems: droppedCount,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * 复活
   */
  respawn() {
    this.isDead = false;

    // 重置属性（50%状态复活）
    this.stats.currentHp = this.stats.maxHp * 0.5;
    this.stats.currentHunger = this.stats.maxHunger * 0.5;
    this.stats.currentStamina = this.stats.maxStamina;

    // 传送到出生点
    if (this.spawnPoint && this.mesh) {
      this.mesh.position = this.spawnPoint.clone();

      // 重置物理速度
      if (this.physicsAggregate) {
        this.physicsAggregate.body.setLinearVelocity(Vector3.Zero());
      }
    }

    logger.info('🔄 玩家已复活', {
      hp: this.stats.currentHp,
      hunger: this.stats.currentHunger,
      position: this.spawnPoint?.asArray()
    });

    // 触发复活事件
    document.dispatchEvent(new CustomEvent('playerRespawned', {
      detail: {
        currentHp: this.stats.currentHp,
        currentHunger: this.stats.currentHunger
      }
    }));

    // 触发背包更新事件（因为可能掉落了物品）
    document.dispatchEvent(new CustomEvent('inventoryChanged', {
      detail: { source: 'respawn', timestamp: Date.now() }
    }));
  }

  // ========== 属性获取方法（用于UI） ==========

  /**
   * 获取玩家位置
   * @returns {Vector3}
   */
  getPosition() {
    return this.mesh ?  this.mesh.position : Vector3.Zero();
  }

  /**
   * 获取玩家网格
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh | null}
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * 获取玩家前方的方向向量
   * @returns {Vector3}
   */
  getForwardDirection() {
    const camera = this.scene.activeCamera;
    const forward = camera.getForwardRay().direction;
    forward.normalize();
    return forward;
  }

  /**
   * 获取玩家视线起点位置（眼睛位置）
   * @returns {Vector3}
   */
  getEyePosition() {
    const pos = this.mesh.position.clone();
    pos.y += this.height * 0.4;
    return pos;
  }

  /**
   * 获取背包
   * @returns {Inventory}
   */
  getInventory() {
    return this.inventory;
  }

  /**
   * 获取当前HP
   * @returns {number}
   */
  getHp() {
    return this.stats.currentHp;
  }

  /**
   * 获取最大HP
   * @returns {number}
   */
  getMaxHp() {
    return this.stats.maxHp;
  }

  /**
   * 获取HP百分比
   * @returns {number} 0-100
   */
  getHpPercent() {
    return (this.stats.currentHp / this.stats.maxHp) * 100;
  }

  /**
   * 获取当前体力
   * @returns {number}
   */
  getStamina() {
    return this.stats.currentStamina;
  }

  /**
   * 获取最大体力
   * @returns {number}
   */
  getMaxStamina() {
    return this.stats.maxStamina;
  }

  /**
   * 获取体力百分比
   * @returns {number} 0-100
   */
  getStaminaPercent() {
    return (this.stats.currentStamina / this.stats.maxStamina) * 100;
  }

  /**
   * 获取当前饥饿度
   * @returns {number}
   */
  getHunger() {
    return this.stats.currentHunger;
  }

  /**
   * 获取最大饥饿度
   * @returns {number}
   */
  getMaxHunger() {
    return this.stats.maxHunger;
  }

  /**
   * 获取饥饿度百分比
   * @returns {number} 0-100
   */
  getHungerPercent() {
    return (this.stats.currentHunger / this.stats.maxHunger) * 100;
  }

  /**
   * 获取饥饿状态
   * @returns {'well-fed' | 'normal' | 'hungry' | 'starving'}
   */
  getHungerStatus() {
    const hunger = this.stats.currentHunger;
    const config = this.statsConfig;

    if (hunger >= config.wellFedThreshold) return 'well-fed';
    if (hunger > config.hungryThreshold) return 'normal';
    if (hunger > 0) return 'hungry';
    return 'starving';
  }

  /**
   * 获取完整属性状态（用于UI）
   * @returns {Object}
   */
  getStatsForUI() {
    return {
      hp: {
        current: Math.floor(this.stats.currentHp),
        max: this.stats.maxHp,
        percent: this.getHpPercent()
      },
      stamina: {
        current: Math.floor(this.stats.currentStamina),
        max: this.stats.maxStamina,
        percent: this.getStaminaPercent()
      },
      hunger: {
        current: Math.floor(this.stats.currentHunger),
        max: this.stats.maxHunger,
        percent: this.getHungerPercent(),
        status: this.getHungerStatus()
      },
      isDead: this.isDead
    };
  }

  /**
   * 检查玩家是否死亡
   * @returns {boolean}
   */
  getIsDead() {
    return this.isDead;
  }

  /**
   * 获取总攻击力（基础 + 装备）
   * @returns {number}
   */
  getTotalAttack() {
    let attack = this.stats.baseAttack;
    if (this.equipmentSystem) {
      const effects = this.equipmentSystem.getCurrentEffects();
      attack += effects.damage || 0;
    }
    return attack;
  }

  /**
   * 获取总防御力（基础 + 装备）
   * @returns {number}
   */
  getTotalDefense() {
    let defense = this.stats.baseDefense;
    if (this.equipmentSystem) {
      const effects = this.equipmentSystem.getCurrentEffects();
      defense += effects.defense || 0;
    }
    return defense;
  }

  // ========== 销毁 ==========

  /**
   * 销毁玩家
   */
  dispose() {
    if (this.physicsAggregate) {
      this.physicsAggregate.dispose();
    }
    if (this.mesh) {
      this.mesh.dispose();
    }
    logger.info('玩家已销毁');
  }
}